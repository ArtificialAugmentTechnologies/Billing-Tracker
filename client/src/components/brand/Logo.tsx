import type { LogoVariant } from '@a2/shared';
import { cn } from '@/lib/utils';
import { LogoMark } from './LogoMark';

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

/** Mark, wordmark and tagline. Set the size with a text-* class; the rest scales from it. */
export function Logo({ variant = 'color', className }: LogoProps) {
  const reversed = variant === 'reversed';

  return (
    <div className={cn('inline-flex items-center gap-[0.6em] text-xl', className)}>
      <LogoMark variant={variant} className="h-[2.1em] w-[2.1em] shrink-0" />
      <div className="flex flex-col whitespace-nowrap leading-none">
        <span
          className={cn('font-heading tracking-[-0.02em]', reversed ? 'text-cream' : 'text-navy')}
        >
          <span className="font-extrabold">A</span>
          <sup className="relative -top-[0.1em] align-super text-[0.5em] font-extrabold leading-none text-orange">
            2
          </sup>
          <span className="font-normal"> Technologies</span>
        </span>
        <span
          className={cn(
            'mt-[0.45em] font-mono text-[0.42em] uppercase tracking-tagline',
            reversed ? 'text-grey-navy' : 'text-grey-light',
          )}
        >
          Artificial Augment
        </span>
      </div>
    </div>
  );
}
