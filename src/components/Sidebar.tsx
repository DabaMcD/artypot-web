'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <div className="px-5 pt-5 pb-1.5 font-mono text-[10px] tracking-[1.5px] uppercase text-muted/60">
      {title}
    </div>
  );
}

function NavItem({ item, active }: { item: NavItem; active: boolean }) {
  if (!item.href) return null;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-5 py-[7px] font-display text-sm border-l-[3px] transition-colors ${
        active
          ? 'ap-nav-active bg-surface-2 text-foreground border-l-[var(--color-role)]'
          : 'border-l-transparent text-muted hover:bg-surface hover:text-foreground'
      }`}
    >
      <span className={`ap-nav-ic w-9 h-9 flex items-center justify-center text-2xl ${active ? '' : 'text-muted/60'}`}>
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
}

export function Sidebar({ role, pathname }: SidebarProps) {
  const { user, logout } = useAuth();
  const { mode, canSwitch, switchTo } = useViewMode();
  const router = useRouter();

  const fanItems: NavItem[] = [
    { sec: 'discover' },
    { id: 'fan-home',     label: 'My contributions',   icon: '◐', href: '/dashboard' },
    { id: 'fan-create',   label: 'Start a bounty',     icon: '+', href: '/bounties/new' },
    { id: 'fan-search',   label: 'Search creators',    icon: '⌕', href: '/creators' },
    { sec: 'money' },
    { id: 'fan-billing',  label: 'Upcoming charge',    icon: '$', href: '/billing' },
    { id: 'fan-history',  label: 'History & receipts', icon: '⌗', href: '/pledges' },
    { sec: 'account' },
    { id: 'fan-settings', label: 'Settings',           icon: '⚙', href: '/settings' },
    { id: 'fan-become',   label: 'Become a creator',   icon: '✦', href: '/become-creator' },
  ];

  const creatorItems: NavItem[] = [
    { sec: 'overview' },
    { id: 'creator-dashboard',  label: 'Dashboard',          icon: '◐', href: '/sanctum' },
    { id: 'creator-onboarding', label: 'Setup',              icon: '◔', href: '/sanctum/setup' },
    { sec: 'work' },
    { id: 'creator-bounties',   label: 'Active bounties',    icon: '◇', href: '/sanctum/bounties' },
    { id: 'creator-queue',      label: 'Queued for me',      icon: '⌗', href: '/sanctum/queue' },
    { id: 'creator-mine',       label: 'My own bounties',    icon: '★', href: '/sanctum/my-bounties' },
    { sec: 'money' },
    { id: 'creator-balance',    label: 'Balance',            icon: '$', href: '/sanctum/balance' },
    { id: 'creator-withdraw',   label: 'Withdraw',           icon: '↓', href: '/sanctum/withdraw' },
    { id: 'creator-ledger',     label: 'Ledger',             icon: '⌗', href: '/sanctum/ledger' },
    { sec: 'admin' },
    { id: 'creator-handles',    label: 'Handles',            icon: '@', href: '/sanctum/handles' },
    { id: 'creator-tax',        label: 'Tax & compliance',   icon: '⚖', href: '/sanctum/tax' },
    { id: 'creator-settings',   label: 'Settings',           icon: '⚙', href: '/sanctum/settings' },
  ];

  const councilItems: NavItem[] = [
    { sec: 'queues' },
    { id: 'council-completions', label: 'Completion review',   icon: '✓', href: '/admin/completions' },
    { id: 'council-handles',     label: 'Handle verification', icon: '@', href: '/admin/claims' },
    { id: 'council-ofac',        label: 'OFAC review',         icon: '!', href: '/admin/ofac' },
    { sec: 'operations' },
    { id: 'council-billing',     label: 'Billing runs',        icon: '$', href: '/admin' },
    { id: 'council-tiers',       label: 'Country tiers',       icon: '◉', href: '/admin/tiers' },
    { id: 'council-audit',       label: 'Audit log',           icon: '◫', href: '/admin/logs' },
  ];

  const items = role === 'council' ? councilItems : role === 'creator' ? creatorItems : fanItems;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-surface border-r border-border sticky top-0 h-screen overflow-y-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5 border-b border-border">
        <Link href="/dashboard">
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={1024}
            height={269}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted/40 ml-auto">v1</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1">
        {items.map((item, i) =>
          item.sec ? (
            <NavSection key={`s-${i}`} title={item.sec} />
          ) : (
            <NavItem
              key={item.id}
              item={item}
              active={item.href ? (item.href === '/sanctum' ? pathname === '/sanctum' : pathname.startsWith(item.href) && item.href !== '/dashboard' ? pathname === item.href || pathname.startsWith(item.href + '/') : pathname === item.href) : false}
            />
          )
        )}
      </nav>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Role section label */}
      <div className="px-5 pt-3 pb-1.5 font-mono text-[10px] tracking-[1.5px] uppercase text-muted/60">
        role
      </div>

      {/* Role switcher */}
      <div className="flex mx-5 border border-border rounded overflow-hidden bg-background text-[9px]">
        <button
          className={`flex-1 py-[7px] font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer ${
            role === 'fan' ? 'ap-role-active' : 'text-muted hover:bg-surface hover:text-foreground'
          }`}
          onClick={() => { switchTo('fan'); router.push('/dashboard'); }}
        >
          fan
        </button>
        <button
          className={`flex-1 py-[7px] font-mono text-[9px] uppercase tracking-wider border-l border-r border-border transition-colors ${
            role === 'creator' ? 'ap-role-active' : canSwitch ? 'text-muted hover:bg-surface hover:text-foreground cursor-pointer' : 'text-muted/30 cursor-not-allowed'
          }`}
          onClick={() => { if (canSwitch) { switchTo('creator'); router.push('/sanctum'); } }}
          disabled={!canSwitch}
        >
          creator
        </button>
        <button
          className={`flex-1 py-[7px] font-mono text-[9px] uppercase tracking-wider transition-colors ${
            role === 'council' ? 'ap-role-active' : user?.role === 'council' ? 'text-muted hover:bg-surface hover:text-foreground cursor-pointer' : 'text-muted/30 cursor-not-allowed'
          }`}
          onClick={() => { if (user?.role === 'council') router.push('/admin'); }}
          disabled={user?.role !== 'council'}
        >
          council
        </button>
      </div>

      {/* User card */}
      <div className="mx-5 mt-3 mb-4 p-2.5 bg-background border border-border rounded flex items-center gap-2.5">
        <Avatar
          initials={user?.display_name?.charAt(0).toUpperCase()}
          size="sm"
          style={role === 'fan'
            ? { background: 'var(--color-fan)', color: 'var(--color-background)' }
            : role === 'creator'
            ? { background: 'var(--color-creator)', color: 'var(--color-background)' }
            : { background: 'var(--color-council)', color: 'var(--color-brand-light)' }
          }
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{user?.display_name}</div>
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted/60">{role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="font-mono text-[9px] uppercase text-muted/50 hover:text-muted transition-colors px-1.5 py-0.5 border border-border rounded text-[8px] cursor-pointer"
        >
          out
        </button>
      </div>
    </aside>
  );
}
