import { routing, type Locale } from '@/i18n/routing';

/**
 * The locale to switch to for a freshly-authenticated user, or `undefined` when
 * no switch is needed.
 *
 * Returns a value only when the user's stored `preferred_locale` is a supported
 * locale AND differs from the one currently active. The equality guard makes
 * honoring a preference a one-shot: after the switch, current === preferred, so
 * it never fires again (no redirect loop, even if the user later changes their
 * language from settings — that updates the stored preference to match).
 */
export function pickPreferredLocale(
  user: { preferred_locale?: string | null } | null | undefined,
  current: string,
): Locale | undefined {
  const pref = user?.preferred_locale;
  if (pref && pref !== current && (routing.locales as readonly string[]).includes(pref)) {
    return pref as Locale;
  }
  return undefined;
}
