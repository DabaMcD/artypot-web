'use client';

import { useToast } from '@/lib/toast-context';

export default function ToastDisplay() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm
            text-sm font-medium min-w-64 max-w-xs
            transition-all duration-300
            ${t.fading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}
            ${
              t.type === 'success'
                ? 'bg-green-950/85 border-green-700/50 text-green-300'
                : 'bg-red-950/85 border-red-700/50 text-red-300'
            }
          `}
        >
          <span className="shrink-0 text-base leading-none">
            {t.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
