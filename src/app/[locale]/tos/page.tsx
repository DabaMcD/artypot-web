import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { SmoothHashLink } from '@/components/SmoothHashLink';

export const metadata = {
  title: 'Terms of Service',
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

export default function ToSPage() {
  const t = useTranslations('Tos');

  const TOC: [string, string][] = [
    ['acceptance', t('toc.acceptance')],
    ['description', t('toc.description')],
    ['accounts', t('toc.accounts')],
    ['bounties', t('toc.bounties')],
    ['backing', t('toc.backing')],
    ['creators', t('toc.creators')],
    ['council', t('toc.council')],
    ['fees', t('toc.fees')],
    ['content', t('toc.content')],
    ['ip', t('toc.ip')],
    ['termination', t('toc.termination')],
    ['disclaimer', t('toc.disclaimer')],
    ['liability', t('toc.liability')],
    ['governing', t('toc.governing')],
    ['changes', t('toc.changes')],
    ['contact', t('toc.contact')],
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
        <div className="bg-fan/5 border border-fan/30 rounded-xl p-6 mb-12">
          <p className="text-xs font-mono text-fan uppercase tracking-wider mb-3 font-semibold">{t('tldr.label')}</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.noMoneyMovesLead')}</strong>{t('tldr.noMoneyMovesRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.backOutLead')}</strong>{t('tldr.backOutRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.finalLead')}</strong>{t('tldr.finalRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.feeLead')}</strong>{t('tldr.feeRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.globalLead')}</strong>{t('tldr.globalRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.neverLead')}</strong>{t('tldr.neverRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.notPurchaseLead')}</strong>{t('tldr.notPurchaseRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✗</span><span><strong>{t('tldr.noOfficialLead')}</strong>{t('tldr.noOfficialRest')}</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>{t('tldr.allAgesLead')}</strong>{t('tldr.allAgesRest')}</span></li>
          </ul>
          <p className="text-xs text-muted mt-4">{t('tldr.disclaimer')}</p>
        </div>

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">{t('toc.heading')}</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <SmoothHashLink href={`#${id}`} className="hover:text-foreground transition-colors">{label}</SmoothHashLink>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="acceptance" title={t('sections.acceptance.title')}>
            <p>{t('sections.acceptance.p1')}</p>
            <p>{t('sections.acceptance.p2')}</p>
          </Section>

          <Section id="description" title={t('sections.description.title')}>
            <p>{t('sections.description.p1')}</p>
            <p>{t('sections.description.p2')}</p>
          </Section>

          <Section id="accounts" title={t('sections.accounts.title')}>
            <p>{t('sections.accounts.p1')}</p>
            <p>{t('sections.accounts.p2')}</p>
            <p>{t('sections.accounts.p3')}</p>
          </Section>

          <Section id="bounties" title={t('sections.bounties.title')}>
            <p>{t('sections.bounties.p1')}</p>
            <p>{t('sections.bounties.p2')}</p>
            <p><strong className="text-foreground">{t('sections.bounties.p3Lead')}</strong>{t('sections.bounties.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.bounties.p4Lead')}</strong>{t('sections.bounties.p4Rest')}</p>
            <p>{t('sections.bounties.p5')}</p>
            <p>{t('sections.bounties.p6')}</p>
          </Section>

          <Section id="backing" title={t('sections.backing.title')}>
            <p><strong className="text-foreground">{t('sections.backing.p1Lead')}</strong>{t('sections.backing.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.backing.p2Lead')}</strong>{t('sections.backing.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.backing.p3Lead')}</strong>{t('sections.backing.p3Rest')}</p>
            <p><strong className="text-foreground">{t('sections.backing.p4Lead')}</strong>{t('sections.backing.p4a')}<strong className="text-foreground">{t('sections.backing.p4Locked')}</strong>{t('sections.backing.p4b')}<strong className="text-foreground">{t('sections.backing.p4Final')}</strong>{t('sections.backing.p4c')}<Link href="/support" className="text-fan hover:underline">{t('sections.backing.contactSupport')}</Link>{t('sections.backing.p4d')}</p>
            <p><strong className="text-foreground">{t('sections.backing.p5Lead')}</strong>{t('sections.backing.p5Rest')}</p>
            <p><strong className="text-foreground">{t('sections.backing.p6Lead')}</strong>{t('sections.backing.p6a')}<Link href="/backings" className="text-fan hover:underline">{t('sections.backing.backingsPage')}</Link>{t('sections.backing.p6b')}<a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>{t('sections.backing.p6c')}<strong className="text-foreground">{t('sections.backing.p6Bold')}</strong>{t('sections.backing.p6d')}</p>
            <p>{t('sections.backing.p7a')}<a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-fan hover:underline">{t('sections.backing.stripeTos')}</a>{t('sections.backing.p7b')}</p>
            <p>{t('sections.backing.p8')}</p>
          </Section>

          <Section id="creators" title={t('sections.creators.title')}>
            <p>{t('sections.creators.p1')}</p>
            <p>{t('sections.creators.p2')}</p>
            <p>{t('sections.creators.p3')}</p>
          </Section>

          <Section id="council" title={t('sections.council.title')}>
            <p>{t('sections.council.p1')}</p>
            <p>{t('sections.council.p2')}</p>
            <p>{t('sections.council.p3')}</p>
          </Section>

          <Section id="fees" title={t('sections.fees.title')}>
            <p>{t('sections.fees.p1a')}<strong className="text-foreground">{t('sections.fees.p1Bold')}</strong>{t('sections.fees.p1b')}</p>
            <p>{t('sections.fees.p2')}</p>
            <p>{t('sections.fees.p3')}</p>
          </Section>

          <Section id="content" title={t('sections.content.title')}>
            <p><strong className="text-foreground">{t('sections.content.p1Lead')}</strong>{t('sections.content.p1Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p2Lead')}</strong>{t('sections.content.p2Rest')}</p>
            <p><strong className="text-foreground">{t('sections.content.p3Lead')}</strong>{t('sections.content.p3Rest')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>{t('sections.content.item1')}</li>
              <li>{t('sections.content.item2')}</li>
              <li>{t('sections.content.item3')}</li>
              <li>{t('sections.content.item4')}</li>
            </ul>
            <p>{t('sections.content.p4')}</p>
          </Section>

          <Section id="ip" title={t('sections.ip.title')}>
            <p>{t('sections.ip.p1')}</p>
            <p>{t('sections.ip.p2')}</p>
            <p>{t('sections.ip.p3')}</p>
          </Section>

          <Section id="termination" title={t('sections.termination.title')}>
            <p>{t('sections.termination.p1')}</p>
            <p>{t('sections.termination.p2')}</p>
          </Section>

          <Section id="disclaimer" title={t('sections.disclaimer.title')}>
            <p>{t('sections.disclaimer.p1')}</p>
            <p>{t('sections.disclaimer.p2')}</p>
          </Section>

          <Section id="liability" title={t('sections.liability.title')}>
            <p>{t('sections.liability.p1')}</p>
            <p>{t('sections.liability.p2')}</p>
          </Section>

          <Section id="governing" title={t('sections.governing.title')}>
            <p>{t('sections.governing.p1')}</p>
            <p>{t('sections.governing.p2')}</p>
          </Section>

          <Section id="changes" title={t('sections.changes.title')}>
            <p>{t('sections.changes.p1')}</p>
            <p>{t('sections.changes.p2')}</p>
          </Section>

          <Section id="contact" title={t('sections.contact.title')}>
            <p>
              {t('sections.contact.question')}{' '}
              <Link href="/support" className="text-fan hover:underline">{t('sections.contact.contactLink')}</Link>{' '}
              {t('sections.contact.orEmail')}{' '}
              <a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
