import {
  formatDate,
  formatINR,
  INVOICE_STATUS_LABELS,
  type InvoiceRow,
  type InvoiceStatus,
} from '@a2/shared';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/feedback';
import { Table, tdClass, thClass } from '@/components/ui/page';
import { StatusBadge, type BadgeTone } from '@/components/ui/status-badge';

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PARTIALLY_PAID: 'info',
  PAID: 'success',
  OVERDUE: 'warning',
  CANCELLED: 'neutral',
};

export function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No invoices yet"
        description="Invoices will appear here once they are created."
      />
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <th className={thClass}>Invoice no.</th>
          <th className={thClass}>Date</th>
          <th className={thClass}>Due</th>
          <th className={`${thClass} text-right`}>Total</th>
          <th className={`${thClass} text-right`}>Balance</th>
          <th className={thClass}>Status</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td className={`${tdClass} whitespace-nowrap font-medium`}>{invoice.invoiceNo}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(invoice.invoiceDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(invoice.dueDate)}</td>
            <td className={`${tdClass} whitespace-nowrap text-right`}>
              {formatINR(invoice.total)}
            </td>
            <td className={`${tdClass} whitespace-nowrap text-right`}>
              {formatINR(invoice.balance)}
            </td>
            <td className={tdClass}>
              <StatusBadge tone={STATUS_TONES[invoice.status]}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
