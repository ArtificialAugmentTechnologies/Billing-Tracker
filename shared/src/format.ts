const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Indian grouping with two decimals, e.g. ₹ 1,25,000.00 */
export function formatINR(amount: number) {
  return `₹ ${inr.format(amount)}`;
}

/** Formats a YYYY-MM-DD date as "27 Oct 2026". */
export function formatDate(date: string) {
  return longDate.format(new Date(date));
}
