'use client';

import { forwardRef } from 'react';
import ReactPhoneInput, { isValidPhoneNumber, type Value } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

export { isValidPhoneNumber };
export type { Value as E164Number };

// ── Custom input that slots into the app's dark theme ─────────────────────
const InnerInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  (props, ref) => (
    <input
      ref={ref}
      {...props}
      className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
    />
  )
);
InnerInput.displayName = 'PhoneInnerInput';

// ── Public component ───────────────────────────────────────────────────────
interface Props {
  value: Value | undefined;
  onChange: (value: Value | undefined) => void;
  disabled?: boolean;
}

export default function PhoneNumberInput({ value, onChange, disabled }: Props) {
  return (
    // artypot-phone-input scopes the CSS overrides in globals.css
    <div className="artypot-phone-input flex items-center bg-surface-2 border border-border rounded-lg px-3 py-2 focus-within:border-fan transition-colors">
      <ReactPhoneInput
        flags={flags}
        placeholder="Phone number"
        value={value}
        onChange={onChange}
        disabled={disabled}
        defaultCountry="US"
        inputComponent={InnerInput}
      />
    </div>
  );
}
