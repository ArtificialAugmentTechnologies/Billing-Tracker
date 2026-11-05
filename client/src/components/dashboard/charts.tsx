import {
  formatCompactINR,
  formatINR,
  INVOICE_STATUS_LABELS,
  type DashboardData,
  type InvoiceStatus,
} from '@a2/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Table, tdClass, thClass } from '@/components/ui/page';

const color = (token: string) => `rgb(var(--chart-${token}))`;

const SERIES = [
  { key: 'billed', label: 'Billed', fill: color('billed') },
  { key: 'received', label: 'Received', fill: color('received') },
] as const;

const STATUS_COLORS: Partial<Record<InvoiceStatus, string>> = {
  PAID: color('paid'),
  PARTIALLY_PAID: color('partial'),
  SENT: color('sent'),
  OVERDUE: color('overdue'),
};

const tick = { fill: 'rgb(var(--muted-foreground))', fontSize: 12 };

function Swatch({ fill }: { fill: string }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: fill }} />;
}

function TooltipCard({ title, rows }: { title?: string; rows: [string, string, string][] }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-card">
      {title && <p className="mb-1 font-medium">{title}</p>}
      {rows.map(([label, value, fill]) => (
        <p key={label} className="flex items-center gap-2 py-0.5">
          <Swatch fill={fill} />
          <span className="text-muted-foreground">{label}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">{value}</span>
        </p>
      ))}
    </div>
  );
}

function MonthlyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipCard
      title={String(label)}
      rows={SERIES.map(({ key, label: name, fill }) => [
        name,
        formatINR(Number(payload.find((entry) => entry.dataKey === key)?.value ?? 0)),
        fill,
      ])}
    />
  );
}

export function MonthlyChart({ data }: { data: DashboardData['monthly'] }) {
  return (
    <div>
      <ul aria-hidden className="mb-3 flex gap-4 text-xs text-muted-foreground">
        {SERIES.map(({ key, label, fill }) => (
          <li key={key} className="flex items-center gap-1.5">
            <Swatch fill={fill} />
            {label}
          </li>
        ))}
      </ul>

      <div
        role="img"
        aria-label="Bar chart of billed and received amounts for the last 12 months. The same figures are in the table below."
        className="h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgb(var(--border))" />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: 'rgb(var(--border))' }}
              minTickGap={16}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactINR}
              width={44}
            />
            <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgb(var(--muted))' }} />
            {SERIES.map(({ key, fill }) => (
              <Bar
                key={key}
                dataKey={key}
                fill={fill}
                maxBarSize={14}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">View as table</summary>
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Month</th>
              <th className={`${thClass} text-right`}>Billed</th>
              <th className={`${thClass} text-right`}>Received</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month}>
                <td className={tdClass}>{row.label}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatINR(row.billed)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatINR(row.received)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </details>
    </div>
  );
}

function StatusTooltip({ active, payload }: TooltipProps<number, string>) {
  const entry = payload?.[0]?.payload as DashboardData['statusBreakdown'][number] | undefined;
  if (!active || !entry) return null;
  return (
    <TooltipCard
      rows={[
        [
          INVOICE_STATUS_LABELS[entry.status],
          `${entry.count} · ${formatINR(entry.amount)}`,
          STATUS_COLORS[entry.status] ?? '',
        ],
      ]}
    />
  );
}

export function StatusChart({ data }: { data: DashboardData['statusBreakdown'] }) {
  const shown = data.filter((entry) => entry.count > 0);
  const total = shown.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div
        role="img"
        aria-label={`Donut chart of ${total} issued invoices by status. The same figures are listed beside it.`}
        className="relative h-44 w-44 shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shown}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              outerRadius={84}
              startAngle={90}
              endAngle={-270}
              stroke="rgb(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {shown.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip content={<StatusTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-extrabold">{total}</span>
          <span className="text-xs text-muted-foreground">issued</span>
        </div>
      </div>

      <ul className="min-w-40 flex-1 space-y-2 text-sm">
        {data.map((entry) => (
          <li key={entry.status} className="flex items-center gap-2">
            <Swatch fill={STATUS_COLORS[entry.status] ?? ''} />
            <span>{INVOICE_STATUS_LABELS[entry.status]}</span>
            <span className="ml-auto font-medium tabular-nums">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Plain bars, so long client names are never clipped and every value is printed. */
export function TopClients({ data }: { data: DashboardData['topClients'] }) {
  const highest = Math.max(...data.map((client) => client.billed), 1);

  return (
    <ul className="space-y-3 text-sm">
      {data.map((client) => (
        <li key={client.id}>
          <div className="mb-1 flex justify-between gap-3">
            <span className="min-w-0 truncate" title={client.name}>
              {client.name}
            </span>
            <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">
              {formatINR(client.billed)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${(client.billed / highest) * 100}%`,
                background: color('billed'),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
