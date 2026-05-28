'use client';

/**
 * Legacy redirect — /creators/{id}/edit was once the creator edit URL.
 * Creator profile editing now lives in /c/settings.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditCreatorIdRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/c/settings');
  }, [router]);

  return null;
}
