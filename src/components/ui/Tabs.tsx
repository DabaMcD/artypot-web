'use client';

interface Tab {
  id: string;
  label: string;
}

interface TabsInlineProps {
  tabs: Tab[];
  active: string;
  setActive: (id: string) => void;
  className?: string;
}

export function TabsInline({ tabs, active, setActive, className = '' }: TabsInlineProps) {
  return (
    <div className={`flex gap-1 border border-border rounded-md p-0.5 bg-surface w-fit mb-4 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`px-3 py-1.5 rounded font-display text-sm transition-colors cursor-pointer ${
            active === tab.id
              ? 'bg-surface-2 text-foreground'
              : 'text-muted hover:text-foreground/80'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
