import { PAYMENT_MODE_LABELS, PAYMENT_MODES, type PaymentMode } from '@a2/shared';
import { CreditCard, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { PaymentTable } from '@/components/payments/PaymentTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { usePayments } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<PaymentMode | ''>('');
  const [recording, setRecording] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const payments = usePayments({ search: debouncedSearch, mode: mode || undefined });
  const filtered = Boolean(debouncedSearch || mode);

  return (
    <>
      <PageHeader
        label="Money in"
        title="Payments"
        actions={
          <Button onClick={() => setRecording(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Record payment
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by invoice, client or reference"
            aria-label="Search payments"
            className="pl-9"
          />
        </div>
        <Select
          value={mode}
          onChange={(event) => setMode(event.target.value as PaymentMode | '')}
          aria-label="Filter by mode"
          className="sm:w-44"
        >
          <option value="">All modes</option>
          {PAYMENT_MODES.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_MODE_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>

      {payments.isPending ? (
        <ListSkeleton />
      ) : payments.isError ? (
        <ErrorState message="We couldn't load your payments." onRetry={() => payments.refetch()} />
      ) : payments.data.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={Search}
              title="No matching payments"
              description="Try a different search or filter."
            />
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Payments appear here once they are recorded against an invoice."
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <PaymentTable payments={payments.data} showInvoice />
        </Card>
      )}

      <PaymentDialog open={recording} onOpenChange={setRecording} />
    </>
  );
}
