import { readStorage, writeStorage } from './storage';

const KEY = 'projectflow.afterVerify';

const safe = (path: string | null): path is string => !!path && path.startsWith('/') && !path.startsWith('//');

/**
 * Where to go after confirming the email address, when sign-up started somewhere specific (paying
 * for a plan). The confirmation link opens in a new tab, so the page that sent it can't pass this on.
 */
export function rememberAfterVerify(path: string): void {
  if (safe(path)) writeStorage(KEY, path);
}

/** The remembered path, or the fallback. */
export function afterVerifyPath(fallback: string): string {
  const path = readStorage(KEY);
  return safe(path) ? path : fallback;
}

/** Once it has been used. */
export function forgetAfterVerify(): void {
  writeStorage(KEY, null);
}
