import type { InvoiceDocument } from '@a2/shared';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InvoicePreview } from './InvoicePreview';

interface FullScreenPreviewProps {
  document: InvoiceDocument;
  onClose: () => void;
}

export function FullScreenPreview({ document, onClose }: FullScreenPreviewProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invoice preview"
      className="fixed inset-0 z-50 overflow-y-auto bg-navy/90 p-4"
    >
      <div className="mx-auto max-w-[794px]">
        <div className="mb-3 flex justify-end">
          <Button variant="outline" onClick={onClose} autoFocus>
            <X className="h-4 w-4" aria-hidden />
            Close
          </Button>
        </div>
        <InvoicePreview document={document} />
      </div>
    </div>
  );
}
