import { BRAND } from '@a2/shared';

export type LogoVariant = 'color' | 'reversed';

interface LogoMarkProps {
  variant?: LogoVariant;
  className?: string;
}

export function LogoMark({ variant = 'color', className }: LogoMarkProps) {
  const ink = variant === 'reversed' ? BRAND.cream : BRAND.navy;

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A² Technologies logo"
    >
      <path
        d="M 58,8 H 20 Q 8,8 8,20 V 80 Q 8,92 20,92 H 80 Q 92,92 92,80 V 46"
        stroke={ink}
        strokeWidth="7"
        fill="none"
      />
      <polygon points="86,46 98,46 92,37" fill={BRAND.orange} />
      <polyline
        points="76,32 85,10 94,32"
        stroke={BRAND.orange}
        strokeWidth="6"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
        fill="none"
      />
      <polyline
        points="28,78 50,28 72,78"
        stroke={ink}
        strokeWidth="9"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
        fill="none"
      />
      <line x1="34" y1="64" x2="66" y2="64" stroke={ink} strokeWidth="7" />
    </svg>
  );
}
