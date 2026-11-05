import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { useInvoices } from '@/lib/queries';

export function InvoicesPage() {
  const invoices = useInvoices();

  return (
    <>
      <PageHeader
        label="Billing"
        title="Invoices"
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" aria-hidden />
              New invoice
            </Link>
          </Button>
        }
      />
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
