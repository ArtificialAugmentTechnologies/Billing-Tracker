import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          {...(!description && { 'aria-describedby': undefined })}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0',
            className,
          )}
        >
          <DialogPrimitive.Title className="pr-8 font-heading text-xl font-extrabold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          )}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
          <div className="mt-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
