'use client';

import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import { Avatar } from './ui/Avatar';

interface NavItem {
  sec?: string;
  id?: string;
  label?: string;
  icon?: string;
  href?: string;
  count?: number | null;
}

function NavSection({ title }: { title: string }) {
  return (
    <div className="px-5 pt-4 pb-1 font-mono text-[10px] tracking-[1.5px] uppercase text-muted/60">
      {title}
    </div>
  );
}

function NavItem({ item, active }: { item: NavItem; active: boolean }) {
  if (!item.href) return null;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-5 py-[5px] text-sm border-l-[3px] transition-colors ${
        active
          ? 'ap-nav-active bg-surface-2 text-foreground border-l-[var(--color-role)]'
          : 'border-l-transparent text-muted hover:bg-surface hover:text-foreground'
      }`}
    >
      <span className={`ap-nav-ic w-7 h-7 flex items-center justify-center text-xl ${active ? '' : 'text-muted/60'}`}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.count != null && (
        <span
          className={`ap-nav-count font-mono text-[10px] px-1.5 py-px rounded-full border ${
            active
              ? 'bg-[var(--color-role-soft)] text-[var(--color-role)] border-[var(--color-role)]'
              : 'bg-background text-muted/60 border-border'
          }`}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  role: 'fan' | 'creator' | 'council';
  pathname: string;
  /** Whether the mobile drawer is open. Has no effect on desktop. */
  open?: boolean;
  /** Called when the mobile backdrop is tapped to close the drawer. */
  onClose?: () => void;
}

export function Sidebar({ role, pathname, open = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { canSwitch, switchTo } = useViewMode();
  const router = useRouter();
  const t = useTranslations('Sidebar');
  const tc = useTranslations('Common');

  // Which role buttons should appear in the bottom widget?
  // Fan is always available; the others appear only when the user can actually access them.
  // If only one option exists, the widget is hidden entirely.
  const availableRoles: Array<'fan' | 'creator' | 'council'> = ['fan'];
  if (canSwitch) availableRoles.push('creator');
  if (user?.role === 'council') availableRoles.push('council');
  const showRoleSwitcher = availableRoles.length >= 2;

  const switchHandlers: Record<'fan' | 'creator' | 'council', () => void> = {
    fan:     () => { switchTo('fan');     router.push('/dashboard'); },
    creator: () => { switchTo('creator'); router.push('/c'); },
    council: () => { router.push('/admin'); },
  };

  // Dashboard sits unlabeled at the top of each nav; the labeled sections
  // below it group pages by user goal (your own activity, finding new stuff,
  // money, account) rather than by page type.
  const fanItems: NavItem[] = [
    { id: 'fan-home',      label: t('nav.dashboard'),      icon: '◐', href: '/dashboard' },
    // 'your activity' (not 'bounties') — this section holds the fan's own
    // backings + authoring, not the bounty directory (that's under discover).
    { sec: t('sections.yourActivity') },
    { id: 'fan-backings',  label: t('nav.myBackings'),     icon: '◇', href: '/backings' },
    { id: 'fan-create',    label: t('nav.startBounty'),    icon: '+', href: '/bounties/new' },
    { sec: t('sections.discover') },
    { id: 'fan-creators',  label: t('nav.browseCreators'), icon: '◎', href: '/creators' },
    { id: 'fan-bounties',  label: t('nav.browseBounties'), icon: '◫', href: '/bounties' },
    { sec: t('sections.money') },
    { id: 'fan-billing',   label: t('nav.billing'),        icon: '$', href: '/billing' },
    { id: 'fan-payments',  label: t('nav.paymentHistory'), icon: '◷', href: '/history' },
    { sec: t('sections.account') },
    { id: 'fan-settings',  label: t('nav.settings'),       icon: '⚙', href: '/settings' },
    // Pitching creator mode to someone who already has it is just noise —
    // existing creators switch via the role widget below.
    ...(!canSwitch
      ? [{ id: 'fan-become', label: t('nav.becomeCreator'), icon: '✦', href: '/become-creator' }]
      : []),
  ];

  // No 'Setup' item: onboarding now lives on the dashboard (/c) as the payout-
  // readiness checklist, which is the canonical tracker. /c/setup is retired
  // (redirects to /c). The money section leads with Payouts (the action) ahead
  // of the read-only Cash ledger, mirroring the fan side's Billing-before-history.
  const creatorItems: NavItem[] = [
    { id: 'creator-dashboard',  label: t('nav.dashboard'),  icon: '◐', href: '/c' },
    { sec: t('sections.bounties') },
    { id: 'creator-bounties',   label: t('nav.myBounties'), icon: '◇', href: '/c/bounties' },
    { sec: t('sections.money') },
    { id: 'creator-payouts',    label: t('nav.payouts'),    icon: '↗', href: '/c/payouts' },
    { id: 'creator-money',      label: t('nav.cashLedger'), icon: '$', href: '/c/money' },
    { id: 'creator-tax',        label: t('nav.tax'),        icon: '⚖', href: '/c/tax' },
    { sec: t('sections.account') },
    { id: 'creator-handles',    label: t('nav.handles'),    icon: '@', href: '/c/handles' },
    { id: 'creator-settings',   label: t('nav.settings'),   icon: '⚙', href: '/c/settings' },
  ];

  const councilItems: NavItem[] = [
    { sec: t('sections.queues') },
    { id: 'council-completions',      label: t('nav.completionReview'),   icon: '✓', href: '/admin/completions' },
    { id: 'council-handles',          label: t('nav.handleVerification'), icon: '@', href: '/admin/handles' },
    { id: 'council-compliance',       label: t('nav.compliance'),         icon: '⚖', href: '/admin/compliance' },
    { id: 'council-reports',          label: t('nav.reports'),            icon: '⚑', href: '/admin/reports' },
    { sec: t('sections.catalog') },
    { id: 'council-users',            label: t('nav.users'),              icon: '◍', href: '/admin/users' },
    { id: 'council-creators',         label: t('nav.creators'),           icon: '◐', href: '/admin/creators' },
    { id: 'council-handle-registry',  label: t('nav.handleRegistry'),     icon: '⊙', href: '/admin/handle-registry' },
    { id: 'council-featured-bounties', label: t('nav.featuredBounties'),  icon: '★', href: '/admin/featured-bounties' },
    { sec: t('sections.operations') },
    { id: 'council-billing',          label: t('nav.billingRuns'),        icon: '$', href: '/admin/billing' },
    { id: 'council-refunds',          label: t('nav.refunds'),            icon: '↩', href: '/admin/refunds' },
    { id: 'council-payouts',          label: t('nav.externalPayouts'),    icon: '↗', href: '/admin/external-payouts' },
    { id: 'council-members',          label: t('nav.councilMembers'),     icon: '◇', href: '/admin/council' },
    { id: 'council-tiers',            label: t('nav.countryTiers'),       icon: '◉', href: '/admin/tiers' },
    { id: 'council-markets',          label: t('nav.markets'),            icon: '◎', href: '/admin/markets' },
    // Literal label (not t()): avoids adding a nav key across all locale message
    // files for a council-only, English-leaning admin page.
    { id: 'council-analytics',        label: 'Pageview analytics',        icon: '◴', href: '/admin/analytics' },
    { id: 'council-audit',            label: t('nav.auditLog'),           icon: '◫', href: '/admin/logs' },
  ];

  const items = role === 'council' ? councilItems : role === 'creator' ? creatorItems : fanItems;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile backdrop — shown behind the drawer, closes it on tap */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          // Shared
          'flex flex-col w-[240px] flex-shrink-0 bg-surface border-r border-border',
          // Mobile: slides in as a fixed drawer from the left
          'fixed top-0 bottom-0 left-0 z-50',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always-visible sticky column below the top bar. The bar is
          // h-16 (4rem), so the sticky offset and height must subtract 4rem —
          // using 3rem left the column 16px taller than the viewport, which is
          // what caused the slight, content-fits-anyway scroll.
          'lg:sticky lg:top-16 lg:bottom-auto lg:left-auto lg:z-auto',
          'lg:translate-x-0 lg:h-[calc(100vh-4rem)]',
          // The nav below is the scroll container; clip the aside itself so the
          // pinned bottom group can never be pushed out of view. (The "spurious
          // tiny scrollbar" that once motivated whole-column scrolling was
          // actually the 3rem/4rem height bug above.)
          'overflow-hidden',
        ].join(' ')}
      >
      {/* Nav is the only scroll region; min-h-0 lets it shrink below its
          content (flex items default to min-height:auto), and overscroll-contain
          stops mobile-drawer scrolling from chaining to the page behind.
          pt-2.5 gives the unlabeled Dashboard item at the top of the fan and
          creator navs the gap a section header used to provide. */}
      <nav className="pt-2.5 pb-1 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {items.map((item, i) =>
          item.sec ? (
            <NavSection key={`s-${i}`} title={item.sec} />
          ) : (
            <NavItem
              key={item.id}
              item={item}
              active={(() => {
                if (!item.href) return false;
                // Section landing pages (e.g. /c, /admin) must match exactly —
                // otherwise they'd light up for every sub-route below them.
                // /bounties is exact too: its children belong to other items
                // (/bounties/new is "Start a bounty") or to no item (detail pages).
                // /creators is exact so creator profiles (/creators/{id}) don't
                // keep the browse item highlighted.
                const EXACT_MATCH_ROUTES = new Set(['/c', '/admin', '/dashboard', '/bounties', '/creators']);
                if (EXACT_MATCH_ROUTES.has(item.href)) return pathname === item.href;
                // Sub-routes: active when on the exact page OR a deeper page beneath it.
                return pathname === item.href || pathname.startsWith(item.href + '/');
              })()}
            />
          )
        )}
      </nav>

      {/* Bottom group — always pinned at the bottom of the column; shrink-0
          keeps it at natural height while the nav above scrolls. */}
      <div className="shrink-0">
      {/* Role switcher — only renders when at least 2 roles are available, and only the
          available roles are listed. */}
      {showRoleSwitcher && (
        <>
          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Role section label */}
          <div className="px-5 pt-3 pb-1.5 font-mono text-[10px] tracking-[1.5px] uppercase text-muted/60">
            {t('sections.role')}
          </div>

          {/* Buttons */}
          <div className="flex mx-5 border border-border rounded overflow-hidden bg-background text-[9px]">
            {availableRoles.map((option, idx) => (
              <button
                key={option}
                className={`flex-1 py-[7px] font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer ${
                  idx > 0 ? 'border-l border-border' : ''
                } ${
                  role === option ? 'ap-role-active' : 'text-muted hover:bg-surface hover:text-foreground'
                }`}
                onClick={switchHandlers[option]}
              >
                {t(`roles.${option}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* User card */}
      <div className="mx-5 mt-3 mb-3 p-2.5 bg-background border border-border rounded flex items-center gap-2.5">
        <Avatar
          initials={user?.display_name?.charAt(0).toUpperCase()}
          src={user?.profile_picture || undefined}
          size="sm"
          style={role === 'fan'
            ? { background: 'var(--color-fan)', color: 'var(--color-background)' }
            : role === 'creator'
            ? { background: 'var(--color-creator)', color: 'var(--color-background)' }
            : { background: 'var(--color-council)', color: 'var(--color-brand-light)' }
          }
        />
        <div className="flex-1 min-w-0">
          {user && (
            <Link
              href={user.slug ? `/${user.slug}` : `/users/${user.id}`}
              className="text-sm font-bold text-foreground truncate block hover:underline underline-offset-2"
            >
              {user.display_name}
            </Link>
          )}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="font-mono text-[9px] uppercase tracking-wide text-muted/60">{t(`roles.${role}`)}</div>
            <button
              onClick={handleLogout}
              className="shrink-0 font-mono text-[9px] uppercase text-muted/50 hover:text-muted transition-colors cursor-pointer"
            >
              {t('userCard.signOut')} →
            </button>
          </div>
        </div>
      </div>

      {/* Legal links — distributed evenly across the sidebar width. pb respects
          the iOS home-indicator safe area: the footer is hard-pinned to the
          viewport bottom now, so it can't scroll clear of it anymore. */}
      <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
        {([
          { href: '/about',   label: tc('legal.about') },
          { href: '/tos',     label: tc('legal.terms') },
          { href: '/privacy', label: tc('legal.privacy') },
          { href: '/support', label: tc('legal.contact') },
        ] as const).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-mono text-[9px] uppercase tracking-wide text-muted/60 hover:text-muted transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
      </div>
    </aside>
    </>
  );
}
