'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, routing, type Locale } from '@/i18n/routing';
import { FieldLabel, FieldHint } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';
import { users } from '@/lib/api';

/** Each language labelled in its own tongue (the flag carries the icon). */
const ENDONYMS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  eo: 'Esperanto',
  'en-x-brainrot': 'Brainrot 🥀',
};

/** The recognized flag for a locale. Esperanto has no emoji flag, so its
 *  "verda stelo" (green field, white canton, green star) is drawn inline. */
function Flag({ locale, className = '' }: { locale: string; className?: string }) {
  if (locale === 'eo') {
    return (
      <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true" className={`inline-block rounded-[2px] ${className}`}>
        <rect width="20" height="14" fill="#2f9e44" />
        <rect width="8" height="8" fill="#fff" />
        <text x="4" y="4.2" fontSize="7" textAnchor="middle" dominantBaseline="central" fill="#2f9e44">★</text>
      </svg>
    );
  }
  const emoji: Record<string, string> = { en: '🇺🇸', es: '🇪🇸', 'en-x-brainrot': '🧠' };
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center leading-none text-base ${className}`}>
      {emoji[locale] ?? '🏳️'}
    </span>
  );
}

interface Props {
  /** 'header' — compact flag button (public header / auth pages).
   *  'settings' — labelled field with a wider flag+endonym button. */
  variant: 'header' | 'settings';
}

export function LanguageSwitcher({ variant }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { user } = useAuth();
  const t = useTranslations('Settings');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const switchTo = (next: string) => {
    setOpen(false);
    if (next === currentLocale) return;
    // `pathname` is locale-stripped (from @/i18n/routing); passing the target
    // locale rebuilds the prefixed URL for the same page and sets NEXT_LOCALE.
    startTransition(() => {
      router.replace(pathname, { locale: next as Locale });
    });
    // Logged-in: persist to the account (fire-and-forget — the URL already switched).
    if (user) users.update(user.id, { preferred_locale: next }).catch(() => {});
  };

  const items = routing.locales.map((l) => (
    <li key={l} role="option" aria-selected={l === currentLocale}>
      <button
        type="button"
        onClick={() => switchTo(l)}
        disabled={isPending}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
          l === currentLocale
            ? 'bg-surface-2 text-foreground'
            : 'text-muted hover:bg-surface-2 hover:text-foreground'
        }`}
      >
        <Flag locale={l} className="w-5 shrink-0" />
        <span className="flex-1 truncate">{ENDONYMS[l] ?? l}</span>
        {l === currentLocale && <span className="text-[var(--color-role)] text-xs">✓</span>}
      </button>
    </li>
  ));

  const chevron = (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
    >
      <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (variant === 'header') {
    return (
      <div ref={ref} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('language.label')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <Flag locale={currentLocale} className="w-5" />
          {chevron}
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] py-1 bg-surface border border-border rounded-md shadow-[3px_3px_0_var(--color-border)] overflow-hidden"
          >
            {items}
          </ul>
        )}
      </div>
    );
  }

  // settings
  return (
    <div>
      <FieldLabel>{t('language.label')}</FieldLabel>
      <div ref={ref} className="relative max-w-xs">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-background border border-border rounded text-foreground text-base focus:outline-none focus:border-[var(--color-role)] transition-colors"
        >
          <Flag locale={currentLocale} className="w-5 shrink-0" />
          <span className="flex-1 text-left truncate">{ENDONYMS[currentLocale] ?? currentLocale}</span>
          {chevron}
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute left-0 top-full mt-1.5 z-50 w-full py-1 bg-surface border border-border rounded-md shadow-[3px_3px_0_var(--color-border)] overflow-hidden"
          >
            {items}
          </ul>
        )}
      </div>
      <FieldHint>{t('language.hint')}</FieldHint>
    </div>
  );
}
