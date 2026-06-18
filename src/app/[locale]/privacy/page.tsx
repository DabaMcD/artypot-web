import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { SmoothHashLink } from '@/components/SmoothHashLink';

export const metadata = {
  title: 'Privacy Policy',
};

const LAST_UPDATED = 'April 11, 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-10 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-base text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const t = useTranslations('Privacy');

  const toc: [string, string][] = [
    ['controller', t('sections.controller.title')],
    ['collected', t('sections.collected.title')],
    ['how-used', t('sections.howUsed.title')],
    ['sharing', t('sections.sharing.title')],
    ['payments', t('sections.payments.title')],
    ['retention', t('sections.retention.title')],
    ['rights', t('sections.rights.title')],
    ['cookies', t('sections.cookies.title')],
    ['children', t('sections.children.title')],
    ['international', t('sections.international.title')],
    ['changes', t('sections.changes.title')],
    ['contact', t('sections.contact.title')],
  ];

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">{t('hero.eyebrow')}</p>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">{t('hero.title')}</h1>
          <p className="text-sm text-muted">{t('hero.lastUpdated', { date: LAST_UPDATED })}</p>
        </div>

        {/* TL;DR */}
        <div className="bg-creator/5 border border-creator/30 rounded-xl p-6 mb-12">
          <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3 font-semibold">{t('tldr.eyebrow')}</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.collect.bold')}</strong> {t('tldr.collect.rest')}</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.noSell.bold')}</strong> {t('tldr.noSell.rest')}</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.stripe.bold')}</strong> {t('tldr.stripe.rest')}</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.private.bold')}</strong> {t('tldr.private.rest')}</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.delete.bold')}</strong> {t('tldr.delete.rest')}</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.cookies.bold')}</strong> {t('tldr.cookies.rest')}</span></li>
          </ul>
          <p className="text-xs text-muted mt-4">{t('tldr.disclaimer')}</p>
        </div>

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">{t('toc.heading')}</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {toc.map(([id, label]) => (
              <li key={id}>
                <SmoothHashLink href={`#${id}`} className="hover:text-foreground transition-colors">{label}</SmoothHashLink>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="controller" title={t('sections.controller.title')}>
            <p>
              {t('sections.controller.body')}{' '}
              <a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

          <Section id="collected" title={t('sections.collected.title')}>
            <p><strong className="text-foreground">{t('sections.collected.account.label')}</strong> {t('sections.collected.account.body')}</p>
            <p><strong className="text-foreground">{t('sections.collected.financial.label')}</strong> {t('sections.collected.financial.body')}</p>
            <p><strong className="text-foreground">{t('sections.collected.activity.label')}</strong> {t('sections.collected.activity.body')}</p>
            <p><strong className="text-foreground">{t('sections.collected.usage.label')}</strong> {t('sections.collected.usage.body')}</p>
            <p><strong className="text-foreground">{t('sections.collected.comms.label')}</strong> {t('sections.collected.comms.body')}</p>
          </Section>

          <Section id="how-used" title={t('sections.howUsed.title')}>
            <p>{t('sections.howUsed.intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>{t('sections.howUsed.item1')}</li>
              <li>{t('sections.howUsed.item2')}</li>
              <li>{t('sections.howUsed.item3')}</li>
              <li>{t('sections.howUsed.item4')}</li>
              <li>{t('sections.howUsed.item5')}</li>
            </ul>
            <p>{t('sections.howUsed.outro')}</p>
          </Section>

          <Section id="sharing" title={t('sections.sharing.title')}>
            <p>{t('sections.sharing.intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Stripe</strong> — {t('sections.sharing.stripe')}</li>
              <li><strong className="text-foreground">Stripe Connect</strong> — {t('sections.sharing.stripeConnect')}</li>
              <li><strong className="text-foreground">TaxBandits / similar</strong> — {t('sections.sharing.taxbandits')}</li>
              <li><strong className="text-foreground">{t('sections.sharing.emailLabel')}</strong> — {t('sections.sharing.email')}</li>
              <li><strong className="text-foreground">{t('sections.sharing.hostingLabel')}</strong> — {t('sections.sharing.hosting')}</li>
            </ul>
            <p>{t('sections.sharing.dpa')}</p>
            <p>{t('sections.sharing.legal')}</p>
          </Section>

          <Section id="payments" title={t('sections.payments.title')}>
            <p>{t('sections.payments.p1')}</p>
            <p>{t('sections.payments.p2')}</p>
            <p>{t('sections.payments.p3pre')} <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-fan hover:underline">{t('sections.payments.p3link')}</a>.</p>
            <p>{t('sections.payments.p4')}</p>
          </Section>

          <Section id="retention" title={t('sections.retention.title')}>
            <p>{t('sections.retention.p1')}</p>
            <p>{t('sections.retention.p2')}</p>
            <p>{t('sections.retention.p3')}</p>
          </Section>

          <Section id="rights" title={t('sections.rights.title')}>
            <p>{t('sections.rights.intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">{t('sections.rights.access.label')}</strong> — {t('sections.rights.access.body')}</li>
              <li><strong className="text-foreground">{t('sections.rights.correct.label')}</strong> — {t('sections.rights.correct.body')}</li>
              <li><strong className="text-foreground">{t('sections.rights.delete.label')}</strong> — {t('sections.rights.delete.body')} — <Link href="/privacy/delete-account" className="text-fan hover:underline">{t('sections.rights.delete.link')}</Link></li>
              <li><strong className="text-foreground">{t('sections.rights.portability.label')}</strong> — {t('sections.rights.portability.body')}</li>
              <li><strong className="text-foreground">{t('sections.rights.object.label')}</strong> — {t('sections.rights.object.body')}</li>
            </ul>
            <p>
              {t('sections.rights.exercisePre')}{' '}
              <Link href="/support" className="text-fan hover:underline">{t('sections.rights.contactLink')}</Link>{' '}
              {t('sections.rights.exerciseMid')}{' '}
              <a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>.
              {' '}{t('sections.rights.exercisePost')}
            </p>
            <p>{t('sections.rights.regional')}</p>
          </Section>

          <Section id="cookies" title={t('sections.cookies.title')}>
            <p>{t('sections.cookies.intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">{t('sections.cookies.auth.label')}</strong> — {t('sections.cookies.auth.body')}</li>
              <li><strong className="text-foreground">{t('sections.cookies.stripe.label')}</strong> — {t('sections.cookies.stripe.body')}</li>
            </ul>
            <p>{t('sections.cookies.noTracking')}</p>
          </Section>

          <Section id="children" title={t('sections.children.title')}>
            <p>{t('sections.children.body')}</p>
          </Section>

          <Section id="international" title={t('sections.international.title')}>
            <p>{t('sections.international.p1')}</p>
            <p>{t('sections.international.p2')}</p>
          </Section>

          <Section id="changes" title={t('sections.changes.title')}>
            <p>{t('sections.changes.body')}</p>
          </Section>

          <Section id="contact" title={t('sections.contact.title')}>
            <p>
              {t('sections.contact.pre')}{' '}
              <Link href="/support" className="text-fan hover:underline">{t('sections.contact.link')}</Link>{' '}
              {t('sections.contact.mid')}{' '}
              <a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
