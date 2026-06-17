# Artypot Web — Design & UX Reference

This document is the single source of truth for **how Artypot pages look and behave**. It is intended for use with Claude Design (and humans) to spec new pages that feel native to the existing app.

If you change a primitive (a colour, a primitive component, a layout rule), update this file in the same PR.

---

## 1. Stack & globals

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- **Styling:** Tailwind v4 with the `@theme inline` token system in `src/app/globals.css`. We do **not** import a Tailwind config; tokens live in CSS.
- **Components:** all primitives live in `src/components/ui/`. Pages import via `import { Card, Button, … } from '@/components/ui/…'` or directly from the file.
- **State:** plain React (`useState` / `useEffect`); cross-cutting state via context providers in `src/lib/*-context.tsx`. No Redux, no Zustand, no React Query.
- **API:** `src/lib/api.ts` — typed `request<T>` wrapper around `fetch`. Bearer token in `Authorization` header from `localStorage`.
- **Path alias:** `@/…` → `src/…`.

The provider tree is `<AuthProvider><ViewModeProvider><NotificationProvider><ToastProvider><HashHighlight />{children}<ToastDisplay /></ToastProvider>…</AuthProvider>` (`src/components/Providers.tsx`). It wraps `<AppShell>`, which wraps the route children. Every page is implicitly a client tree from the moment you hit context.

---

## 2. Design tokens

All tokens are CSS custom properties declared in `globals.css` under `@theme inline`. They are usable as both Tailwind utilities (`bg-surface`, `text-fan`) and arbitrary properties (`bg-[var(--color-role-soft)]`).

### 2.1 Palette (dark by default — there is no light mode)

| Token | Hex | Purpose |
|---|---|---|
| `--color-background` | `#1A1812` | Page background. Warm near-black. |
| `--color-surface` | `#27180F` | Default card / sidebar / header background. |
| `--color-surface-2` | `#321F16` | Secondary surface — nested cards, hover states, input prefix chips, "active" tab pill. |
| `--color-border` | `#4A2D1E` | Default border, divider lines (`divide-border`). |
| `--color-foreground` | `#F2EFE6` | Primary text. Cream — not pure white. |
| `--color-muted` | `#BFB0A9` | Secondary text, labels, hint copy. |
| `--color-brand-dark` | `#1A1812` | Text on top of bright role-colour surfaces (avatars, fan/creator badges, primary buttons). Same value as background by intent. |
| `--color-brand-light` | `#F2EFE6` | Text on top of dark role-colour surfaces (council). |

The body also paints **three faint radial-gradient washes** (yellow top-left ~3 %, teal bottom-right ~3 %, blue centre ~2 %) as `background-attachment: fixed`. They are intentionally barely visible — they keep the bg from looking flat. Pages should never override them.

### 2.2 Role palette

Three first-class roles. Each has a saturated colour and a dim variant for accents.

| Role | Hex | Dim | Used on |
|---|---|---|---|
| `fan` | `#ffd966` (warm yellow) | `#e69138` | Default for `/dashboard`, `/bounties/*`, `/settings`, `/backings`, `/billing`. |
| `creator` | `#47DFD3` (teal) | `#2BA8A0` | All `/creator/*`. |
| `council` | `#4d6aca` (indigo) | `#46509c` | All `/admin/*` and `/obelisk/*`. |

These are exposed in three ways:

1. **Static utilities** — `bg-fan`, `text-creator`, `border-council`. Use when the colour is permanent for that element (e.g. a creator profile teal stat).
2. **Role-themed CSS vars** — `var(--color-role)` and `var(--color-role-soft)`. These are rewritten by `[data-role="fan" | "creator" | "council"]` on the AppShell root, so a sidebar nav button, a focused input ring, and a primary button all turn teal automatically when you're inside `/creator/*`. **Always prefer these for role-driven UI.** Don't hard-code `fan` colours on a fan-only page; let the role system do it.
3. **Pre-built helper classes** in `globals.css` — `ap-btn-primary`, `ap-card-role-accent`, `ap-section-label-bar`, `ap-toggle-track-on`, `ap-nav-active`, `ap-inline-link`, `ap-sketch-u`. These wrap the role var so component code stays clean.

### 2.3 Status palette

| Token | Hex | Soft variant | Use |
|---|---|---|---|
| `--color-good` | `#6fd6a6` | `--color-good-soft` `#102a20` | Success states, "available" funds, ✓ icons, completed steps. |
| `--color-warn` | `#ffd66b` | `--color-warn-soft` `#2d2410` | Warnings, "pending" funds, hash-link highlight ring, billing banner. |
| `--color-bad` | `#e26b50` | `--color-bad-soft` `#341610` | Errors, payment failure, danger zones, revoked. |
| `--color-info` | `#7a9dd1` | `--color-info-soft` `#102030` | Neutral information, "clearing" funds, pending-review states. |

