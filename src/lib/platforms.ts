/**
 * Frontend mirror of the backend's config/platforms.php catalogue.
 *
 * SOURCE OF TRUTH for backend platforms is config/platforms.php in the API.
 * This file is a hand-maintained TypeScript mirror. When you add a platform
 * to the backend catalogue, add a matching entry here in the same PR.
 *
 * Why a static mirror (rather than fetching from an API)?
 *   - Works at SSR / build time with no network round-trip
 *   - Type-safe — adding LinkedIn here flows into every consumer's IntelliSense
 *   - ~20 stable entries; the latency of a /platforms endpoint isn't worth it
 *
 * The special `OTHER_SLUG` represents "any URL not in the curated catalogue".
 * Creators paste a full URL; we store the canonical form.
 */

import type { HandlePlatform } from './types';

interface PlatformConfig {
  /** Human-readable label shown in dropdowns and badges. */
  label: string;
  /** Visual prefix shown next to the handle input ('@', 'twitch.tv/', ''). */
  prefix: string;
  /** Profile URL template, with `{username}` interpolated at use time. */
  urlTemplate: string;
  /** Whether handles on this platform can be auto-verified via OAuth. */
  oauth: boolean;
  /**
   * OAuth *provider* slug to route verification through when it differs from
   * the platform slug. Only YouTube uses this (verified via 'google'). When
   * omitted, the provider equals the platform slug.
   */
  oauthProvider?: string;
  /**
   * Optional `intent` hint passed to the backend redirect endpoint so it can
   * request platform-specific scopes (e.g. 'verify_youtube' → youtube.readonly).
   */
  oauthIntent?: string;
}

export const OTHER_SLUG = 'other';

/** Curated platforms — keys mirror config/platforms.php exactly. */
export const PLATFORM_CATALOGUE: Record<string, PlatformConfig> = {
  twitter: {
    label:       'X / Twitter',
    prefix:      '@',
    urlTemplate: 'https://x.com/{username}',
    oauth:       true,
  },
  youtube: {
    label:        'YouTube',
    prefix:       '@',
    urlTemplate:  'https://youtube.com/@{username}',
    oauth:        true,
    // YouTube has no standalone OAuth provider — verified by signing in with
    // Google and reading the user's channel via the YouTube Data API.
    oauthProvider: 'google',
    oauthIntent:   'verify_youtube',
  },
  instagram: {
    label:       'Instagram',
    prefix:      '@',
    urlTemplate: 'https://instagram.com/{username}',
    oauth:       true,
  },
  tiktok: {
    label:       'TikTok',
    prefix:      '@',
    urlTemplate: 'https://tiktok.com/@{username}',
    oauth:       true,
  },
  twitch: {
    label:       'Twitch',
    prefix:      'twitch.tv/',
    urlTemplate: 'https://twitch.tv/{username}',
    oauth:       true,
  },
  bluesky: {
    label:       'Bluesky',
    prefix:      '@',
    urlTemplate: 'https://bsky.app/profile/{username}',
    oauth:       false,
  },
  kick: {
    label:       'Kick',
    prefix:      'kick.com/',
    urlTemplate: 'https://kick.com/{username}',
    oauth:       true,
  },
};

/** Every curated slug (no 'other'). */
export const CURATED_PLATFORMS: HandlePlatform[] = Object.keys(PLATFORM_CATALOGUE);

/** Curated slugs plus the 'other' catch-all. */
export const ALL_PLATFORMS: HandlePlatform[] = [...CURATED_PLATFORMS, OTHER_SLUG];

/** Slugs that support OAuth-based instant verification (per the platform catalogue). */
export const OAUTH_PLATFORMS: HandlePlatform[] = CURATED_PLATFORMS.filter(
  (slug) => PLATFORM_CATALOGUE[slug].oauth,
);

/**
 * The OAuth *provider* slug used to verify a handle on this platform. Usually
 * identical to the platform slug (tiktok → tiktok); YouTube is verified through
 * Google, so youtube → google. Mirrors Platforms::oauthProvider() on the backend.
 */
export function platformOAuthProvider(slug: string): string {
  return PLATFORM_CATALOGUE[slug]?.oauthProvider ?? slug;
}

/** Optional OAuth `intent` hint for a platform (e.g. 'verify_youtube'), if any. */
export function platformOAuthIntent(slug: string): string | undefined {
  return PLATFORM_CATALOGUE[slug]?.oauthIntent;
}

/**
 * The subset of OAUTH_PLATFORMS that are enabled on this deployment.
 *
 * Gated by NEXT_PUBLIC_OAUTH_PROVIDERS — the same env var that controls which
 * buttons appear on /login and /register. When unset, all OAuth-capable
 * platforms are available. When set, only platforms whose slug appears in the
 * comma-separated list are offered for OAuth handle verification.
 *
 * Use this (not OAUTH_PLATFORMS) anywhere you want to show an "instant verify
 * via OAuth" button so the setting stays in sync with the login page buttons.
 */
