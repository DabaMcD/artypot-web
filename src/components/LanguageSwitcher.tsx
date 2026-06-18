'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, routing, type Locale } from '@/i18n/routing';
import { Select, FieldLabel, FieldHint } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';
import { users } from '@/lib/api';

/**
 * Each language is labelled in its OWN tongue (Español, not Spanish) so a user
 * can always find theirs without already being able to read the current UI
 * language. Extend this map when a locale is added to routing.ts.
 */
const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  eo: 'Esperanto',
  'en-x-brainrot': '🧠 Brainrot 🥀',
};

interface Props {
  /** 'header' — compact, for the public header / auth pages. 'settings' — full
   *  FieldLabel + hint, for the /settings Language section. */
  variant: 'header' | 'settings';
}

export function LanguageSwitcher({ variant }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { user } = useAuth();
  const t = useTranslations('Settings');
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === currentLocale) return;
    // `pathname` is locale-stripped (it comes from @/i18n/routing), so passing
    // the target locale rebuilds the prefixed URL for the same page.
    startTransition(() => {
      router.replace(pathname, { locale: next as Locale });
    });
    // Logged-in users: persist to their account. Fire-and-forget — the URL has
    // already switched, and a failed save simply retries on the next change.
    if (user) {
      users.update(user.id, { preferred_locale: next }).catch(() => {});
    }
  };

  const options = routing.locales.map((l) => (
    <option key={l} value={l}>
      {LOCALE_LABELS[l] ?? l}
    </option>
  ));

  if (variant === 'header') {
    return (
      <div className="w-32 shrink-0">
        <Select
          mono
          value={currentLocale}
          onChange={(e) => switchTo(e.target.value)}
          disabled={isPending}
          aria-label={t('language.label')}
        >
          {options}
        </Select>
      </div>
    );
  }

  // 'settings'
  return (
    <div>
      <FieldLabel>{t('language.label')}</FieldLabel>
      <Select
        value={currentLocale}
        onChange={(e) => switchTo(e.target.value)}
        disabled={isPending}
      >
        {options}
      </Select>
      <FieldHint>{t('language.hint')}</FieldHint>
    </div>
  );
}
