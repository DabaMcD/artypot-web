'use client';

/**
 * Legacy redirect — /creators/{id} is no longer the canonical creator URL.
 * Fetches the creator and bounces to /{slug}. Keeps old bookmarks and external
 * links working without a hard-coded redirect list.
 */

import { useEffect, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { creators as creatorsApi } from '@/lib/api';

export default function CreatorIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    creatorsApi.get(Number(id)).then((res) => {
      const slug = res.data.slug;
      router.replace(slug ? `/${slug}` : '/search');
    }).catch(() => {
      router.replace('/search');
    });
  }, [id, router]);

  return null;
}
