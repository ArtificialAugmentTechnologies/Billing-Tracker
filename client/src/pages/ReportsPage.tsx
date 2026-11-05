import { formatDate, formatINR } from '@a2/shared';
import { Download, Scale } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceTable';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { PageHeader, SectionCard, StatCard, Table, tdClass, thClass } from '@/components/ui/page';
import { downloadFile } from '@/lib/api';
import { useFinancialYears, useMonthlyReport, useOutstandingReport } from '@/lib/queries';

const money = `${tdClass} whitespace-nowrap text-right tabular-nums`;
const moneyHead = `${thClass} text-right`;

function DownloadButtons({ path, formats }: { path: string; formats: ('csv' | 'pdf' | 'xlsx')[] }) {
  const separator = path.includes('?') ? '&' : '?';
  const LABELS = { csv: 'CSV', pdf: 'PDF', xlsx: 'Excel' };

  return (
    <div className="flex gap-2">
      {formats.map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          aria-label={`Download ${LABELS[format]}`}
          onClick={() =>
            downloadFile(`${path}${separator}format=${format}`).catch((error: Error) =>
              toast.error(error.message),
            )
          }
        >
          <Download className="h-4 w-4" aria-hidden />
          {LABELS[format]}
        </Button>
      ))}
    </div>
  );
}

function OutstandingSection() {
  const report = useOutstandingReport();

  if (report.isPending) return <ListSkeleton />;
  if (report.isError) {
    return <ErrorState message="We couldn't load this report." onRetry={() => report.refetch()} />;
  }

  const { asOf, outstanding, overdue, clients } = report.data;

  return (
    <SectionCard
      label={`Client-wise outstanding, as of ${formatDate(asOf)}`}
      action={<DownloadButtons path="/reports/outstanding" formats={['pdf', 'csv']} />}
    >
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <StatCard label="Outstanding" amount={outstanding} />
        <StatCard label="Overdue" amount={overdue} accent={overdue > 0} />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nothing is outstanding"
          description="Every issued invoice has been paid."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Client / invoice</th>
              <th className={`${thClass} hidden md:table-cell`}>Due</th>
              <th className={`${thClass} hidden sm:table-cell`}>Status</th>
              <th className={moneyHead}>Balance</th>
            </tr>
          </thead>
          {clients.map((client) => (
            <tbody key={client.clientId}>
              <tr className="bg-muted/40">
                <td className={`${tdClass} font-semibold`} colSpan={3}>
                  <Link to={`/clients/${client.clientId}`} className="hover:text-orange">
                    {client.clientName}
                  </Link>
                </td>
                <td className={`${money} font-semibold`}>{formatINR(client.outstanding)}</td>
              </tr>
              {client.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <Link to={`/invoices/${invoice.id}`} className="hover:text-orange">
                      {invoice.invoiceNo}
                    </Link>
                  </td>
                  <td className={`${tdClass} hidden whitespace-nowrap md:table-cell`}>
                    {formatDate(invoice.dueDate)}
                    {invoice.daysOverdue > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {invoice.daysOverdue} days late
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} hidden sm:table-cell`}>
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className={money}>{formatINR(invoice.balance)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </Table>
      )}
    </SectionCard>
  );
}

function MonthlySection({ years }: { years: string[] }) {
  const [fy, setFy] = useState(years[0]);
  const report = useMonthlyReport(fy);

  return (
    <SectionCard
      label="Monthly revenue"
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <Select
            value={fy}
            onChange={(event) => setFy(event.target.value)}
            aria-label="Financial year"
            className="h-8 w-32"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                FY {year}
              </option>
            ))}
          </Select>
          <DownloadButtons path={`/reports/monthly?fy=${fy}`} formats={['csv', 'xlsx']} />
        </div>
      }
    >
      {report.data && (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Month</th>
              <th className={moneyHead}>Invoices</th>
              <th className={moneyHead}>Billed</th>
              <th className={`${moneyHead} hidden sm:table-cell`}>Tax</th>
              <th className={moneyHead}>Received</th>
            </tr>
          </thead>
          <tbody>
            {report.data.months.map((month) => (
              <tr key={month.month}>
                <td className={`${tdClass} whitespace-nowrap`}>{month.label}</td>
                <td className={money}>{month.invoices}</td>
                <td className={money}>{formatINR(month.billed)}</td>
                <td className={`${money} hidden sm:table-cell`}>{formatINR(month.tax)}</td>
                <td className={money}>{formatINR(month.received)}</td>
              </tr>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td className={tdClass}>Total</td>
              <td className={money}>{report.data.totals.invoices}</td>
              <td className={money}>{formatINR(report.data.totals.billed)}</td>
              <td className={`${money} hidden sm:table-cell`}>
                {formatINR(report.data.totals.tax)}
              </td>
              <td className={money}>{formatINR(report.data.totals.received)}</td>
            </tr>
          </tbody>
        </Table>
      )}
    </SectionCard>
  );
}

export function ReportsPage() {
  const years = useFinancialYears();

  return (
    <>
      <PageHeader label="Insight" title="Reports" />

      <div className="space-y-6">
        <OutstandingSection />

        {years.data && <MonthlySection years={years.data.map((year) => year.fy)} />}

        <SectionCard
          label="Financial year summary"
          action={<DownloadButtons path="/reports/fy-summary" formats={['csv', 'xlsx']} />}
        >
          {years.data && (
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Year</th>
                  <th className={moneyHead}>Invoices</th>
                  <th className={moneyHead}>Billed</th>
                  <th className={`${moneyHead} hidden md:table-cell`}>Discounts</th>
                  <th className={`${moneyHead} hidden md:table-cell`}>Tax</th>
                  <th className={`${moneyHead} hidden sm:table-cell`}>Received</th>
                  <th className={moneyHead}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {years.data.map((year) => (
                  <tr key={year.fy}>
                    <td className={`${tdClass} whitespace-nowrap font-medium`}>FY {year.fy}</td>
                    <td className={money}>{year.invoices}</td>
                    <td className={money}>{formatINR(year.billed)}</td>
                    <td className={`${money} hidden md:table-cell`}>{formatINR(year.discount)}</td>
                    <td className={`${money} hidden md:table-cell`}>{formatINR(year.tax)}</td>
                    <td className={`${money} hidden sm:table-cell`}>{formatINR(year.received)}</td>
                    <td className={money}>{formatINR(year.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}
