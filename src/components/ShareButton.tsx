'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ShareButtonProps {
  /** Relative path, e.g. /pots/42 — will be prefixed with the site origin */
  path: string;
  /** Title for the share dialog / email subject */
  title: string;
  /** Pre-filled message text (platform body / tweet) */
  text?: string;
  /** Optional custom label */
  label?: string;
  /** Button size variant */
  size?: 'sm' | 'md';
}

/* ─── Platform icons ─── */

function TwitterIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ─── Single platform row inside dropdown ─── */

function PlatformRow({
  label,
  icon,
  color,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-white/5 transition-colors w-full text-left"
    >
      <span style={{ color }}>{icon}</span>
      {label}
    </button>
  );
}

/* ─── Main component ─── */

export default function ShareButton({
  path,
  title,
  text,
  label = 'Share',
  size = 'sm',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside the dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`;
    }
    return `https://artypot.com${path}`;
  };

  const handlePlatform = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'email') => {
    const url = getUrl();
    const message = text ?? title;
    const eu = encodeURIComponent(url);
    const em = encodeURIComponent(message);
    const et = encodeURIComponent(title);
    const fullBody = encodeURIComponent(`${message}\n\n${url}`);

    const links: Record<string, string> = {
      twitter:  `https://twitter.com/intent/tweet?text=${em}&url=${eu}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${eu}`,
      whatsapp: `https://wa.me/?text=${fullBody}`,
      email:    `mailto:?subject=${et}&body=${fullBody}`,
    };

    if (platform === 'email') {
      window.location.href = links.email;
    } else {
      window.open(links[platform], '_blank', 'noopener,noreferrer,width=620,height=520');
    }
    setOpen(false);
  };

  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-2.5 py-1.5 gap-1'
      : 'text-sm px-3.5 py-2 gap-1.5';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Share"
        className={`inline-flex items-center justify-center rounded-lg border transition-colors ${sizeClasses} ${
          open
            ? 'border-foreground/30 text-foreground bg-white/5'
            : 'border-border text-muted hover:text-foreground hover:border-foreground/30'
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-surface-2 border border-border rounded-xl shadow-xl p-1.5 z-30 flex flex-col min-w-[152px]">
          <PlatformRow
            label="Twitter / X"
            icon={<TwitterIcon />}
            color="#1DA1F2"
            onClick={() => handlePlatform('twitter')}
          />
          <PlatformRow
            label="Facebook"
            icon={<FacebookIcon />}
            color="#1877F2"
            onClick={() => handlePlatform('facebook')}
          />
          <PlatformRow
            label="WhatsApp"
            icon={<WhatsAppIcon />}
            color="#25D366"
            onClick={() => handlePlatform('whatsapp')}
          />
          <PlatformRow
            label="Email"
            icon={<EmailIcon />}
            color="#888888"
            onClick={() => handlePlatform('email')}
          />
        </div>
      )}
    </div>
  );
}
