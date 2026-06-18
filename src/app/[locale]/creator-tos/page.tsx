import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import CreatorTosTldr from '@/components/CreatorTosTldr';

export const metadata = {
  title: 'Creator Terms of Service',
};

const LAST_UPDATED = 'June 11, 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-10 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-base text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function CreatorToSPage() {
  const t = useTranslations('CreatorTos');

  const TOC: [string, string][] = [
    ['commitments', t('toc.commitments')],
    ['role', t('toc.role')],
    ['payouts', t('toc.payouts')],
    ['refunds', t('toc.refunds')],
    ['content', t('toc.content')],
    ['termination', t('toc.termination')],
    ['disclaimer', t('toc.disclaimer')],
    ['governing', t('toc.governing')],
    ['misc', t('toc.misc')],
  ];

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">{t('hero.eyebrow')}</p>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">{t('hero.title')}</h1>
          <p className="text-sm text-muted">{t('hero.lastUpdated', { date: LAST_UPDATED })}</p>
          <p className="text-sm text-muted mt-3">
            {t('hero.supplementA')}{' '}
            <Link href="/tos" className="text-creator hover:underline">{t('hero.generalTosLink')}</Link>{' '}
            {t('hero.supplementB')}
          </p>
        </div>

        {/* TL;DR */}
        <CreatorTosTldr className="mb-12" />

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">{t('toc.heading')}</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-foreground transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="commitments" title={t('sections.commitments.title')}>
            <p>{t('sections.commitments.p0')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p1Lead')}</strong>{t('sections.commitments.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p2Lead')}</strong>{t('sections.commitments.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p3Lead')}</strong>{t('sections.commitments.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p4Lead')}</strong>{t('sections.commitments.p4Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p5Lead')}</strong>{t('sections.commitments.p5Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p6Lead')}</strong>{t('sections.commitments.p6Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p7Lead')}</strong>{t('sections.commitments.p7Rest')}</p>
            <p><strong className="text-foreground">{t('sections.commitments.p8Lead')}</strong>{t('sections.commitments.p8Rest')}</p>
          </Section>

          <Section id="role" title={t('sections.role.title')}>
            <p><strong className="text-foreground">{t('sections.role.p1Lead')}</strong>{t('sections.role.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.role.p2Lead')}</strong>{t('sections.role.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.role.p3Lead')}</strong>{t('sections.role.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.role.p4Lead')}</strong>{t('sections.role.p4Rest')}</p>
          </Section>

          <Section id="payouts" title={t('sections.payouts.title')}>
            <p><strong className="text-foreground">{t('sections.payouts.p1Lead')}</strong>{t('sections.payouts.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.payouts.p2Lead')}</strong>{t('sections.payouts.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.payouts.p3Lead')}</strong>{t('sections.payouts.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.payouts.p4Lead')}</strong>{t('sections.payouts.p4Rest')}</p>
            <p><strong className="text-foreground">{t('sections.payouts.p5Lead')}</strong>{t('sections.payouts.p5Rest')}</p>
          </Section>

          <Section id="refunds" title={t('sections.refunds.title')}>
            <p><strong className="text-foreground">{t('sections.refunds.p1Lead')}</strong>{t('sections.refunds.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p2Lead')}</strong>{t('sections.refunds.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p3Lead')}</strong>{t('sections.refunds.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p4Lead')}</strong>{t('sections.refunds.p4Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p5Lead')}</strong>{t('sections.refunds.p5a')}<a href="mailto:support@artypot.com" className="text-creator hover:underline">support@artypot.com</a>{t('sections.refunds.p5b')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p6Lead')}</strong>{t('sections.refunds.p6Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p7Lead')}</strong>{t('sections.refunds.p7Rest')}</p>
            <p><strong className="text-foreground">{t('sections.refunds.p8Lead')}</strong>{t('sections.refunds.p8Rest')}</p>
          </Section>

          <Section id="content" title={t('sections.content.title')}>
            <p><strong className="text-foreground">{t('sections.content.p1Lead')}</strong>{t('sections.content.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p2Lead')}</strong>{t('sections.content.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p3Lead')}</strong>{t('sections.content.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p4Lead')}</strong>{t('sections.content.p4Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p5Lead')}</strong>{t('sections.content.p5Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p6Lead')}</strong>{t('sections.content.p6Rest')}</p>
          </Section>

          <Section id="termination" title={t('sections.termination.title')}>
            <p><strong className="text-foreground">{t('sections.termination.p1Lead')}</strong>{t('sections.termination.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.termination.p2Lead')}</strong>{t('sections.termination.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.termination.p3Lead')}</strong>{t('sections.termination.p3Rest')}</p>
          </Section>

          <Section id="disclaimer" title={t('sections.disclaimer.title')}>
            <p><strong className="text-foreground">{t('sections.disclaimer.p1Lead')}</strong>{t('sections.disclaimer.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.disclaimer.p2Lead')}</strong>{t('sections.disclaimer.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.disclaimer.p3Lead')}</strong>{t('sections.disclaimer.p3Rest')}</p>
          </Section>

          <Section id="governing" title={t('sections.governing.title')}>
            <p><strong className="text-foreground">{t('sections.governing.p1Lead')}</strong>{t('sections.governing.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.governing.p2Lead')}</strong>{t('sections.governing.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.governing.p3Lead')}</strong>{t('sections.governing.p3Rest')}</p>
          </Section>

          <Section id="misc" title={t('sections.misc.title')}>
            <p><strong className="text-foreground">{t('sections.misc.p1Lead')}</strong>{t('sections.misc.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.misc.p2Lead')}</strong>{t('sections.misc.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.misc.p3Lead')}</strong>{t('sections.misc.p3a')}
              <Link href="/tos" className="text-creator hover:underline">{t('sections.misc.generalTosLink')}</Link>{' '}
              {t('sections.misc.p3b')}{' '}
              <Link href="/privacy" className="text-creator hover:underline">{t('sections.misc.privacyLink')}</Link>{t('sections.misc.p3c')}</p>
            <p className="pt-4">
              {t('sections.misc.questions')}{' '}
              <a href="mailto:legal@artypot.com" className="text-creator hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