Tailwind utilities: `bg-good-soft`, `text-bad`, `border-warn`, etc.

### 2.4 Shadows

| Token | Value | Use |
|---|---|---|
| `--shadow-hard` | `3px 3px 0 #000` | Default / primary buttons. **The signature button shadow** — gives the hand-crafted feel. |
| `--shadow-soft` | `0 4px 16px rgba(0,0,0,0.5)` | Modals, dropdowns. |

Buttons additionally animate the shadow on hover (`4px 4px 0 #000`) and active (`1px 1px 0 #000`) with matching translate. Don't replace `shadow-hard` with `shadow-lg` on buttons — it breaks the aesthetic.

---

## 3. Typography

Five font families, all loaded via `next/font/google` in `app/layout.tsx`.

| Token | Family | Use |
|---|---|---|
| `--font-display` | **Kalam** (fallback Architects Daughter) | The handwritten brand voice. Page H1s, hero headings, modal titles. |
| `--font-sans` | **DM Sans** | Body copy, prose. Default for `<body>`. |
| `--font-mono` | **Geist Mono** | **All numeric values, timestamps, labels, badges, micro-copy.** Anywhere you'd want "data" feel. |
| `--font-geist` | **Geist Sans** | Available as a backup sans; rarely used in practice. |

Tailwind: `font-display`, `font-sans`, `font-mono`.

### 3.1 The lowercase rule

Kalam text is forced **lowercase** by a global rule (`globals.css` line 81). This is intentional — it's a brand thing. Override only for content that must keep its case (a user's `display_name`, a brand name) by adding `normal-case` to the element. Sans-serif text uses natural casing — no transform.

### 3.2 Sizing canon

We use Tailwind size utilities heavily, but a handful of arbitrary values are intentional and recurring. **When in doubt, copy these.**

| Use | Class | Notes |
|---|---|---|
| Page H1 | `font-display font-bold text-[28px] text-foreground mt-1` | After a `<SectionLabel>` breadcrumb. |
| Section subtitle (`SectionLabel`) | `font-mono text-[10px] tracking-[2px] uppercase text-muted` | Always preceded by the role-coloured bar (`.ap-section-label-bar`). |
| Big numeric stat | `font-mono text-[24px] font-medium tabular-nums text-foreground` | Dashboard cards. Sometimes `text-[28px]`/`[32px]` for "hero" stats. |
| Stat label | `font-mono text-[10px] uppercase tracking-widest text-muted mb-1` | Sits above the number. |
| Tiny micro-copy line | `font-mono text-[10px] text-muted mt-0.5` | Sits below the number ("solid backings", "soft backings"…). |
| Inline-row list label | `text-sm text-foreground` / `text-sm text-muted` | Used inside `Card` row lists. |
| Field label (`FieldLabel`) | `font-mono text-[10px] tracking-[0.8px] uppercase text-muted mb-1.5` | Above every form input. |
| Field hint (`FieldHint`) | `font-mono text-[10px] tracking-[0.5px] text-muted/70 mt-1.5` | Below input. Used for "Publicly visible", "Minimum is $1", etc. |
| Body copy in cards | `text-sm leading-relaxed text-muted` for help text; `text-foreground` for primary | |
| Inline link | `ap-inline-link` (role-coloured, dotted underline) | For text-flow links inside paragraphs. |
| Right-aligned "see more" link | `font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors` | E.g. "full ledger →" |

**Numbers always use `font-mono tabular-nums`** so they don't jiggle as values change. Currency formatting standard:

```ts
`$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
```

---

## 4. Layout system

### 4.1 The three shells

`src/components/AppShell.tsx` chooses one of four layouts based on `(pathname, user)`:

1. **Auth route** (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/email/*`, `/oauth/*`) → full-bleed, no chrome. Pages render their own centered card.
2. **Loading auth check** → blank dark screen (just `bg-background`).
3. **Unauthenticated on a non-auth route** → `<PublicHeader />` + page + `<PublicFooter />`. Used for the marketing homepage, public profiles, public bounties, `/about`, `/tos`, `/privacy`, `/support`, `/for-creators`.
4. **Authenticated** → sticky 64px top bar + left sidebar + main content area + role-themed banners.

