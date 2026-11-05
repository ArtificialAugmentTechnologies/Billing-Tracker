import { Navigate, useParams } from 'react-router-dom';
import { InvoiceBuilder } from '@/components/invoices/builder/InvoiceBuilder';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { useBuilderDefaults, useInvoice } from '@/lib/queries';

export function InvoiceBuilderPage() {
  const { id } = useParams();
  const defaults = useBuilderDefaults();
  const invoice = useInvoice(id);

  if (defaults.isError || invoice.isError) {
    return (
      <ErrorState
        message="We couldn't open the invoice builder."
        onRetry={() => {
          defaults.refetch();
          if (id) invoice.refetch();
        }}
      />
    );
  }
  if (defaults.isPending || (id && invoice.isPending)) return <ListSkeleton />;

  // Only drafts can be edited, so anything else goes to its read-only page.
  if (invoice.data && invoice.data.status !== 'DRAFT') {
    return <Navigate to={`/invoices/${id}`} replace />;
  }

  return <InvoiceBuilder key={id ?? 'new'} defaults={defaults.data} invoice={invoice.data} />;
}
