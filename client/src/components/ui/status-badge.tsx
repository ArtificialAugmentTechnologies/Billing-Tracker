import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  success: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  warning: 'bg-orange/15 text-[#9A3412] dark:text-orange',
};

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
