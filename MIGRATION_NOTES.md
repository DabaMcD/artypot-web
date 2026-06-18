# i18n Migration Notes (next-intl)

Internationalization is **substantially complete** across the web app and the
Laravel API. Locales: `en` (default, source of truth), `es`, `eo`,
`en-x-brainrot` (🧠 Brainrot 🥀). The English-fallback layer (deepmerge in
`src/i18n/request.ts`) means any not-yet-translated key renders in English.

## URL strategy
`localePrefix: 'as-needed'` (chosen with the user): clean default URLs; `/`
auto-detects + redirects first-time visitors to their device language; users
force a language via the flag switcher (sets `NEXT_LOCALE`); logged-in users'
saved `preferred_locale` is honored as a one-shot redirect on login. Add a locale
in BOTH `src/i18n/routing.ts` and `config/locales.php` (api), plus a flag +
endonym in `LanguageSwitcher.tsx`.

## Web — done
- **Infra**: `src/i18n/*`, `src/proxy.ts` (Next 16 proxy; composed locale-aware
  admin/obelisk guard), route tree under `[locale]`, `NextIntlClientProvider`.
- **LanguageSwitcher**: flag button → dropdown (flag + endonym), in public header,
  auth-page corner, and `/settings`.
- **Persistence**: register saves locale; login/OAuth/session-restore honor it.
- **Chrome**: Sidebar, PublicHeader, PublicFooter.
- **Pages (4 locales)**: Home, About, ForCreators, Support, Dashboard, Login,
  Register, Forgot/Reset, BecomeCreator, Settings, Tos, Privacy, CreatorTos,
  Bounties (list + detail), PublicProfile, Backings, Billing, History, Search,
  all `/c/*` creator pages, user/creator profiles.
- **Banners + authed header**: the 6 AppShell banners + search placeholder.
- **19 shared components**: handles, comments, payment/card widgets, slug inputs,
  creator money cards, BalancePipeline, charts, search, etc.
- **Formatters**: `src/lib/format.ts` (`useMoney`/`useDateFormats`); BalancePipeline
  + per-page/component money/date calls migrated. (Final tail in progress.)

## Backend (artypot-api) — done
- `preferred_locale` column + endpoints + tests; reserved in `CreatorSlug`.
- Email localization: `HasLocalePreference` on User + `SetsRecipientLocale` trait
  (hooks `send()` + `render()`) on all 37 user-facing mailables; localized layout.
- **All 37 user-facing transactional emails** translated in 4 locales
  (`lang/{locale}/emails.php`). The 7 `*AdminAlert*` emails stay English (internal).
- `EmailLocalizationTest` + full suite (1168 tests) pass.

## Remaining
- **Formatter tail (in progress / minor)**: a few USD-amount formatters left in
  `en` because they're hook-incompatible (server/edge): `bounties/[id]`
  `opengraph-image.tsx`, `layout.tsx` (generateMetadata), and the module-scope
  `formatUsd` in `bounties/[id]/page.tsx`. USD amounts in en money format are
  acceptable on a USD platform; revisit with explicit-locale `Intl` if needed.
- **`admin/*` + `obelisk/*`** (~35 council/overlord pages) — intentionally NOT
  translated. Internal staff tooling; sidebar nav labels fall back to English in
  non-en locales. Pending a decision on whether to localize the back office.
- **Translation review**: es/eo are machine-quality; product terms
  (bounty→`encargo`/`mendo`, backing→`aporte`/`subteno`) want a native pass.
- **Pluralization**: count strings mostly use a singular/plural key pair chosen in
  code; migrate to ICU `{count, plural, …}` where richer rules are needed.
- **BountyDetail**: `formatUsd`/`ShareButton` external-share copy intentionally left
  English (module scope).

## Design spec §9 — respected
Lowercase Kalam headings, mono-uppercase `SectionLabel`s, path-based role
inference (works across locales), `font-mono tabular-nums` for numbers.
