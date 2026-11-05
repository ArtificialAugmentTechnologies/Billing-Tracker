import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Card } from './card';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} aria-hidden />;
}

export function ListSkeleton() {
  return (
    <Card className="space-y-3 p-5" aria-busy="true">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </Card>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-6 w-6 text-orange" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
