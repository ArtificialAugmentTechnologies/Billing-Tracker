import {
  forwardRef,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const controlClass =
  'w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-orange';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, error, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-orange">{error}</p>}
    </div>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, 'h-10', className)} {...props} />
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} rows={3} className={cn(controlClass, 'py-2', className)} {...props} />
));
Textarea.displayName = 'Textarea';
