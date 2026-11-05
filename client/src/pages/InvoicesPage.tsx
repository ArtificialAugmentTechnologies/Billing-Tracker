import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { Card } from '@/components/ui/card';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { useInvoices } from '@/lib/queries';

export function InvoicesPage() {
  const invoices = useInvoices();

  return (
    <>
      <PageHeader label="Billing" title="Invoices" />
      {invoices.isPending ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ErrorState message="We couldn't load your invoices." onRetry={() => invoices.refetch()} />
      ) : (
        <Card className="overflow-hidden">
          <InvoiceTable invoices={invoices.data} showClient />
        </Card>
      )}
    </>
  );
}