### 4.2 Authenticated layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER  h-16 sticky  bg-surface  border-b border-border     │  z-50
├────────┬─────────────────────────────────────────────────────┤
│        │  NudgeBar                                           │
│        │  PaymentAuthBanner                                  │
│        │  PaymentGraceBanner                                 │
│ SIDE   │  StaleCardBar                                       │
│ BAR    │                                                     │
│ 240px  │  ┌─ Page content ─────────────────────────────┐    │
│        │  │  div.space-y-7.pt-2  (the page root)      │    │
│        │  │  ...                                       │    │
│        │  └────────────────────────────────────────────┘    │
└────────┴─────────────────────────────────────────────────────┘
              main padding: px-7 py-7 pb-28  max-w-[1400px]
```

The four banners (`NudgeBar`, `PaymentAuthBanner`, `PaymentGraceBanner`, `StaleCardBar`) render in that fixed order. **Every authenticated page therefore renders inside this strip — never include them on individual pages.**

### 4.3 Header anatomy

- **Height 64 px** (`h-16`). Sticky, `z-50`.
- Background `bg-surface`, border-bottom.
- Layout `flex items-center gap-3 px-4`.
- Contents: hamburger (mobile only) · logo image + version tag · **search bar** · spacer · `NotificationBell`.
- **Mobile** (`< sm`): the search bar collapses to a single icon button on the right. Tapping it swaps the entire bar for an expanded search input + "cancel" button. The logo and notif bell hide while the mobile search is open. This pattern is mirrored exactly in `PublicHeader`.

### 4.4 Sidebar anatomy (`src/components/Sidebar.tsx`)

- **240 px wide**, `bg-surface`, right border. Sticky to viewport on `lg+`, a slide-in drawer on `< lg` (controlled by the AppShell hamburger button).
- Three nav definitions (`fanItems`, `creatorItems`, `councilItems`). Each is a flat list with `{ sec: 'label' }` separators that render as faint mono uppercase headings. **Sections never overlap visually** — there is no whitespace divider between section heading and items; the heading IS the divider.
- **NavItem** is a `<Link>` with:
  - `border-l-[3px]` — transparent by default, role-coloured + `bg-surface-2` when active.
  - `font-mono text-xl` icon glyph in a 28×28 box on the left, then label, optional count chip on the right.
  - Active rule: section landings (`/dashboard`, `/creator`, `/admin`) match exactly; everything else matches the path or any deeper path.
- Below the nav: optional **role-switcher** pill row (only renders when ≥2 roles are accessible), then a **user card** with avatar/name/role/`out` button, then a row of four legal links (`About · Terms · Privacy · Contact`).

The sidebar is **the** way users move around. New section landing pages should be reachable from here — don't rely on in-page links alone.

### 4.5 Public (unauthenticated) layout

`PublicHeader` and `PublicFooter` (`src/components/Public*.tsx`):

- Header is sticky `h-16` like authed, with the same logo + same search widget + Log in / Sign up nav. Search behaviour is identical (icon-collapsing on mobile).
- Footer is `border-t mt-auto` with copyright on the left and a horizontal row of `About · Terms · Privacy · Contact` on the right; stacks to centred column on mobile.
- The wrapper is `<div className="flex flex-col min-h-screen bg-background">` so the footer sits at the bottom on short pages.

### 4.6 Page-content conventions

A typical authenticated page root is:

```tsx
<div className="space-y-7 pt-2">
  {/* Header */}
  <div className="flex items-start justify-between gap-4">
    <div>
      <SectionLabel>creator · dashboard</SectionLabel>
      <h1 className="font-display font-bold text-[28px] text-foreground mt-1">
        {pageTitle}
      </h1>
    </div>
    <Button variant="primary">+ Action →</Button>
  </div>

  {/* ... sections, each separated by space-y-7 ... */}
</div>
```

Key rules:

- **`space-y-7` (28 px)** is the standard inter-section gap on a page. `space-y-6` for tighter form sections, `space-y-4` for very dense pages.
- **`pt-2`** to nudge the header away from the banner strip.
- **Settings-style pages** clamp to `max-w-[680px]` for readable form columns. Dashboard / list pages use the full main width.
- **Two-column dashboards** use `grid lg:grid-cols-[1fr_300px] gap-6` with the primary content on the left and a fixed-width sidebar of stat / action cards on the right.
- **Stat grids** use `grid grid-cols-2 lg:grid-cols-4 gap-4` (or `sm:grid-cols-4`). Always 4 cards visually balanced; stack to 2×2 on mobile.

### 4.7 Section breadcrumb format

The `<SectionLabel>` that sits above every page title follows a `role · page` format:

- `fan · dashboard`, `fan · settings`, `fan · billing`
- `creator · dashboard`, `creator · bounties`, `creator · settings`
- `council · users`, `council · completions`

Sometimes a personalised slot is appended: `fan · ${firstName}`. Always lowercase, separated by ` · ` (space-bullet-space). Never include a verb.

---

## 5. Component primitives

### 5.1 `<Card>`

The workhorse. `border rounded-md p-4 sm:p-5 bg-surface`. Variants via boolean props:

- `dashed` → `border-dashed bg-transparent`. Used for "empty / placeholder" tone or quick-link cards in sidebars.
- `accent` → `bg-surface-2` instead of `bg-surface`. Use for nested / inline cards (an expanded form inside a list row).
- `roleAccent` → adds a 2 px top bar in the role colour. Reserved for "primary action" cards (e.g. the Withdraw card on `/creator`).
- `title="…"` + optional `right={…}` → renders a `<SectionLabel>` header row inside the card with optional right-aligned ReactNode.

**Divider rows pattern.** When you want a list of rows inside a card with hairline dividers between them (the canonical "transactions list" look):

```tsx
<Card>
  <div className="divide-y divide-border -mx-5 -my-4">
    {items.map(item => (
      <div className="flex items-center gap-4 px-5 py-4">…</div>
    ))}
  </div>
