import { formatINR } from '@a2/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from './card';

interface PageHeaderProps {
  label: ReactNode;
  title: string;
  subtitle?: string | null;
  actions?: ReactNode;
}

export function PageHeader({ label, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="section-label">{label}</p>
        <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  amount?: number;
  /** A plain count, for tiles that aren't money. */
  count?: number;
  accent?: boolean;
}

export function StatCard({ label, amount, count, accent }: StatCardProps) {
  return (
    <Card className="p-5">
      <p className="section-label">{label}</p>
      <p className={cn('mt-2 font-heading text-2xl font-extrabold', accent && 'text-orange')}>
        {count ?? formatINR(amount ?? 0)}
      </p>
    </Card>
  );
}

export function SectionCard({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
        <h2 className="section-label">{label}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    // relative: keeps sr-only cells, which are absolutely positioned, inside this scroll area.
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export const thClass =
  'whitespace-nowrap border-y border-border bg-muted/50 px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground';
export const tdClass = 'border-b border-border px-5 py-3 align-middle';

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="hover:underline">
      {children}
    </Link>
  );
}
