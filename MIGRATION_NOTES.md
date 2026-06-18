# i18n Migration Notes (next-intl)

Status of internationalization. The **infrastructure, the language-recording
feature, the chrome, and the main public/app page bodies are done and validated**
(build green, 271 pages generated). The English-fallback layer (deepmerge in
`src/i18n/request.ts`) means any not-yet-translated key renders in English.

## Locales & URL strategy

| Locale | Code | Status |
|---|---|---|
| English | `en` | Default, source of truth |
| Spanish | `es` | Machine-quality (native review recommended) |
| Esperanto | `eo` | Machine-quality (review recommended) |
| 🧠 Brainrot 🥀 | `en-x-brainrot` | Per `artypot-brainrot-translation-spec`; intentionally feral |

`localePrefix: 'as-needed'` (decided with the user): clean default URLs;
`/` auto-detects + redirects first-time visitors to their device language
(e.g. `/es` in Mexico); English lives at `/` (no literal `/en/`); users force a
language via the switcher (sets the `NEXT_LOCALE` cookie). Logged-in users' saved
`preferred_locale` is honored as a one-shot redirect on login/session-restore.
Add a locale in BOTH `src/i18n/routing.ts` and `config/locales.php` (api), plus a
flag + endonym in `LanguageSwitcher.tsx`.

## Done

- **Infra**: `src/i18n/{routing,request}.ts`, `next.config.ts` plugin, composed
  locale-aware **`src/proxy.ts`** (Next 16's renamed middleware — admin/obelisk
  guard preserved + locale-stripped; `/marriage-autonomy-spectrum` excluded).
- **Route tree** under `src/app/[locale]/`; passthrough root layout + real shell /
  `NextIntlClientProvider` in `[locale]/layout`; global + localized not-found.
- **Nav imports** swapped to `@/i18n/routing` project-wide.
- **LanguageSwitcher** — osu-style **flag button → dropdown** (flag + endonym,
  current checked, outside-click/Escape close). In public header, auth-page corner,
  and `/settings#language`.
- **Backend** (artypot-api): `preferred_locale` column + endpoints + tests; locale
  codes reserved in `CreatorSlug::RESERVED`. **Migration has been applied.**
- **Persistence**: register saves the active locale; login/OAuth/session-restore
  honor a stored `preferred_locale` (`src/lib/preferred-locale.ts`).
- **Chrome** translated (4 locales): `Sidebar`, `PublicHeader`, `PublicFooter`.
- **Page bodies** translated (4 locales) — Home, About, ForCreators, Support,
  Dashboard, Login, Register, Forgot/Reset, BecomeCreator, Settings, Tos, Privacy,
  CreatorTos. Per-page money/date formatting migrated to `useMoney`/`useDateFormats`
  where present.
- **Formatter helper**: `src/lib/format.ts` (`useMoney`, `useDateFormats`).

## Deferred — remaining pages

Still rendering hardcoded English (fall back gracefully):

- **App pages**: `bounties` (list / new / detail), public profile (`[slug]`),
  `billing`, `history`, `search`, `h/[id]`, `users/[id]`, `creators`, `email/*`.
- **AppShell authed chrome**: header search placeholder + banner copy
  (`EmailVerificationBanner`, `NudgeBar`, `FanMarketBanner`, `PaymentAuthBanner`,
  `PaymentGraceBanner`, `DefaultUpdatePromptBar`).
- **admin/\*** and **obelisk/\*** — intentionally deferred (internal). Council
  sidebar labels exist as `en.json` keys only → English fallback in other locales.

## Deferred — formatting (Phase 9 tail)

The migrated pages had their money/date calls localized. Remaining
`toLocaleString`/`toLocaleDateString` call-sites live on the deferred pages above
plus shared components like `BalancePipeline` (`ui/Pipeline.tsx`, still hardcodes
`'en-US'`) and `nextBillingInfo()` (`lib/config.ts`). Migrate user-facing first;
defer admin/obelisk. Currency stays USD. `eo` has minimal CLDR data → English-ish
number/date formatting.

## Other follow-ups

- **Translation review**: es/eo are machine-quality; product-term choices need a
  native pass — bounty→`encargo`(es)/`mendo`(eo), backing→`aporte`/`subteno`.
- **Brainrot polish**: a handful of strings came back tamer than ideal (e.g. some
  legal-prose lines) — worth a second feralize pass.
- **Legal long-form** (Tos/Privacy/CreatorTos): es/eo dense clauses may equal the
  English source — needs professional legal translation; brainrot is fully done.
- **Pluralization**: use ICU `{count, plural, …}` when migrating count strings.

## Design spec §9 — anti-patterns

All respected: lowercase Kalam headings, mono-uppercase `SectionLabel`s, path-based
role inference (works across locales), `font-mono tabular-nums` for numbers.
