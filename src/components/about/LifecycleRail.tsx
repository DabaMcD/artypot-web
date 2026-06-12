// ── A bounty's life, in six stops ──────────────────────────────────────────────
// Horizontal rail on lg (vertical on mobile): role-colored dots, dashed
// connectors, and the actor as a micro-label — who acts when, at a glance.
const STOPS: { n: string; label: string; actor: string; dot: string; text: string }[] = [
  { n: '01', label: 'Bounty opens',          actor: 'fan',     dot: 'bg-fan',     text: 'text-fan' },
  { n: '02', label: 'Fans back it',          actor: 'fans',    dot: 'bg-fan',     text: 'text-fan' },
  { n: '03', label: 'Creator submits work',  actor: 'creator', dot: 'bg-creator', text: 'text-creator' },
  { n: '04', label: 'Council signs off',     actor: 'council', dot: 'bg-council', text: 'text-council' },
  { n: '05', label: 'Fans get charged',      actor: 'fans',    dot: 'bg-fan',     text: 'text-fan' },
  { n: '06', label: 'Creator gets paid',     actor: 'creator', dot: 'bg-creator', text: 'text-creator' },
];

export default function LifecycleRail() {
  return (
    <ol className="grid grid-cols-1 lg:grid-cols-6">
      {STOPS.map(({ n, label, actor, dot, text }, i) => {
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
                {label}
              </p>
              <p className={`font-mono text-[10px] uppercase tracking-[2px] ${text}`}>{actor}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
