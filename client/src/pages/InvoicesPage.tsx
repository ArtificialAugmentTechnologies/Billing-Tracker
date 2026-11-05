import {
  formatDate,
  formatINR,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  type InvoiceListQuery,
  type InvoiceSort,
  type InvoiceStatus,
} from '@a2/shared';
import { ArrowDown, ArrowUp, Download, FileText, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PageHeader, Table, tdClass, thClass } from '@/components/ui/page';
import { downloadFile } from '@/lib/api';
import { toQueryString, useClients, useFinancialYears, useInvoiceList } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

interface Filters {
  search: string;
  status: InvoiceStatus | '';
  clientId: string;
  fy: string;
  from: string;
  to: string;
}

const NO_FILTERS: Filters = { search: '', status: '', clientId: '', fy: '', from: '', to: '' };

const COLUMNS: { key: InvoiceSort; label: string; align?: 'right'; className?: string }[] = [
  { key: 'invoiceNo', label: 'Invoice no.' },
  { key: 'clientName', label: 'Client', className: 'hidden sm:table-cell' },
  { key: 'projectName', label: 'Project', className: 'hidden 2xl:table-cell' },
  { key: 'invoiceDate', label: 'Date', className: 'hidden xl:table-cell' },
  { key: 'dueDate', label: 'Due', className: 'hidden xl:table-cell' },
  { key: 'total', label: 'Total', align: 'right', className: 'hidden md:table-cell' },
  { key: 'paid', label: 'Paid', align: 'right', className: 'hidden min-[1400px]:table-cell' },
  { key: 'balance', label: 'Balance', align: 'right' },
  { key: 'status', label: 'Status', className: 'hidden sm:table-cell' },
];

export function InvoicesPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState<InvoiceSort>('invoiceDate');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(filters.search);
  const criteria: InvoiceListQuery = { ...filters, search, status: filters.status || undefined };
  const invoices = useInvoiceList({ ...criteria, sort, dir, page, pageSize: PAGE_SIZE });
  const { data: clients = [] } = useClients();
  const { data: years = [] } = useFinancialYears();

  const filtered = Object.values(filters).some(Boolean);

  const update = (change: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...change }));
    setPage(1);
  };

  const sortBy = (key: InvoiceSort) => {
    const sameColumn = sort === key;
    setSort(key);
    setDir(sameColumn && dir === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const exportAs = (format: 'csv' | 'xlsx') =>
    downloadFile(`/invoices/export${toQueryString({ ...criteria, sort, dir, format })}`).catch(
      (error: Error) => toast.error(error.message),
    );

  const total = invoices.data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        label="Billing"
        title="Invoices"
        actions={
          <>
            <Button variant="outline" onClick={() => exportAs('csv')}>
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportAs('xlsx')}>
              <Download className="h-4 w-4" aria-hidden />
              Excel
            </Button>
            <Button asChild>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" aria-hidden />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_repeat(2,minmax(0,1.15fr))]">
        <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Search invoices"
            title="Search by invoice number, client or project"
            aria-label="Search invoices"
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as InvoiceStatus | '' })}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {INVOICE_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.clientId}
          onChange={(event) => update({ clientId: event.target.value })}
          aria-label="Filter by client"
        >
          <option value="">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.fy}
          onChange={(event) => update({ fy: event.target.value })}
          aria-label="Filter by financial year"
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year.fy} value={year.fy}>
              FY {year.fy}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => update({ from: event.target.value })}
          aria-label="From date"
          title="From date"
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => update({ to: event.target.value })}
          aria-label="To date"
          title="To date"
        />
      </div>

      {invoices.isPending ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ErrorState message="We couldn't load your invoices." onRetry={() => invoices.refetch()} />
      ) : invoices.data.rows.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={Search}
              title="No matching invoices"
              description="Try a different search or filter."
              action={
                <Button variant="outline" onClick={() => update(NO_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to get started."
            />
          )}
        </Card>
      ) : (
        <Card className={cn('overflow-hidden', invoices.isPlaceholderData && 'opacity-60')}>
          <Table>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    aria-sort={
                      sort === column.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      thClass,
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(column.key)}
                      className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                    >
                      {column.label}
                      {sort === column.key &&
                        (dir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        ))}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.data.rows.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/40">
                  <td className={`${tdClass} font-medium`}>
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="whitespace-nowrap hover:text-orange"
                    >
                      {invoice.invoiceNo}
                    </Link>
                    {/* On phones these sit here, as their own columns are hidden. */}
                    <div className="mt-1 space-y-1 font-normal sm:hidden">
                      <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                  </td>
                  <td className={`${tdClass} hidden sm:table-cell`}>{invoice.clientName}</td>
                  <td className={`${tdClass} hidden 2xl:table-cell`}>
                    {invoice.projectName ?? '—'}
                  </td>
                  <td className={`${tdClass} hidden whitespace-nowrap xl:table-cell`}>
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className={`${tdClass} hidden whitespace-nowrap xl:table-cell`}>
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td
                    className={`${tdClass} hidden whitespace-nowrap text-right tabular-nums md:table-cell`}
                  >
                    {formatINR(invoice.total)}
                  </td>
                  <td
                    className={`${tdClass} hidden whitespace-nowrap text-right tabular-nums min-[1400px]:table-cell`}
                  >
                    {formatINR(invoice.paid)}
                  </td>
                  <td
                    className={`${tdClass} whitespace-nowrap text-right font-medium tabular-nums`}
                  >
                    {formatINR(invoice.balance)}
                  </td>
                  <td className={`${tdClass} hidden sm:table-cell`}>
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <p className="text-muted-foreground">
              {first}–{last} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={last >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
