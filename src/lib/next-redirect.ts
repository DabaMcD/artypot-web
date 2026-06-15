/**
 * Helpers for the post-auth `?next=` redirect.
 *
 * `next` lets us send a user back to wherever they were (e.g. a bounty page)
 * after they log in or sign up, instead of always dumping them on /dashboard.
 *
 * Because the value ultimately drives a client-side navigation, it is an
 * open-redirect vector: an attacker could craft `/login?next=https://evil.com`
 * (phishing) or `//evil.com` (protocol-relative). Everything here funnels
 * through `sanitizeNext`, which only ever returns a same-origin *path*.
 */

/** sessionStorage key used to carry `next` across the OAuth provider round-trip. */
export const OAUTH_NEXT_KEY = 'oauth_next';

/**
 * sessionStorage key marking an in-progress handle-verification OAuth flow.
 * Its presence tells the callback page "this round-trip was a handle verify,
 * not a login"; its value is the handle being verified (for the result message).
 */
export const OAUTH_VERIFY_KEY = 'oauth_handle_verify';

/**
 * sessionStorage key the callback page writes the verification outcome into, for
 * the page that started the flow to read on return and surface as a toast.
 * Shape: JSON `{ handle: string, result: 'verified'|'not_found'|'failed'|'error' }`.
 */
export const OAUTH_VERIFY_RESULT_KEY = 'oauth_handle_verify_result';

/** Where users land after auth when no (valid) `next` was supplied. */
export const DEFAULT_POST_AUTH = '/dashboard';

/**
 * Returns a safe, same-origin redirect path, or null if the input can't be
 * trusted. Only relative paths beginning with a single `/` are allowed —
 * never absolute URLs, protocol-relative `//host`, or backslash variants that
 * browsers normalize into `//`.
 */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding — fall back to the raw value and let the
    // checks below reject anything suspicious.
  }

  // Must be an absolute path on our own origin.
  if (!value.startsWith('/')) return null;
  // Reject protocol-relative ("//evil.com") and backslash tricks ("/\evil.com")
  // that browsers treat as a new host.
  if (value.startsWith('//')) return null;
  if (value.includes('\\')) return null;
  // Reject control chars that a browser might strip or collapse into the above.
  if (/[\x00-\x1f\x7f]/.test(value)) return null;

  return value;
}

/** Sanitized `next`, or the default post-auth destination. */
export function nextTarget(raw: string | null | undefined, fallback: string = DEFAULT_POST_AUTH): string {
  return sanitizeNext(raw) ?? fallback;
}

/** Reads and sanitizes the `next` query param from the current URL (client only). */
export function readNextFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return sanitizeNext(new URLSearchParams(window.location.search).get('next'));
}

/**
 * Appends the current `next` to an internal auth path so it survives
 * navigation between /login and /register. e.g. given a current URL of
 * `/login?next=/bounties/5`, `withNext('/register')` → `/register?next=%2Fbounties%2F5`.
 */
export function withNext(path: string): string {
  const next = readNextFromLocation();
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}
