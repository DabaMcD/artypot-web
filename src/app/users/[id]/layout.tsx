import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * The public user-profile page (/users/[id]) is a client component, so its
 * title lives here in the segment layout. Resolves the user's display name;
 * falls back to generic branding on any failure.
 */
async function fetchUserName(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.display_name ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const name = await fetchUserName(id);
  return { title: name ?? 'Profile' };
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
