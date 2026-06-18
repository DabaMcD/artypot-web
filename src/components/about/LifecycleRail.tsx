import { useTranslations } from 'next-intl';

// ── A bounty's life, in six stops ──────────────────────────────────────────────
// Horizontal rail on lg (vertical on mobile): role-colored dots, dashed
// connectors, and the actor as a micro-label — who acts when, at a glance.
// Translatable copy (label/actor) lives in the LifecycleRail namespace, keyed by `key`.
const STOPS: { n: string; key: string; dot: string; text: string }[] = [
  { n: '01', key: 'bountyOpens',    dot: 'bg-fan',     text: 'text-fan' },
  { n: '02', key: 'fansBackIt',     dot: 'bg-fan',     text: 'text-fan' },
  { n: '03', key: 'creatorSubmits', dot: 'bg-creator', text: 'text-creator' },
  { n: '04', key: 'councilSignsOff', dot: 'bg-council', text: 'text-council' },
  { n: '05', key: 'fansGetCharged', dot: 'bg-fan',     text: 'text-fan' },
  { n: '06', key: 'creatorGetsPaid', dot: 'bg-creator', text: 'text-creator' },
];

export default function LifecycleRail() {
  const t = useTranslations('LifecycleRail');
  return (
    <ol className="grid grid-cols-1 lg:grid-cols-6">
      {STOPS.map(({ n, key, dot, text }, i) => {
        const last = i === STOPS.length - 1;
        return (
          <li key={n} className="flex gap-4 lg:block">
            {/* Spine: dot + dashed connector. Vertical inside the row flex on
                mobile, horizontal across the grid column on lg. */}
            <div className="flex flex-col items-center self-stretch lg:flex-row lg:mb-4">
              <span aria-hidden className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
              {!last && (
                <span
                  aria-hidden
                  className="grow border-dashed border-border w-px border-l my-1.5 lg:w-auto lg:h-px lg:border-l-0 lg:border-t lg:my-0 lg:mx-1.5"
                />
              )}
            </div>

            <div className={`${last ? '' : 'pb-8 lg:pb-0'} lg:pr-5`}>
              <p className="font-mono text-sm font-semibold text-foreground leading-snug -mt-0.5 mb-1.5 lg:mt-0">
                <span className="text-muted mr-1.5">{n}</span>
                {t(`${key}.label`)}
              </p>
              <p className={`font-mono text-[10px] uppercase tracking-[2px] ${text}`}>{t(`${key}.actor`)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
