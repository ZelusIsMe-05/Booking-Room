type IconProps = {
  className?: string;
};

export function SearchIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
  );
}

export function MapPinIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </svg>
  );
}

export function WalletIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5H6.5A2.5 2.5 0 0 0 4 11v5.5A2.5 2.5 0 0 0 6.5 19H20V9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14h3" />
    </svg>
  );
}

export function HeartIcon({ className = 'h-5 w-5', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z" clipRule="evenodd" />
    </svg>
  );
}

export function BotIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 4v4M9 13h.01M15 13h.01M9 16h6M3 13h2M19 13h2" />
    </svg>
  );
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function StarIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function AirConditionerIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 12l8-8M12 12L4 4M12 12l8 8M12 12l-8 8" />
    </svg>
  );
}

export function WifiIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8.5 14.5a5 5 0 017 0M5 11a10 10 0 0114 0M1.5 7.5a15 15 0 0121 0" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function WashingMachineIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <circle cx="12" cy="13" r="5" />
      <circle cx="12" cy="13" r="2" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
    </svg>
  );
}

export function RefrigeratorIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="5" y1="10" x2="19" y2="10" />
      <line x1="9" y1="5" x2="9" y2="8" />
      <line x1="9" y1="13" x2="9" y2="17" />
    </svg>
  );
}

export function MotorbikeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="6" cy="16" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 16h12M9 16l2-8h4l2 8M9 8h6M12 3v5" />
    </svg>
  );
}

export function LockIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export function GridIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function MessageIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export function MapIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 5.447-2.724A1 1 0 0121 3.178v10.764a1 1 0 01-.553.894L15 18l-6 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2v18M15 4v18" />
    </svg>
  );
}

