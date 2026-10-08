import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { API_BASE_URL, MOCK_LATENCY_MS, STORAGE_KEYS, USE_MOCK_API } from '@/config';
import { newIdempotencyKey, retryDelay, timeoutFor, withHeader } from '@/lib/requestPolicy';
import { readSession, readStorage } from '@/lib/storage';
import { sessionExpired, tokenRefreshed } from '@/features/auth/authSlice';
import type { ApiResponse, User } from './types';

interface StateWithAuth {
  auth: { token: string | null };
}

const httpBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAuth).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    return headers;
  },
});

function toQueryString(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Routes requests to the in-browser mock API (src/mock) instead of the network. */
const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api) => {
  const a: FetchArgs = typeof args === 'string' ? { url: args } : args;
  const { handleMockRequest } = await import('@/mock/server');
  const [min, max] = MOCK_LATENCY_MS;
  await sleep(min + Math.random() * (max - min));
  const token = (api.getState() as StateWithAuth).auth.token;
  const res = await handleMockRequest({
    method: a.method ?? 'GET',
    url: `${a.url}${toQueryString(a.params)}`,
    body: a.body,
    token,
  });
  if (res.status >= 400) return { error: { status: res.status, data: res.body } };
  return { data: res.body };
};

const PUBLIC_ENDPOINTS = new Set(['login', 'register']);

/**
 * Every request: a timeout (longer for uploads and AI), an Idempotency-Key on every change (so a
 * retry or a double click can't do it twice), and up to two retries with growing waits when the
 * connection drops, the request times out, the server is busy or rate-limits (see requestPolicy).
 */
const resilientQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  let a: FetchArgs = typeof args === 'string' ? { url: args } : { ...args };
  const method = (a.method ?? 'GET').toUpperCase();
  const write = method !== 'GET' && method !== 'HEAD';
  if (write) a = { ...a, headers: withHeader(a.headers as Record<string, string> | undefined, 'Idempotency-Key', newIdempotencyKey()) };
  a.timeout ??= timeoutFor(a.url, a.body);
  for (let attempt = 0; ; attempt++) {
    const result = USE_MOCK_API ? await mockBaseQuery(a, api, extra) : await httpBaseQuery(a, api, extra);
    if (!result.error) return result;
    const retryAfter = Number((result.meta as { response?: Response } | undefined)?.response?.headers.get('Retry-After') ?? '') || null;
    const wait = retryDelay({ status: result.error.status, method, url: a.url, attempt, hasIdempotencyKey: write, retryAfter });
    if (wait === null || api.signal.aborted) return result;
    await sleep(wait);
  }
};

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const usedToken = (api.getState() as StateWithAuth).auth.token;
  const result = await resilientQuery(args, api, extra);
  if (result.error?.status === 401 && !PUBLIC_ENDPOINTS.has(api.endpoint)) {
    // Another tab may have signed in again or changed the password (which ends older sessions):
    // then adopt its newer session instead of wiping it.
    const stored = readStorage(STORAGE_KEYS.token) ?? readSession(STORAGE_KEYS.token);
    const storedUser = readStorage(STORAGE_KEYS.user) ?? readSession(STORAGE_KEYS.user);
    if (stored && stored !== usedToken && storedUser) {
      try {
        api.dispatch(tokenRefreshed({ token: stored, user: JSON.parse(storedUser) as User }));
        return result;
      } catch {
        /* unreadable profile: treat as expired */
      }
    }
    api.dispatch(sessionExpired());
  }
  return result;
};

export const TAGS = [
  'Me',
  'Dashboard',
  'Project',
  'ProjectList',
  'Member',
  'Invitation',
  'MyInvitation',
  'Milestone',
  'Task',
  'TaskList',
  'Comment',
  'Submission',
  'Activity',
  'Notification',
  'Analytics',
  'Calendar',
  'Dependency',
  'AiStatus',
  'SiteHealth',
  'Arena',
  'Billing',
  'AdminPayments',
] as const;

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: TAGS,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});

/** Unwrap the `{ success, data }` envelope. */
export function unwrap<T>(response: ApiResponse<T>): T {
  return response.data;
}
