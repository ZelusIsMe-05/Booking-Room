import React, { forwardRef } from 'react';

type AuthInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: string;
  right?: React.ReactNode;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
};

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, value, onChange, placeholder, type = 'text', error, right, icon, suffix }, ref) => {
    return (
      <label className="block">
        <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.05em] text-booking-text">
          {label}
          {right}
        </span>
        <span className={`flex min-h-11 items-center gap-3 rounded-lg border bg-booking-surface px-3 text-booking-muted transition focus-within:border-booking-primary ${error ? 'border-red-400' : 'border-booking-border'}`}>
          {icon}
          <input
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            type={type}
            className="w-full bg-transparent text-base text-booking-text outline-none placeholder:text-[#6b7280]"
          />
          {suffix}
        </span>
        {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
      </label>
    );
  }
);

AuthInput.displayName = 'AuthInput';
export default AuthInput;
