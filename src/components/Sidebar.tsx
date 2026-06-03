'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

  // Which role buttons should appear in the bottom widget?
  // Fan is always available; the others appear only when the user can actually access them.
  // If only one option exists, the widget is hidden entirely.
  const availableRoles: Array<'fan' | 'creator' | 'council'> = ['fan'];
  if (canSwitch) availableRoles.push('creator');
  if (user?.role === 'council') availableRoles.push('council');
  const showRoleSwitcher = availableRoles.length >= 2;

  const switchHandlers: Record<'fan' | 'creator' | 'council', () => void> = {
    fan:     () => { switchTo('fan');     router.push('/dashboard'); },
    creator: () => { switchTo('creator'); router.push('/creator'); },
    council: () => { router.push('/admin'); },
  };

  const fanItems: NavItem[] = [
    { sec: 'discover' },
    { id: 'fan-home',     label: 'Dashboard',   icon: '◐', href: '/dashboard' },
    { id: 'fan-create',   label: 'Start a bounty',     icon: '+', href: '/bounties/new' },
    { id: 'fan-search',   label: 'Explore',            icon: '⌕', href: '/search' },
    { sec: 'money' },
    { id: 'fan-billing',   label: 'Billing',         icon: '$', href: '/billing' },
    { id: 'fan-backings',  label: 'My backings',     icon: '◇', href: '/backings' },
    { id: 'fan-payments',  label: 'Payment history', icon: '◷', href: '/history' },
    { sec: 'account' },
    { id: 'fan-settings', label: 'Settings',           icon: '⚙', href: '/settings' },
    { id: 'fan-become',   label: 'Become a creator',   icon: '✦', href: '/become-creator' },
  ];

  const creatorItems: NavItem[] = [
    { sec: 'overview' },
    { id: 'creator-dashboard',  label: 'Dashboard',          icon: '◐', href: '/c' },
    { id: 'creator-onboarding', label: 'Setup',              icon: '◔', href: '/c/setup' },
    { sec: 'work' },
    { id: 'creator-bounties',   label: 'Bounties',           icon: '◇', href: '/c/bounties' },
    { sec: 'money' },
    { id: 'creator-money',      label: 'Cash ledger',              icon: '$', href: '/c/money' },
    { sec: 'admin' },
    { id: 'creator-handles',    label: 'Handles',            icon: '@', href: '/c/handles' },
    { id: 'creator-tax',        label: 'Tax & compliance',   icon: '⚖', href: '/c/tax' },
    { id: 'creator-settings',   label: 'Settings',           icon: '⚙', href: '/c/settings' },
  ];

  const councilItems: NavItem[] = [
    { sec: 'queues' },
    { id: 'council-completions',      label: 'Completion review',   icon: '✓', href: '/admin/completions' },
    { id: 'council-handles',          label: 'Handle verification', icon: '@', href: '/admin/handles' },
    { id: 'council-compliance',       label: 'Compliance',          icon: '⚖', href: '/admin/compliance' },
    { sec: 'catalog' },
    { id: 'council-users',            label: 'Users',               icon: '◍', href: '/admin/users' },
    { id: 'council-creators',         label: 'Creators',            icon: '◐', href: '/admin/creators' },
    { id: 'council-featured-bounties', label: 'Featured bounties',  icon: '★', href: '/admin/featured-bounties' },
    { sec: 'operations' },
    { id: 'council-billing',          label: 'Billing runs',        icon: '$', href: '/admin/billing' },
    { id: 'council-payouts',          label: 'External payouts',    icon: '↗', href: '/admin/external-payouts' },
    { id: 'council-members',          label: 'Council members',     icon: '◇', href: '/admin/council' },
    { id: 'council-tiers',            label: 'Country tiers',       icon: '◉', href: '/admin/tiers' },
    { id: 'council-audit',            label: 'Audit log',           icon: '◫', href: '/admin/logs' },
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
          // Desktop: always-visible sticky column below the top bar
          'lg:sticky lg:top-12 lg:bottom-auto lg:left-auto lg:z-auto',
          'lg:translate-x-0 lg:h-[calc(100vh-3rem)]',
        ].join(' ')}
      >
      {/* Nav — internally scrollable so the role widget + user card stay pinned to the bottom */}
      <nav className="flex-1 py-1 overflow-y-auto min-h-0">
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
                const EXACT_MATCH_ROUTES = new Set(['/c', '/creator', '/admin', '/dashboard']);
                if (EXACT_MATCH_ROUTES.has(item.href)) return pathname === item.href;
                // Sub-routes: active when on the exact page OR a deeper page beneath it.
                return pathname === item.href || pathname.startsWith(item.href + '/');
              })()}
            />
          )
        )}
      </nav>

      {/* Role switcher — only renders when at least 2 roles are available, and only the
          available roles are listed. */}
      {showRoleSwitcher && (
        <>
          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Role section label */}
          <div className="px-5 pt-3 pb-1.5 font-mono text-[10px] tracking-[1.5px] uppercase text-muted/60">
            role
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
                {option}
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
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted/60">{role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="font-mono text-[9px] uppercase text-muted/50 hover:text-muted transition-colors px-1.5 py-0.5 border border-border rounded text-[8px] cursor-pointer"
        >
          out
        </button>
      </div>

      {/* Legal links — distributed evenly across the sidebar width */}
      <div className="px-5 pb-4 flex items-center justify-between">
        {([
          { href: '/about',   label: 'About' },
          { href: '/tos',     label: 'Terms' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/support', label: 'Contact' },
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
    </aside>
    </>
  );
}
