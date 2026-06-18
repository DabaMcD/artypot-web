import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // English is the default and renders WITHOUT a URL prefix (`/dashboard`).
  // Every other locale is prefixed (`/es/dashboard`). `en-x-brainrot` is a
  // BCP-47 private-use tag — Intl + <html lang> resolve its base (`en`), so
  // number/date formatting stays correct English while the copy goes feral.
  locales: ['en', 'es', 'eo', 'en-x-brainrot'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];

// Locale-aware navigation. Import these EVERYWHERE instead of `next/link` /
// `next/navigation` so `usePathname()` stays unprefixed and the path-based
// role inference, auth gate, and hash anchors keep working.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
