'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';
type Size = 'default' | 'sm' | 'xs';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  'inline-flex items-center gap-1.5 border border-border rounded cursor-pointer transition-[transform,box-shadow,background,filter] duration-75 select-none';

const variantClasses: Record<Variant, string> = {
  default: 'bg-surface-2 text-foreground hover:bg-surface-2/80 hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#000] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#000] shadow-hard',
  primary: 'ap-btn-primary shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#000] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#000]',
  danger:  'bg-bad-soft text-bad border-bad shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#000] active:translate-x-px active:translate-y-px',
  ghost:   'bg-transparent border-transparent shadow-none hover:bg-surface-2 hover:shadow-none hover:translate-x-0 hover:translate-y-0',
};

const sizeClasses: Record<Size, string> = {
  default: 'px-4 py-2 text-base',
  sm:      'px-2.5 py-1 text-sm shadow-[2px_2px_0_#000]',
  xs:      'px-2 py-0.5 text-xs shadow-none rounded-sm',
};

export function Button({ variant = 'default', size = 'default', className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-40 cursor-not-allowed !transform-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
