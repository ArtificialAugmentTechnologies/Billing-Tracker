import { formatINR } from '@a2/shared';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}

export function ProgressBar({ label, value, max, barClassName }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatINR(value)} · {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
