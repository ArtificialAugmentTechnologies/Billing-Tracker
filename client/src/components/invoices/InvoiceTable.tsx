import {
  formatDate,
  formatINR,
  INVOICE_STATUS_LABELS,
  type InvoiceRow,
  type InvoiceStatus,
} from '@a2/shared';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
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

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  showClient?: boolean;
}

export function InvoiceTable({ invoices, showClient }: InvoiceTableProps) {
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
          {showClient && <th className={thClass}>Client</th>}
          <th className={thClass}>Date</th>
          <th className={thClass}>Due</th>
          <th className={`${thClass} text-right`}>Total</th>
          <th className={`${thClass} text-right`}>Balance</th>
          <th className={thClass}>Status</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-muted/40">
            <td className={`${tdClass} whitespace-nowrap font-medium`}>
              <Link to={`/invoices/${invoice.id}`} className="hover:text-orange">
                {invoice.invoiceNo}
              </Link>
            </td>
            {showClient && <td className={tdClass}>{invoice.clientName}</td>}
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
