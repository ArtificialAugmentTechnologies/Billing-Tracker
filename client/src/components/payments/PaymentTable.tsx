import { formatDate, formatINR, PAYMENT_MODE_LABELS, type PaymentRecord } from '@a2/shared';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, tdClass, thClass } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { downloadFile } from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { useDeletePayment } from '@/lib/queries';

type Row = PaymentRecord & { invoiceId?: string; invoiceNo?: string; clientName?: string };

export function PaymentTable({
  payments,
  showInvoice,
}: {
  payments: Row[];
  showInvoice?: boolean;
}) {
  const { data: user } = useCurrentUser();
  const deletePayment = useDeletePayment();
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const canDelete = user?.role === 'ADMIN';

  const downloadReceipt = (payment: Row) =>
    downloadFile(`/payments/${payment.id}/receipt`).catch((error: Error) =>
      toast.error(error.message),
    );

  const confirmDelete = () => {
    if (!toDelete) return;
    deletePayment.mutate(toDelete.id, {
      onSuccess: () => toast.success('Payment deleted'),
      onError: (error) => toast.error(error.message),
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <>
      <Table>
        <thead>
          <tr>
            <th className={thClass}>Date</th>
            {showInvoice && <th className={thClass}>Invoice</th>}
            <th className={`${thClass} text-right`}>Amount</th>
            <th className={`${thClass} hidden sm:table-cell`}>Mode</th>
            <th className={`${thClass} hidden md:table-cell`}>Reference</th>
            <th className={thClass}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-muted/40">
              <td className={`${tdClass} whitespace-nowrap`}>
                {formatDate(payment.date)}
                {payment.isAdvance && (
                  <span className="ml-2">
                    <StatusBadge>Advance</StatusBadge>
                  </span>
                )}
              </td>
              {showInvoice && (
                <td className={tdClass}>
                  <Link
                    to={`/invoices/${payment.invoiceId}`}
                    className="whitespace-nowrap font-medium hover:text-orange"
                  >
                    {payment.invoiceNo}
                  </Link>
                  <p className="text-xs text-muted-foreground">{payment.clientName}</p>
                </td>
              )}
              <td className={`${tdClass} whitespace-nowrap text-right font-medium`}>
                {formatINR(payment.amount)}
              </td>
              <td className={`${tdClass} hidden whitespace-nowrap sm:table-cell`}>
                {PAYMENT_MODE_LABELS[payment.mode]}
              </td>
              <td className={`${tdClass} hidden md:table-cell`}>{payment.reference ?? '—'}</td>
              <td className={`${tdClass} whitespace-nowrap text-right`}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Download receipt ${payment.receiptNo}`}
                  title="Download receipt"
                  onClick={() => downloadReceipt(payment)}
                >
                  <Download className="h-4 w-4" aria-hidden />
                </Button>
                {canDelete && !payment.isAdvance && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete payment ${payment.receiptNo}`}
                    title="Delete payment"
                    onClick={() => setToDelete(payment)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this payment?"
        description={`${toDelete ? formatINR(toDelete.amount) : 'This payment'} will be removed and the invoice balance will go back up. Any receipt already given to the client will no longer match.`}
        confirmLabel="Delete payment"
        pending={deletePayment.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
