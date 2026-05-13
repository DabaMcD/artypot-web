'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

// ── Field Label ───────────────────────────────────────────────────────────────

export function FieldLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <label className={`block font-mono text-[10px] tracking-[0.8px] uppercase text-muted mb-1.5 ${className}`}>
      {children}
    </label>
  );
}

// ── Field Hint ────────────────────────────────────────────────────────────────

export function FieldHint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10px] tracking-[0.5px] text-muted/70 mt-1.5 ${className}`}>
      {children}
    </p>
  );
}

// ── Input (text field) ────────────────────────────────────────────────────────

const fieldBase =
  'w-full px-3 py-2.5 bg-background text-foreground border border-border rounded focus:outline-none focus:border-[var(--color-role)] transition-colors font-display text-base';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ mono, className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`${fieldBase} ${mono ? 'font-mono text-sm' : ''} ${className}`}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

export function Textarea({ mono, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`${fieldBase} min-h-[72px] resize-y ${mono ? 'font-mono text-sm' : ''} ${className}`}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
}

export function Select({ mono, className = '', ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`${fieldBase} appearance-none pr-8 ${mono ? 'font-mono text-sm' : ''} ${className}`}
      style={{
        backgroundImage: `linear-gradient(45deg, transparent 50%, var(--color-muted) 50%),
                          linear-gradient(135deg, var(--color-muted) 50%, transparent 50%)`,
        backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 12px) 50%',
        backgroundSize: '6px 6px',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

// ── Input with prefix ─────────────────────────────────────────────────────────

interface InputPrefixProps {
  prefix: string;
  children: ReactNode;
}

export function InputPrefix({ prefix, children }: InputPrefixProps) {
  return (
    <div className="flex items-stretch border border-border rounded bg-background">
      <span className="flex items-center px-2.5 bg-surface-2 font-mono text-xs text-muted border-r border-border flex-shrink-0">
        {prefix}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Grid helpers ──────────────────────────────────────────────────────────────

export function FieldGrid2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-3 ${className}`}>{children}</div>;
}
