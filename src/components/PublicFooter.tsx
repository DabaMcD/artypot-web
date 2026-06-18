import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

/**
 * Public footer shown on every page when the viewer is not logged in.
 * Mirrors the footer originally inlined on the marketing homepage.
 */
export function PublicFooter() {
  const t = useTranslations('Common');
  return (
    <footer className="border-t border-border px-4 py-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-muted text-sm font-sans">© 2026 Artypot LLC</p>
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
          <Link href="/about" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            {t('legal.about')}
          </Link>
          <Link href="/tos" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            {t('legal.terms')}
          </Link>
          <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            {t('legal.privacy')}
          </Link>
          <Link href="/support" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            {t('legal.contact')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
