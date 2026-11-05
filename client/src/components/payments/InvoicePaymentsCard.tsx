import { formatINR } from '@a2/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/page';
import { useInvoicePayments } from '@/lib/queries';
import { PaymentDialog } from './PaymentDialog';
import { PaymentTable } from './PaymentTable';

export function InvoicePaymentsCard({ invoiceId }: { invoiceId: string }) {
  const { data } = useInvoicePayments(invoiceId);
  const [recording, setRecording] = useState(false);

  if (!data) return null;

  return (
    <div className="mb-4">
      <SectionCard
        label="Payments"
        action={
          !data.blockedReason && (
            <Button size="sm" onClick={() => setRecording(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Record payment
            </Button>
          )
        }
      >
        <dl className="grid grid-cols-3 gap-3 px-5 pb-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd className="font-semibold">{formatINR(data.total)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="font-semibold">{formatINR(data.paid)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Balance</dt>
            <dd className="font-semibold">{formatINR(data.balance)}</dd>
          </div>
        </dl>
        {data.blockedReason && data.status !== 'PAID' && (
          <p className="px-5 pb-4 text-sm text-muted-foreground">{data.blockedReason}.</p>
        )}
        {data.payments.length > 0 && <PaymentTable payments={data.payments} />}
      </SectionCard>

      <PaymentDialog
        open={recording}
        onOpenChange={setRecording}
        invoice={{ id: invoiceId, balance: data.balance }}
      />
    </div>
  );
}
