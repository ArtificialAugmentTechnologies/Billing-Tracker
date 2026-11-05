import { formatDate, formatINR, type InvoiceRow } from '@a2/shared';
import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MonthlyChart, StatusChart, TopClients } from '@/components/dashboard/charts';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { PageHeader, SectionCard, StatCard } from '@/components/ui/page';
import { useDashboard } from '@/lib/queries';
import { cn } from '@/lib/utils';

function InvoiceList({
  invoices,
  empty,
  showBalance,
  highlight,
}: {
  invoices: InvoiceRow[];
  empty: string;
  showBalance?: boolean;
  highlight?: boolean;
}) {
  if (invoices.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className={cn('flex items-center gap-3 px-5 py-3 text-sm', highlight && 'bg-orange/10')}
        >
          <div className="min-w-0 flex-1">
            <Link
              to={`/invoices/${invoice.id}`}
              className="block truncate font-medium hover:text-orange"
            >
              {invoice.invoiceNo}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {invoice.clientName} · due {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-medium tabular-nums">
              {formatINR(showBalance ? invoice.balance : invoice.total)}
            </p>
            {!showBalance && <InvoiceStatusBadge status={invoice.status} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const dashboard = useDashboard();

  const newInvoice = (
    <Button asChild>
      <Link to="/invoices/new">
        <Plus className="h-4 w-4" aria-hidden />
        New invoice
      </Link>
    </Button>
  );

  if (dashboard.isPending) return <ListSkeleton />;
  if (dashboard.isError) {
    return (
      <ErrorState message="We couldn't load the dashboard." onRetry={() => dashboard.refetch()} />
    );
  }

  const { kpis, monthly, statusBreakdown, draftCount, topClients, recent, upcoming, overdue } =
    dashboard.data;
  const hasInvoices = recent.length > 0;

  return (
    <>
      <PageHeader label="Overview" title="Dashboard" actions={newInvoice} />

      <div className="space-y-6">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
          <StatCard label="Total billed" amount={kpis.billed} />
          <StatCard label="Total received" amount={kpis.received} />
          <StatCard label="Outstanding" amount={kpis.outstanding} />
          <StatCard label="Overdue" amount={kpis.overdue} accent={kpis.overdue > 0} />
          <StatCard label="Invoices this month" count={kpis.invoicesThisMonth} />
        </div>

        {hasInvoices ? (
          <>
            <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
              <SectionCard label="Billed vs received, last 12 months">
                <div className="px-5 pb-5">
                  <MonthlyChart data={monthly} />
                </div>
              </SectionCard>
              <div className="space-y-6">
                <SectionCard label="Invoices by status">
                  <div className="px-5 pb-5">
                    <StatusChart data={statusBreakdown} />
                    {draftCount > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {draftCount} draft{draftCount === 1 ? '' : 's'} not counted.
                      </p>
                    )}
                  </div>
                </SectionCard>
                <SectionCard label="Top clients by revenue">
                  <div className="px-5 pb-5">
                    <TopClients data={topClients} />
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-3 [&>*]:min-w-0">
              <SectionCard label="Overdue">
                <InvoiceList invoices={overdue} empty="Nothing is overdue." showBalance highlight />
              </SectionCard>
              <SectionCard label="Upcoming due dates">
                <InvoiceList invoices={upcoming} empty="No payments coming due." showBalance />
              </SectionCard>
              <SectionCard label="Recent invoices">
                <InvoiceList invoices={recent} empty="No invoices yet." />
              </SectionCard>
            </div>
          </>
        ) : (
          <Card>
            <EmptyState
              icon={FileText}
              title="No issued invoices yet"
              description="Finalize your first invoice to see billing figures here."
              action={newInvoice}
            />
          </Card>
        )}
      </div>
    </>
  );
}
