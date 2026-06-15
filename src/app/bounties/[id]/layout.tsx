import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Server-side fetch of the public bounty for link-unfurl metadata. The page
 * itself is a client component, so metadata lives here in the segment layout.
 * Failures fall back to generic branding — never block the page render.
 */
async function fetchBounty(id: string) {
  try {
    const res = await fetch(`${API_BASE}/bounties/${id}`, {
      // Short revalidate: unfurl bots should see a fresh-ish pot without
      // hammering the API on every crawl.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function formatPot(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const bounty = await fetchBounty(id);

  if (!bounty) {
    return { title: 'Bounty — Artypot' };
  }

  const pot = formatPot(Number(bounty.total_backed ?? 0));
  const handle = bounty.target_handle?.username
    ? `@${bounty.target_handle.username}`
    : (bounty.owner_user?.display_name ?? bounty.display_name ?? 'a creator');

  const title = `${pot} bounty for ${handle}: ${bounty.title}`;
  const description = `Fans have pooled ${pot} for ${handle} to make this. Back it on Artypot — you only pay if the work gets made.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Artypot',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function BountyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