</Card>
```

The negative margin pulls the divider lines flush to the card edges. **Always include `px-5 py-4` on each row** to restore breathing room.

### 5.2 `<SectionLabel>`

`font-mono text-[10px] tracking-[2px] uppercase text-muted` with the **role-coloured 18×1.5 px bar** prefix (`.ap-section-label-bar::before`). Used for **every** section heading on every page. Don't write your own — use `<SectionLabel>` from `@/components/ui/Card`.

### 5.3 `<Button>`

Four variants × three sizes.

**Variants:**

| Variant | Visual | Use |
|---|---|---|
| `default` | `bg-surface-2 text-foreground` + hard shadow + hover-lift | Most actions. Cancel buttons. |
| `primary` | Role-coloured background (`ap-btn-primary`) + hard shadow + lift | The one primary CTA per section. |
| `danger` | `bg-bad-soft text-bad border-bad` + hard shadow + lift | Destructive actions ("Remove", "I'm Broke", "Delete account"). |
| `ghost` | Transparent, no shadow, hover `bg-surface-2` | Modal close, low-emphasis inline actions. |

**Sizes:** `default` (px-4 py-2 text-base), `sm` (px-2.5 py-1 text-sm, lighter shadow), `xs` (px-2 py-0.5 text-xs, no shadow, `rounded-sm`).

**The signature interaction:** primary and default buttons translate `-1px,-1px` on hover and `+1px,+1px` on active, with shadow scaling `3px → 4px → 1px`. This produces a subtle "press" feedback. Disabled state is `opacity-40 cursor-not-allowed !transform-none`.

CTAs almost always end with a trailing arrow: `Submit →`, `Continue →`, `Public Profile →`. The arrow is part of the children, not a separate icon.

### 5.4 `<Badge>`

`inline-flex rounded-full border font-mono uppercase tracking-wide` pill. Two sizes (default `text-[10px] px-2 py-px`, `lg` `text-[11px] px-2.5 py-0.5`).

Tones map straight to the palette:

- Status: `default` · `solid` · `warn` · `good` · `bad` · `info`
- Role-themed: `role` (uses `var(--color-role)`), `fan`, `creator`, `council`
- Pipeline: `pending` · `clearing` · `available` (warn / info / good aliases)

The dedicated `<BountyStatusBadge>` wrapper maps bounty status strings → label + tone in one place (`src/components/BountyStatusBadge.tsx`). **Always use it for bounty rows** so the labels stay consistent across the app.

### 5.5 `<Banner>`

Horizontal alert strip used inline on a page (NOT the global banners — those are `NudgeBar` etc.). Has `border-l-4` accent in the tone colour and renders `{children}` + optional right-side `{action}` (typically a `<Button>` or `<Link>`).

Four tones: `default` (info-blue), `warn`, `bad`, `good`. **No `info` tone** — use `default` for neutral information.

### 5.6 Inputs (`<Input>` / `<Textarea>` / `<Select>` / `<InputPrefix>`)

All share the same base: `w-full px-3 py-2.5 bg-background text-foreground border border-border rounded font-sans text-base`, with `focus:border-[var(--color-role)]`. Pass `mono` to switch to `font-mono text-sm` (used for handle inputs, amounts).

- `<FieldLabel>` above, `<FieldHint>` below. Use both. Hints are not optional fluff — they often tell the user "Publicly visible" or "Minimum is $1".
- `<InputPrefix prefix="@">{inputElement}</InputPrefix>` for `@username` / URL prefixes. The prefix sits in a `bg-surface-2` chip.
- `<Select>` adds a custom CSS-painted chevron in place of the native arrow.
- `<FieldGrid2>` is a 2-column field grid (`grid grid-cols-2 gap-3`).

Pages typically lay forms out as `<form className="space-y-3">` (or `space-y-4` for sparser forms).

### 5.7 `<Modal>`

Centre-aligned overlay. `bg-black/70 backdrop-blur-sm` scrim. Inner card is `bg-surface border rounded-lg p-6 shadow-soft max-h-[90vh] overflow-y-auto`. Two sizes: `max-w-lg` (default) and `lg` → `max-w-2xl`.

Has a built-in title row with display-font heading and a ghost `✕` close button on the right. Click-on-scrim closes; inner click stops propagation.

Pass `actions={<><Button…/><Button…/></>}` for a right-aligned action footer.

### 5.8 `<Toggle>`

42×22 px track with a 14×14 thumb. **`on` state uses the role colour** — yellow thumb on fan pages, teal on creator pages, blue on council. The track turns `var(--color-role-soft)` with role border.

Inline label rendered as `text-sm text-foreground` to the right.

### 5.9 `<Avatar>`

Round, four sizes (`sm` 28 px, `md` 40 px, `lg` 72 px, `xl` 96 px). Falls back to single-letter initial in the avatar's role colour when no `src` is provided. **Use the variant `<AvatarOrUnknown>`** when the avatar should be hidden / silhouette for unverified records.

### 5.10 `<Stepper>`

Horizontal step indicator. Numbered circles (`<= current` filled role colour, `< current` filled `good`, `> current` border-only). Connector lines between. Labels hide on `< sm`. Used at the top of multi-step flows like `/become-creator`.

### 5.11 `<Tabs>` (`TabsInline`)

Compact pill-row tab control: `flex gap-1 border rounded-md p-0.5 bg-surface w-fit`. Active tab gets `bg-surface-2 text-foreground`. Used for narrow in-card switching ("backers / comments" on a bounty page).

For **filter chip rows** (e.g. status filters on a list page), use **not** `TabsInline` but a bespoke pill row — see §6.4.

### 5.12 `<Empty>`

`text-center py-14 px-5 border border-dashed border-border rounded-md bg-surface text-muted`. Has an `icon` (a glyph like `◇`), a `message`, and optional children (typically a CTA `Button`). Use whenever a list comes back empty — don't write a bespoke "no results" string.

### 5.13 `<Timeline>`

Two-column vertical timeline (dot + connector | content). Each item has `when` (mono micro-label), `what`, optional `amount`/`hint`. Dots use role colour for `done`/`current`, with `current` also getting a 4-px ring (`shadow-[0_0_0_4px_var(--color-role-soft)]`). Connector is a dotted CSS `repeating-linear-gradient`. Used for explaining bounty lifecycle.

### 5.14 `<BalancePipeline>`

Three-cell horizontal pipeline (pending → clearing → available). Each cell has its own top-border colour (warn / info / good) and a coloured dot next to the label. The amount is `font-mono text-xl`. Used in two places: the fan dashboard and the creator dashboard ("earnings pipeline"). **Don't reinvent it.**

### 5.15 `<GateCard>`

Row with a status icon circle on the left, label + detail, optional action on the right. Three statuses (`done` ✓ green, `todo` ! warn, `blocked` × bad). Used on onboarding-style checklists.

### 5.16 `<BountyCard>`

Used in lists/grids of bounties on public-facing pages. 70 px thumb placeholder + title + status badge + handle line + funded amount / backer count. Hover lifts 1 px and recolours border to `var(--color-role)`.

### 5.17 `<ShareButton>`

Small bordered icon button. Tapping it opens a dropdown with: **Copy link** (clipboard, swaps trigger to a green check for 2 s on success) · divider · Twitter / X · Facebook / WhatsApp / Email. Always pass `path` (relative URL) and `title`; optional `text` (message body).

### 5.18 `<PlatformHandleInput>`

Specialised input for entering a `(platform, handle)` pair. Handles the 7 curated platforms (Twitter, YouTube, Instagram, TikTok, Twitch, Bluesky, Kick) plus an `other` mode that takes a raw URL. The prefix UI changes per platform (`@`, `twitch.tv/`, full URL, etc.).

---

## 6. UX patterns

These are recurring behaviours. **Use them; don't reinvent them.**

### 6.1 Auth-gate idiom (every authenticated page)

```tsx
useEffect(() => {
  if (!authLoading && !user) router.push('/login');
}, [authLoading, user, router]);

