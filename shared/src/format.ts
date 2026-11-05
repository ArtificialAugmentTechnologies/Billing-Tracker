const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Indian grouping with two decimals and no currency sign, e.g. 1,25,000.00 */
export function formatAmount(amount: number) {
  return inr.format(Math.abs(amount));
}

/** Indian grouping with two decimals, e.g. ₹ 1,25,000.00, or − ₹ 2,000.00 when negative. */
export function formatINR(amount: number) {
  const formatted = `₹ ${formatAmount(amount)}`;
  return Math.round(amount * 100) < 0 ? `− ${formatted}` : formatted;
}

/** Formats a YYYY-MM-DD date as "27 Oct 2026". */
export function formatDate(date: string) {
  return longDate.format(new Date(date));
}

/** Adds days to a YYYY-MM-DD date, e.g. for working out a due date. */
export function addDays(date: string, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
