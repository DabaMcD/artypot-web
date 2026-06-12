import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Artypot bounty';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * The viral object: when a bounty link unfurls on X/Discord/Reddit/iMessage,
 * this card leads with the pot. Big number, bounty title, target creator,
 * Artypot wordmark — on the site's dark theme.
 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let pot = '$0';
  let title = 'A bounty on Artypot';
  let handle: string | null = null;
  let backerCount = 0;

  try {
    const res = await fetch(`${API_BASE}/bounties/${id}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      const bounty = json?.data;
      if (bounty) {
        pot = Number(bounty.total_backed ?? 0).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        title = bounty.title ?? title;
        handle = bounty.target_handle?.username
          ? `@${bounty.target_handle.username}`
          : (bounty.owner_user?.display_name ?? bounty.display_name ?? null);
        backerCount = Array.isArray(bounty.backings) ? bounty.backings.length : 0;
      }
    }
  } catch {
    // Render the fallback card rather than failing the unfurl.
  }

  const clampedTitle = title.length > 90 ? `${title.slice(0, 87)}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(52,211,153,0.12) 0%, rgba(10,10,10,0) 55%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#34d399', fontWeight: 700, letterSpacing: '0.18em' }}>
            ARTYPOT
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#666', letterSpacing: '0.08em' }}>
            {backerCount > 0 ? `${backerCount} backer${backerCount === 1 ? '' : 's'} waiting` : 'bounty'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
            {pot}
          </div>
          <div style={{ display: 'flex', fontSize: 44, color: '#e8e8e8', fontWeight: 700, lineHeight: 1.25 }}>
            {clampedTitle}
          </div>
          {handle ? (
            <div style={{ display: 'flex', fontSize: 30, color: '#999' }}>
              waiting for {handle}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#777' }}>
          You only pay if the work gets made.
        </div>
      </div>
    ),
    size,
  );
}
