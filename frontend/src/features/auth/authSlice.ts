import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/api/types';
import { STORAGE_KEYS } from '@/config';
import { readSession, readStorage, writeSession, writeStorage } from '@/lib/storage';

export interface AuthState {
  token: string | null;
  user: User | null;
  /** True once the stored token has been validated against /auth/me (or there was none). */
  initialized: boolean;
  /** Set when the API rejected the token so the login page can explain why. */
  sessionExpired: boolean;
}

/**
 * "Keep me signed in" keeps the session in localStorage (it survives closing the browser);
 * otherwise it lives in sessionStorage: only this tab, until it is closed.
 */
const remembered = readStorage(STORAGE_KEYS.token);
const storedToken = remembered ?? readSession(STORAGE_KEYS.token);
const read = remembered ? readStorage : readSession;

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persist(token: string | null, user: User | null, remember: boolean) {
  const [keep, drop] = remember ? [writeStorage, writeSession] : [writeSession, writeStorage];
  keep(STORAGE_KEYS.token, token);
  keep(STORAGE_KEYS.user, user ? JSON.stringify(user) : null);
  drop(STORAGE_KEYS.token, null);
  drop(STORAGE_KEYS.user, null);
}

function clearAll() {
  for (const write of [writeStorage, writeSession]) {
    write(STORAGE_KEYS.token, null);
    write(STORAGE_KEYS.user, null);
  }
}

const initialState: AuthState = {
  token: storedToken,
  user: storedToken ? parseUser(read(STORAGE_KEYS.user)) : null,
  initialized: !storedToken,
  sessionExpired: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ token: string; user: User; remember?: boolean }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.initialized = true;
      state.sessionExpired = false;
      persist(action.payload.token, action.payload.user, action.payload.remember ?? true);
    },
    /** A new token for the same session (after a password change), kept where the old one was. */
    tokenRefreshed(state, action: PayloadAction<{ token: string; user: User }>) {
      const remembered = readStorage(STORAGE_KEYS.token) !== null || readSession(STORAGE_KEYS.token) === null;
      state.token = action.payload.token;
      state.user = action.payload.user;
      persist(action.payload.token, action.payload.user, remembered);
    },
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.initialized = true;
      // Keep the profile wherever the session is kept.
      if (readStorage(STORAGE_KEYS.token) !== null) writeStorage(STORAGE_KEYS.user, JSON.stringify(action.payload));
      else if (readSession(STORAGE_KEYS.token) !== null) writeSession(STORAGE_KEYS.user, JSON.stringify(action.payload));
    },
    loggedOut(state) {
      state.token = null;
      state.user = null;
      state.initialized = true;
      state.sessionExpired = false;
      clearAll();
    },
    sessionExpired(state) {
      const hadSession = state.token !== null;
      state.token = null;
      state.user = null;
      state.initialized = true;
      state.sessionExpired = hadSession;
      clearAll();
    },
  },
});

export const { credentialsReceived, tokenRefreshed, userUpdated, loggedOut, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
