import { logoMarkShapes, type LogoVariant } from '@a2/shared';

interface LogoMarkProps {
  variant?: LogoVariant;
  className?: string;
}

export function LogoMark({ variant = 'color', className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A² Technologies logo"
      dangerouslySetInnerHTML={{ __html: logoMarkShapes(variant) }}
    />
  );
}
