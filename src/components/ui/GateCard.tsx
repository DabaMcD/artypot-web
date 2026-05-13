import { ReactNode } from 'react';

type GateStatus = 'done' | 'todo' | 'blocked';

interface Gate {
  status: GateStatus;
  label: string;
  detail?: string;
}

interface GateCardProps {
  gate: Gate;
  action?: ReactNode;
}

const iconMap: Record<GateStatus, string> = { done: '✓', todo: '!', blocked: '×' };
const iconClasses: Record<GateStatus, string> = {
  done:    'bg-good-soft text-good border-good',
  todo:    'bg-warn-soft text-warn border-warn',
  blocked: 'bg-bad-soft  text-bad  border-bad',
};

export function GateCard({ gate, action }: GateCardProps) {
  return (
    <div className="flex items-center gap-4 border border-border rounded-md p-4 bg-surface">
      <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 text-base ${iconClasses[gate.status]}`}>
        {iconMap[gate.status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-foreground">{gate.label}</div>
        {gate.detail && <div className="text-sm text-muted mt-0.5">{gate.detail}</div>}
      </div>
      {action}
    </div>
  );
}
