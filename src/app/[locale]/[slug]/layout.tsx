import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * The creator-profile page (/{slug}) is a client component, so its title lives
 * here in the segment layout (same pattern as /bounties/[id]/layout.tsx).
 * Resolves the creator's display name for the tab + link unfurls; falls back to
 * generic branding on any failure so the page never blocks on this.
 *
 * Also titles the nested /{slug}/[handle] and /{slug}/bounties pages with the
 * creator name unless they set their own.
 */
async function fetchCreatorName(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/creators/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.match === 'current' ? (json.user?.display_name ?? null) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const name = await fetchCreatorName(slug);
  return { title: name ?? 'Creator' };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
