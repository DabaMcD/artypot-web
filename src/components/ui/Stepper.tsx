interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center mb-7">
      {steps.map((step, i) => (
        <>
          <div
            key={`step-${i}`}
            className={`flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wide ${
              i === current ? 'text-foreground' : 'text-muted/60'
            }`}
          >
            <div
              className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                i < current
                  ? 'bg-good border-good text-background'
                  : i === current
                  ? 'bg-[var(--color-role)] border-[var(--color-role)] text-background'
                  : 'border-border text-muted'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div key={`line-${i}`} className="w-7 h-px bg-border mx-3" />
          )}
        </>
      ))}
    </div>
  );
}
