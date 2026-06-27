// Hand-rolled SVG mini-charts for the admin/council dashboards (no chart lib in
// the codebase). `currentColor` resolves to the role accent set on the wrapper
// (`var(--color-role)`), so both match the surrounding theme. Shared by the
// command-center dashboard and the activation-funnel page.

/** Vertical bars for a short series (e.g. daily signups, weekly retention %). */
export function MiniBars({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const W = 300, H = 64, GAP = 5;
  const bw = (W - GAP * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ color: 'var(--color-role)', height: 64 }} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = v > 0 ? Math.max(2, (v / max) * H) : 0;
        return <rect key={i} x={i * (bw + GAP)} y={H - h} width={bw} height={h} rx={1} fill="currentColor" opacity={0.85} />;
      })}
    </svg>
  );
}

/** Filled line for a trend series. */
export function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const W = 300, H = 64, n = data.length;
  const pts = data.map((v, i) => [n === 1 ? 0 : (i / (n - 1)) * W, H - (v / max) * (H - 6) - 3] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ color: 'var(--color-role)', height: 64 }} preserveAspectRatio="none">
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="currentColor" opacity={0.12} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
