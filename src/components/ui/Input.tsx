'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';

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
  'w-full px-3 py-2.5 bg-background text-foreground border border-border rounded focus:outline-none focus:border-[var(--color-role)] transition-colors font-sans text-base';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ mono, className = '', ...props }: InputProps) {
  // Search fields get a monospaced hint (placeholder) to match the header
  // search box, without forcing typed text into mono.
  const searchHint = props.type === 'search' ? 'placeholder:font-mono' : '';
  return (
    <input
      {...props}
      className={`${fieldBase} ${mono ? 'font-mono text-sm' : ''} ${searchHint} ${className}`}
    />
  );
}

// ── Password input (with show/hide toggle) ─────────────────────────────────────

export function PasswordInput({ mono, className = '', ...props }: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${fieldBase} pr-10 ${mono ? 'font-mono text-sm' : ''} ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground transition-colors"
      >
        {visible ? (
          // eye-off
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243-4.243-4.243" />
          </svg>
        ) : (
          // eye
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </div>
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
