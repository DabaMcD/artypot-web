import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export const metadata = {
  title: 'How to Delete Your Account',
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center font-mono text-sm text-muted font-semibold">
        {n}
      </div>
      <div className="pt-0.5 pb-8 border-b border-border w-full last:border-0 last:pb-0">
        <p className="font-semibold text-foreground mb-1.5">{title}</p>
        <div className="text-base text-muted leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  const t = useTranslations('DeleteAccount');

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t('breadcrumb.privacy')}</Link>
          <span className="mx-2 text-muted/40">/</span>
          {t('breadcrumb.current')}
        </p>

        {/* Header */}
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">
          {t('heading')}
        </h1>
        <p className="text-base text-muted mb-10 leading-relaxed">
          {t('intro')}
        </p>

        {/* What happens box */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-12 space-y-3 text-sm text-muted leading-relaxed">
          <p className="font-semibold text-foreground text-base">{t('whatHappens.title')}</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>{t('whatHappens.backings')}</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>{t('whatHappens.profile')}</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>{t('whatHappens.loggedOut')}</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>{t('whatHappens.creator')}</span></li>
            <li className="flex gap-2"><span className="text-muted/40 shrink-0 mt-0.5">○</span><span>{t('whatHappens.financialRecords')}</span></li>
            <li className="flex gap-2"><span className="text-muted/40 shrink-0 mt-0.5">○</span><span>{t('whatHappens.emailReuse')}</span></li>
          </ul>
          <p className="text-xs text-muted/60 pt-1">
            {t('whatHappens.permanentLead')}{' '}
            <Link href="/support" className="hover:text-foreground transition-colors underline">{t('whatHappens.contactSupport')}</Link>{' '}
            {t('whatHappens.beforeDeleting')}
          </p>
        </div>

        {/* Steps */}
        <div className="mb-12">
          <Step n={1} title={t('steps.login.title')}>
            <p>
              {t('steps.login.go')}{' '}
              <Link href="/login" className="text-fan hover:underline">artypot.com/login</Link>{' '}
              {t('steps.login.signIn')}
            </p>
          </Step>

          <Step n={2} title={t('steps.settings.title')}>
            <p>
              {t('steps.settings.once')} <strong className="text-foreground">{t('steps.settings.settingsLabel')}</strong> {t('steps.settings.sidebar')}
            </p>
            <p>
              {t('steps.settings.direct')}{' '}
              <Link href="/settings" className="text-fan hover:underline">artypot.com/settings</Link>.
            </p>
          </Step>

          <Step n={3} title={t('steps.dangerZone.title')}>
            <p>
              {t('steps.dangerZone.scrollLead')}{' '}
              <span className="font-mono text-bad text-sm bg-bad/10 px-1.5 py-0.5 rounded">{t('steps.dangerZone.label')}</span>{' '}
              {t('steps.dangerZone.scrollTrail')}
            </p>
          </Step>

          <Step n={4} title={t('steps.clickDelete.title')}>
            <p>
              {t('steps.clickDelete.findLead')} <strong className="text-foreground">{t('steps.clickDelete.rowLabel')}</strong> {t('steps.clickDelete.clickMid')}{' '}
              <strong className="text-foreground">{t('steps.clickDelete.buttonLabel')}</strong> {t('steps.clickDelete.findTrail')}
            </p>
          </Step>

          <Step n={5} title={t('steps.confirm.title')}>
            <p>
              {t('steps.confirm.readLead')}{' '}
              <strong className="text-foreground">{t('steps.confirm.confirmLabel')}</strong>{t('steps.confirm.readTrail')}
            </p>
          </Step>
        </div>

        {/* Can't log in? */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <p className="font-semibold text-foreground mb-2">{t('cantLogin.title')}</p>
          <p className="text-sm text-muted leading-relaxed">
            {t('cantLogin.lead')}{' '}
            <Link href="/support" className="text-fan hover:underline">{t('cantLogin.contactUs')}</Link>{' '}
            {t('cantLogin.orEmail')}{' '}
            <a href="mailto:support@artypot.com" className="text-fan hover:underline">support@artypot.com</a>.
            {' '}{t('cantLogin.trail')}
          </p>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
          <Link href="/support" className="hover:text-foreground transition-colors">{t('footer.support')}</Link>
          <Link href="/tos" className="hover:text-foreground transition-colors">{t('footer.tos')}</Link>
        </div>

      </div>
    </div>
  );
}