if (authLoading || !user) return <Skeleton />;
```

`Skeleton` is a placeholder layout — a few `animate-pulse` divs that approximate the real page silhouette. **Don't return `null`** while loading — that causes layout shift. See §6.3.

### 6.2 Loading skeletons

Pattern: replace each major surface with a `bg-surface[-2] animate-pulse rounded` block of approximately the same dimensions. Common shapes:

```tsx
<div className="h-8 w-56 bg-surface animate-pulse rounded" />           // H1 stub
<div className="h-20 bg-surface animate-pulse rounded" />               // stat card
<div className="h-64 bg-surface animate-pulse rounded" />               // big content card

// list skeleton inside a card:
<Card>
  <div className="divide-y divide-border -mx-5 -my-4">
    {[1,2,3,4].map(i => (
      <div key={i} className="flex items-center gap-4 px-5 py-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-surface-2 animate-pulse rounded" />
          <div className="h-3 w-1/3 bg-surface-2 animate-pulse rounded" />
        </div>
        <div className="h-6 w-20 bg-surface-2 animate-pulse rounded-full" />
      </div>
    ))}
  </div>
</Card>
```

Use `bg-surface` for top-level blocks, `bg-surface-2` when the skeleton sits inside a Card.

### 6.3 Toasts

`useToast()` returns `toast(message, type?)`. Two types: `success` (✓, 3 s visible, green) and `error` (✕, 6 s visible, red). Toasts stack bottom-centre with a 300 ms fade. Render-side is automatic — `<ToastDisplay />` lives in `Providers`.

**Use a toast for:**
- Successful destructive actions ("Removed.", "Saved!", "Submitted for review!").
- Failed API calls — the error message from the catch block. Always include a fallback string: `toast(e.message ?? 'Failed to save.', 'error')`.

**Don't use a toast for:**
- Confirmations *before* the action (use `<Modal>` or an inline confirm row).
- State that needs to persist past 6 s (use a `<Banner>`).

### 6.4 Filter tabs (list pages)

A bespoke pill row, not `TabsInline`. Standard implementation (from `/creator/bounties`):

```tsx
const FILTER_TABS = [{ label: 'All', value: '' }, { label: 'Open', value: 'open' }, …];

