'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  lg?: boolean;
}

export function Modal({ title, onClose, children, actions, lg }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-surface border border-border rounded-lg p-6 shadow-soft max-h-[90vh] overflow-y-auto ${lg ? 'w-full max-w-2xl' : 'w-full max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[22px] text-foreground">{title}</h3>
          <Button variant="ghost" size="xs" onClick={onClose}>✕</Button>
        </div>
        {children}
        {actions && (
          <div className="flex items-center justify-end gap-2 mt-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
