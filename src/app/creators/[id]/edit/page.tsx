'use client';

/**
 * Legacy redirect — /creators/{id}/edit is no longer the canonical edit URL.
 * Fetches the creator and bounces to /{slug}/edit.
 */

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { creators as creatorsApi } from '@/lib/api';

export default function EditCreatorIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    creatorsApi.get(Number(id)).then((res) => {
      const slug = res.data.slug;
      router.replace(slug ? `/${slug}/edit` : '/creators');
    }).catch(() => {
      router.replace('/creators');
    });
  }, [id, router]);

  return null;
}
