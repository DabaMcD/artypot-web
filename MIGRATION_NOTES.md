# i18n Migration Notes (next-intl)

Status of the internationalization migration. The **infrastructure and the
language-recording feature are complete and validated**; string/format translation
is a top-down, in-progress sweep. The English-fallback layer (deepmerge in
`src/i18n/request.ts`) means any not-yet-translated key renders in English rather
than breaking the page.

## Locales

| Locale | Code | Status |
|---|---|---|
| English | `en` | Default, source of truth |
| Spanish | `es` | Machine-quality (needs native/translator review) |
| Esperanto | `eo` | Machine-quality (needs review) |
| 🧠 Brainrot 🥀 | `en-x-brainrot` | Per `artypot-brainrot-translation-spec`; intentionally feral |

`en-x-brainrot` is a BCP-47 private-use tag → `<html lang>` valid and Intl
number/date formatting resolves to the `en` base (correct). Add a locale in BOTH
`src/i18n/routing.ts` and `config/locales.php` (artypot-api), plus a label in
`LanguageSwitcher.tsx`.

## Done

- **Infra**: `src/i18n/{routing,request}.ts`, `next.config.ts` plugin, composed
  locale-aware `src/middleware.ts` (admin/obelisk guard preserved + locale-stripped;
  `/marriage-autonomy-spectrum` route handler excluded from the matcher).
- **Route tree** moved under `src/app/[locale]/`; root `layout.tsx` is a passthrough,
  real shell + `<NextIntlClientProvider>` in `[locale]/layout.tsx`; global
  `not-found.tsx` self-contained, localized `[locale]/not-found.tsx`.
- **Navigation imports** swapped to `@/i18n/routing` project-wide (`usePathname`
  stays unprefixed → role inference / auth gate / hash anchors intact).
- **LanguageSwitcher** (`src/components/LanguageSwitcher.tsx`): public header +
  fixed corner on auth pages (login/register) + `/settings#language` section.
- **Backend** (artypot-api): `preferred_locale` column (migration
  `2026_06_18_000000_add_preferred_locale_to_users.php`), `config/locales.php`,
  validated on register + `PATCH /users/{id}`, returned by `/auth/me`; locale codes
  reserved in `CreatorSlug::RESERVED`. Tests in `RegisterTest` + `User/PreferredLocaleTest`.
- **Persistence**: register saves the active locale; login/OAuth/session-restore
  honor a stored `preferred_locale` as a one-shot redirect (`src/lib/preferred-locale.ts`).
- **Chrome translated** (all 4 locales): `Sidebar`, `PublicHeader`, `PublicFooter`.
- **Formatter helper** ready: `src/lib/format.ts` (`useMoney`, `useDateFormats`).

## Deferred — string migration (next pass, top-down)

Components/pages still rendering hardcoded English (fall back gracefully):

- **Auth page bodies** — `login`/`register`/`forgot-password`/`reset-password` form
  labels, OAuth provider labels (only the switcher is placed so far).
- **Settings body** — every section except the new Language section's header/blurb,
  which is hardcoded English pending this pass.
- **User-facing pages** — `dashboard`, `bounties` (list + detail), public profile
  (`[slug]`), `billing`, `history`, `search`, `become-creator`.
- **Marketing/legal** — `/`, `about`, `tos`, `privacy`, `support`, `for-creators`,
  `creator-tos`.
- **AppShell authed chrome** — header search placeholder + banner copy
  (`EmailVerificationBanner`, `NudgeBar`, `FanMarketBanner`, `PaymentAuthBanner`,
  `PaymentGraceBanner`, `DefaultUpdatePromptBar`).
- **admin/\*** and **obelisk/\*** — intentionally deferred (internal). The council
  sidebar labels exist as keys in `en.json` only, so they fall back to English in
  non-en locales.

## Deferred — number/currency/date formatting (Phase 9)

Helper exists (`src/lib/format.ts`) but the **~120 `toLocaleString` /
`toLocaleDateString` call-sites across ~61 files are NOT yet migrated**. Notably
`BalancePipeline` (`ui/Pipeline.tsx`) still hardcodes `'en-US'`, and
`nextBillingInfo()` (`lib/config.ts`) formats inline. Migrate user-facing first;
defer admin/obelisk. Currency stays USD (display-only localization).
Note: `eo` has minimal CLDR data → falls back to English-ish formatting.

## Other follow-ups

- **Skipped string classes**: `catch`-block error strings, backend-driven validation
  messages, tooltip/hover dates — own pipeline later.
- **Pluralization**: none migrated yet. Use ICU `{count, plural, one {# …} other {# …}}`
  when migrating count strings.
- **Translation review**: es/eo are machine-quality; product-term choices need a
  native pass — bounty→`encargo`(es)/`mendo`(eo), backing→`aporte`/`subteno`,
  creator→`creador`/`kreanto`.
- **Middleware → proxy**: Next 16 deprecates the `middleware.ts` convention in favor
  of `proxy.ts`. Pre-existing; left as `middleware.ts` (works). Rename when convenient.
- **DB**: run `php artisan migrate` on dev/prod to apply the `preferred_locale` column.

## Design spec §9 — anti-patterns

All respected. Lowercase Kalam headings, mono-uppercase `SectionLabel`s, role
inference stays path-based (works across locales), `font-mono tabular-nums` for
numbers. None bent.