const _oauthEnabledSet: Set<string> | null = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
  ? new Set(
      process.env.NEXT_PUBLIC_OAUTH_PROVIDERS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

// Gate by the resolved OAuth *provider*, not the platform slug — YouTube
// verifies through 'google', so it's enabled when Google login is enabled.
export const ENABLED_OAUTH_PLATFORMS: HandlePlatform[] = _oauthEnabledSet
  ? OAUTH_PLATFORMS.filter((slug) => _oauthEnabledSet.has(platformOAuthProvider(slug)))
  : OAUTH_PLATFORMS;

/** Set form for fast routing checks (used by /{platform}/{handle} page). */
export const KNOWN_PLATFORMS = new Set<string>(CURATED_PLATFORMS);

/** Human-readable label for any slug (curated or 'other' or even unknown). */
export function platformLabel(slug: string): string {
  if (slug === OTHER_SLUG) return 'Other';
  return PLATFORM_CATALOGUE[slug]?.label ?? slug;
}

/** Input prefix for a curated platform; empty string for 'other' / unknown. */
export function platformPrefix(slug: string): string {
  if (slug === OTHER_SLUG) return '';
  return PLATFORM_CATALOGUE[slug]?.prefix ?? '';
}

/**
 * Build a canonical profile URL for a handle.
 *
 * - Curated platform: interpolates {username} into the URL template.
 * - 'other' platform: the username is already canonical 'host/path'; just
 *   prepend https://.
 * - Unknown slug: returns the bare username (caller's responsibility to handle).
 */
export function platformProfileUrl(slug: string, username: string): string {
  if (slug === OTHER_SLUG) {
    return `https://${username.replace(/^\/+/, '')}`;
  }
  const template = PLATFORM_CATALOGUE[slug]?.urlTemplate;
  if (!template) return username;
  return template.replace('{username}', username);
}

/**
 * Resolve where a handle's name should link.
 *
 * Curated platforms have a clean single-segment username and a first-party
 * unverified-handle page at /{platform}/{username} (see app/[slug]/[handle]).
 *
 * The 'other' platform stores a full URL as its "username"
 * (e.g. `wikipedia.org/wiki/Brad_Pitt`). That has no internal page and can't be
 * a path segment — naïvely building `/other/{username}` produces a multi-segment
 * 404 (`/other/wikipedia.org/wiki/Brad_Pitt`). So 'other' links straight out to
 * the canonical website instead. The `username.includes('/')` guard is
 * defence-in-depth: any username that isn't a clean slug links out too.
 */
export function handleLink(
  slug: string,
  username: string,
  id?: number | null,
): { href: string; external: boolean } {
  const isCurated = slug !== OTHER_SLUG && KNOWN_PLATFORMS.has(slug);
  if (isCurated && !username.includes('/')) {
    return { href: `/${slug}/${username}`, external: false };
  }
  // 'other' (and any handle whose username can't be a clean path segment) has
  // no pretty URL — route to its internal id-keyed page when we know the id.
  // Without an id we fall back to the external site (legacy behaviour).
  if (id != null) {
    return { href: `/h/${id}`, external: false };
  }
  return { href: platformProfileUrl(slug, username), external: true };
}

/**
 * The canonical *external* URL for a handle (the real third-party profile),
 * regardless of whether the handle also has an internal page. Used for the
 * "visit ↗" affordance next to a handle that now links to its internal page.
 */
export function handleExternalUrl(slug: string, username: string): string {
  return platformProfileUrl(slug, username);
}

/**
 * Format a handle for display — `@username`, `twitch.tv/streamer`, or the
 * canonical URL for 'other'. Mirrors `Platforms::label() + Platforms::prefix()`
 * on the backend.
 */
export function formatPlatformHandle(slug: string, username: string): string {
  if (slug === OTHER_SLUG) return username;
  const prefix = platformPrefix(slug);
  // Username may already include a leading '@'; strip it so we don't double up.
  const bare = username.replace(/^@+/, '');
  return `${prefix}${bare}`;
}

/**
 * The bare username with no platform prefix — `mrbeast`, `pokimane`. Use this
 * where the platform is already named alongside (e.g. the BountyCard's
 * `youtube/mrbeast` composite) so the prefix isn't doubled up into
 * `youtube/@mrbeast` / `twitch/twitch.tv/pokimane`. Also strips a leaked
 * URL-style prefix (`twitch.tv/`, `kick.com/`) or leading slashes, so handles
 * stored before input-normalisation still render clean (no back migration).
 */
export function bareUsername(slug: string, username: string): string {
  if (slug === OTHER_SLUG) return username;
  let u = username.trim().replace(/^@+/, '');
  const prefix = platformPrefix(slug);
  // For host-style prefixes ('twitch.tv/', 'kick.com/'), strip a leaked copy.
  if (prefix && prefix !== '@' && u.toLowerCase().startsWith(prefix.toLowerCase())) {
    u = u.slice(prefix.length);
  }
  return u.replace(/^\/+/, '');
}

/**
 * Canonicalise a free-form URL for the 'other' platform — matches the
 * backend's Platforms::canonicaliseUrl() byte-for-byte.
 *
 *   https://www.LinkedIn.com/in/ZachKing/?ref=foo#bar
 *     → linkedin.com/in/ZachKing
 *
 * Throws if the input doesn't parse as an http(s) URL.
 */
export function canonicaliseUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error('Not a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http or https.');
  }

  let host = parsed.host.toLowerCase();
  if (host.startsWith('www.')) host = host.slice(4);

  // Preserve path case (GitHub repos are case-sensitive); strip trailing slashes.
  const path = parsed.pathname.replace(/\/+$/, '');

  return `${host}${path}`;
}

/** Validate that a string would be a valid 'other' URL when submitted. */
export function isValidOtherUrl(input: string): boolean {
  try {
    canonicaliseUrl(input);
    return true;
  } catch {
    return false;
  }
}
