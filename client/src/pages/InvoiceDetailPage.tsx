import { Maximize2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InvoicePreview } from '@/components/invoices/InvoicePreview';
import { Button } from '@/components/ui/button';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { BackLink, PageHeader } from '@/components/ui/page';
import { useInvoiceDocument } from '@/lib/queries';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const invoice = useInvoiceDocument(id);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (!fullScreen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [fullScreen]);

  if (invoice.isPending) return <ListSkeleton />;
  if (invoice.isError) {
    return <ErrorState message={invoice.error.message} onRetry={() => invoice.refetch()} />;
  }

  return (
    <>
      <PageHeader
        label={<BackLink to="/invoices">← Invoices</BackLink>}
        title={invoice.data.invoiceNo}
        subtitle={invoice.data.client.name}
        actions={
          <Button variant="outline" onClick={() => setFullScreen(true)}>
            <Maximize2 className="h-4 w-4" aria-hidden />
            Full screen
          </Button>
        }
      />

      <div className="mx-auto max-w-[794px]">
        <InvoicePreview document={invoice.data} />
      </div>

      {fullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invoice preview"
          className="fixed inset-0 z-50 overflow-y-auto bg-navy/90 p-4"
        >
          <div className="mx-auto max-w-[794px]">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" onClick={() => setFullScreen(false)} autoFocus>
                <X className="h-4 w-4" aria-hidden />
                Close
              </Button>
            </div>
            <InvoicePreview document={invoice.data} />
          </div>
        </div>
      )}
    </>
  );
}
