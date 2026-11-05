import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface BuilderSectionProps {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}

export function BuilderSection({ label, action, children }: BuilderSectionProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
        <h2 className="section-label">{label}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