<div className="flex flex-wrap gap-2">
  {FILTER_TABS.map(tab => (
    <button
      key={tab.value}
      onClick={() => setFilter(tab.value)}
      className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
        active === tab.value
          ? 'bg-creator text-black border-creator font-semibold'  // use role colour
          : 'bg-surface border-border text-muted hover:border-creator/50 hover:text-foreground'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- Always `font-mono text-[10px] uppercase tracking-wider`.
- Active background is the **role colour** (`bg-fan` / `bg-creator` / `bg-council`) with `text-black` and the same border.
- Idle is `bg-surface border-border text-muted` with a hover state that previews the role border at half opacity.
- Changing filter always **resets pagination to page 1**.

### 6.5 Pagination

```tsx
<div className="flex items-center justify-between">
  <Button variant="default" size="sm" disabled={page === 1 || loading}>← prev</Button>
  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
  <Button variant="default" size="sm" disabled={page === lastPage || loading}>next →</Button>
</div>
```

Always render after the list. Hide entirely when `lastPage <= 1`.

### 6.6 Inline forms inside list rows (expand-in-place)

When a row can expand a form (e.g. "Submit completion" inside a bounty row), render a `<Card accent className="mt-3">` *inside* the row. Only one row is expanded at a time — the parent component tracks `expandedId: number | null` and renders the form only when the row's id matches. Opening another row collapses the first.

The expanded card uses `!bg-surface-2` (the bang lets it win over the `bg-surface` inherited from the parent Card).

### 6.7 Confirmation patterns

Pick the right one:

- **Toast-after** — silent destructive actions where you can `undo` later (revoke backing, dismiss nudge).
- **Inline confirm row** — "are you sure?" two-button row that replaces the action, no modal. Used for "I'm Broke" → confirm row.
- **`<Modal>`** — destructive actions with permanent consequences (delete account, remove bounty as creator).
- **`<Banner tone="bad">`** with an explanatory paragraph + an "I understand" `<Toggle>` before the destructive button is enabled — for "this affects other people" actions like backing out as the last supporter.

### 6.8 Empty states

Always use `<Empty icon="◇" message="…">`. The icon glyphs we use are non-emoji unicode geometry: `◇` (default bounty), `◐` (data), `★` (favourites). Provide a CTA inside the children — never leave the user with an empty state and no next step.

For filter results: phrase as "No revoked bounties" (specific to the filter), not "No bounties" (which would imply none exist).

### 6.9 Hash-link anchors (cross-page deep links)

`HashHighlight` is mounted globally. To make a section deep-linkable:

```tsx
<div id="bank-account">
  <Card>
    <SectionLabel>bank account</SectionLabel>
    …
  </Card>
</div>
```

When the URL fragment matches the id, the **first child** of the wrapper (i.e. the rendered `<Card>`) gets a `.hash-highlighted` class that triggers a 2.5 s amber ring pulse. Works for both cross-page navigation (`pathname` change) and same-page (`hashchange` event).

Pages that send users to anchored sections must reference the exact id: `/creator#bank-account`, `/settings#email`, `/settings#phone`, `/billing#payment-method`. Always check the destination page actually defines the id.

`[id]` elements get `scroll-margin-top: 5.5rem` globally so they never land under the sticky header.

### 6.10 Role inference and theming

`AppShell` infers role from pathname:

- `/admin/*` or `/obelisk/*` → `council`
- `/creator/*` → `creator`
- `/bounties/{id}` with stored mode `= creator` → `creator` (so a creator viewing their own bounty keeps the creator chrome)
- Anything else → `fan`

The root `<div data-role={role}>` rewrites `--color-role` / `--color-role-soft` globally. **You don't need to do anything to opt in** — role-coloured utilities Just Work on the right pages.

The role switcher pill row in the sidebar (only shown when ≥2 roles are accessible) flips both the stored ViewMode (localStorage `artypot_view_mode`) and navigates to the role's landing page (`/dashboard` / `/creator` / `/admin`).

### 6.11 Money formatting

```ts
`$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
```

Always render in `font-mono tabular-nums`. Negative balances (outstanding charges) display as positive amounts inside a `<Banner tone="warn">` with "you'll be charged $X". Don't show negative signs.

For balance pipelines, use `<BalancePipeline>` — not a custom row.

### 6.12 Date / time formatting

- **Short date** in a metadata line: `new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` → "May 26, 2026". Used in row metadata.
- **Tooltip / hover date**: full date + time `new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })`.
- **Billing date**: derived from `nextBillingInfo()` in `@/lib/config` — auto-handles warp mode for testing.

### 6.13 Global banner strip (authenticated only)

These render in fixed order at the top of `<main>` for every authed page. Pages do **not** opt in or out.

| Order | Component | Renders when |
|---|---|---|
| 1 | `<NudgeBar />` | Backend returns an active "do this next" nudge — add contact method, verify email, add payment method, payout hold, setup bank, submit tax form, balance ready. Tone follows nudge type (`bad` / `warn` / `good`). Has a Set up now → CTA pointing to a hash anchor on the relevant page. |
| 2 | `<PaymentAuthBanner />` | A backing is in Stripe's "requires action" state (3DS challenge needed). |
| 3 | `<PaymentGraceBanner />` | The user's last charge failed and they're inside the grace window. Shows the deadline + "Update card →". |
| 4 | `<StaleCardBar />` | The on-file card hasn't been added/charged/confirmed in 90 days. Asks "Is your [card] still yours?" with confirm/remove buttons. |

Conditions for each are mutually exclusive in practice; multiple may rarely stack.

### 6.14 Header search

The search widget (`<CreatorSearchWidget>`) is the same component used in the hero on the homepage. Two display modes:

- **Inline result mode** — controlled via `selectedCreator` / `onSelect` props (used on the homepage hero).
- **Navigate-on-select mode** — `navigateOnSelect` prop, used in both headers. Picks land you on the result's page directly.

The mobile-collapse pattern (icon → full bar → cancel) is hard-coded around it in both `AppShell` and `PublicHeader`.

---

## 7. Page archetype recipes

The five most common page shapes. Use these as starting points.

### 7.1 Dashboard ("home for a role")

`/dashboard`, `/creator`, `/admin/users`.

```
SectionLabel + H1 + primary CTA
[role banner if any]
[4-card stat grid : grid-cols-2 lg:grid-cols-4 gap-4]
[primary list — Card with divide-y rows]
[footer row: link to "full history →"]
```

### 7.2 Settings (form list)

`/settings`, `/creator/settings`, `/creator/setup`.

```
SectionLabel + H1
[Card]: section A — short blurb + form
[Card]: section B — current value + edit affordance
[Card]: section C — Toggle list
...
[Card .border-bad/30]: danger zone (last)
```

Container: `space-y-7 pt-2 max-w-[680px]`. Every editable section is its own `<Card>` with an inner `<SectionLabel>` heading. Hash-anchorable sections are wrapped in `<div id="…">`.

### 7.3 Detail page (bounty / creator profile)

`/bounties/[id]`, `/[slug]`.

```
Header Card (banner-style): title + status badge + meta + share button
[3-col grid: lg:grid-cols-3]:
   col-span-1 (sidebar):  backing form / call to action card + verification card
   col-span-2 (main):     description, history chart, backers/comments tabs
```

### 7.4 List page (paginated index)

`/bounties`, `/creator/bounties`, `/backings`, `/admin/handles`.

```
SectionLabel + H1 + primary CTA + count "{total} bounties"
[stat grid — optional]
[filter pills row]
[Card with divide-y rows]   OR   [Empty state if 0 results]
[pagination row]
```

### 7.5 Onboarding / multi-step flow

`/become-creator`, `/creator/setup`.

```
<Stepper> at top
[active step's Card]
[footer: "← back" + "next →" button row]
```

---

## 8. Accessibility & responsive notes

- All interactive elements have an `aria-label` when they're icon-only (hamburger, search icon, modal close, share button).
- Focus styling uses `focus:outline-none focus:border-[var(--color-role)]` — the role colour reads cleanly on the dark surface. Don't remove the focus styling.
- Mobile breakpoints (Tailwind defaults): `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px.
  - Sidebar hides + becomes drawer at `< lg`.
  - Stat grids collapse to 2 columns at `< lg`.
  - Search bar collapses to an icon at `< sm`.
  - Header logo + version chip hides on `< sm` while the mobile search bar is expanded (re-renders on close).
- The `lowercase` rule on display-font headings is a brand decision, not a bug. Don't fix it.

---

## 9. Anti-patterns (don't do these)

- ❌ Pure white (`#fff`) or pure black (`#000`) for text or backgrounds. Use `foreground` / `background` tokens.
- ❌ Tailwind `shadow-lg` / `shadow-xl` on buttons. Use the hard 3-px shadow.
- ❌ A new H1 size. Use `text-[28px]`.
- ❌ Sentence-case "Settings" in a `<SectionLabel>`. Always lowercase mono.
- ❌ Replacing `<Empty>` with a bespoke "no results" div.
- ❌ A "warning" inline alert with `tone="info"` on `<Banner>` — that prop doesn't exist. Use `default` for neutral info.
- ❌ Stacking your own banner above the AppShell-rendered ones. Use the existing system or add a new banner inside AppShell.
- ❌ Hard-coding `bg-fan` on a page that lives at `/creator/*`. Use `var(--color-role)` so the role-switch works.
- ❌ Returning `null` while auth loads. Render a skeleton so the layout doesn't shift.
- ❌ Calling `localStorage` in a server component. Auth-gated pages must be `'use client'`.
- ❌ Reinventing the divide-y row pattern. Use `divide-y divide-border -mx-5 -my-4` inside a `<Card>`.
- ❌ Different number formats across pages. Always `font-mono tabular-nums` + `toLocaleString('en-US', { minimumFractionDigits: 2 })`.

---

## 10. Where to look when you need an example

| You want to design… | Open this file |
|---|---|
| A new authenticated dashboard | `src/app/dashboard/page.tsx`, `src/app/creator/page.tsx` |
| A settings-style form page | `src/app/settings/page.tsx`, `src/app/creator/settings/page.tsx` |
| A paginated list page with filters | `src/app/creator/bounties/page.tsx`, `src/app/backings/page.tsx` |
| A detail page with sidebar | `src/app/bounties/[id]/page.tsx` |
| A multi-step onboarding | `src/app/become-creator/page.tsx`, `src/app/creator/setup/page.tsx` |
| A public marketing page | `src/app/page.tsx`, `src/app/about/page.tsx` |
| An auth flow | `src/app/login/page.tsx`, `src/app/register/page.tsx` |
| A council admin queue | `src/app/admin/completions/page.tsx`, `src/app/admin/handles/page.tsx` |
| The role-switching mechanism | `src/components/AppShell.tsx`, `src/lib/view-mode-context.tsx`, `src/components/Sidebar.tsx` |
| The banner strip system | `src/components/NudgeBar.tsx`, `src/components/StaleCardBar.tsx`, `src/components/PaymentGraceBanner.tsx`, `src/components/PaymentAuthBanner.tsx` |

---

## 11. Local development

```bash
npm run dev    # Next.js dev server (Turbopack)
npm run build  # production build — run before every commit that touches a page
npm run lint
```

Environment variables that affect UX (all `NEXT_PUBLIC_*`, all optional, see `src/lib/config.ts`):

- `NEXT_PUBLIC_BILLING_DAY` — day-of-month for billing. Default 24.
- `NEXT_PUBLIC_PAYOUT_MINIMUM_AUTOMATED` / `_MANUAL` — withdraw thresholds. Default 1 / 50.
- `NEXT_PUBLIC_BILLING_GRACE_PERIOD_DAYS` — failed-payment grace window. Default 7.
- `NEXT_PUBLIC_PLATFORM_FEE_PCT` — shown in billing breakdown. Default 20.
- `NEXT_PUBLIC_WARP_SPEED` — when `'true'`, compresses all day-based intervals into minutes for local QA. **Never enable in production.**
