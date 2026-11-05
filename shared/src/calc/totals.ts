import { amountInWords } from './words';

export const DISCOUNT_TYPES = ['PERCENT', 'FLAT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const GST_TYPES = ['CGST_SGST', 'IGST'] as const;
export type GstType = (typeof GST_TYPES)[number];

export const DEFAULT_GST_RATE = 18;

export interface LineItemInput {
  qty: number;
  rate: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
}

export interface DiscountInput {
  label: string;
  type: DiscountType;
  value: number;
}

export interface TaxInput {
  enabled: boolean;
  type?: GstType | null;
  /** Total rate: 18 means 18% IGST, or 9% CGST plus 9% SGST. */
  rate?: number | null;
}

export interface InvoiceCalcInput {
  items: LineItemInput[];
  discounts?: DiscountInput[];
  tax?: TaxInput;
  advances?: number[];
}

export interface InvoiceTotals {
  items: { gross: number; discount: number; amount: number }[];
  discounts: (DiscountInput & { computedAmount: number })[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  total: number;
  advanceTotal: number;
  balanceDue: number;
  amountInWords: string;
}

// Amounts are worked in whole paise, and quantities and percentages in hundredths, so that
// results never pick up floating-point error. Products use BigInt to stay exact at the maximum
// amount. Inputs are expected to be validated already; negatives are treated as zero.
const toHundredths = (value: number | null | undefined) =>
  BigInt(Math.max(0, Math.round((value ?? 0) * 100)));

const toRupees = (paise: bigint) => Number(paise) / 100;

/** a × b ÷ divisor, rounded to the nearest whole number with halves going up. */
const multiplyDivide = (a: bigint, b: bigint, divisor: bigint) =>
  (2n * a * b + divisor) / (2n * divisor);

const min = (a: bigint, b: bigint) => (a < b ? a : b);

const percentOf = (paise: bigint, percentHundredths: bigint) =>
  multiplyDivide(paise, percentHundredths, 10_000n);

/** The rupee value of a percentage or flat discount, never more than the amount it applies to. */
function discountOn(paise: bigint, type: DiscountType | null | undefined, value: bigint) {
  if (!type) return 0n;
  return min(type === 'PERCENT' ? percentOf(paise, value) : value, paise);
}

export function calculateInvoice({
  items,
  discounts = [],
  tax,
  advances = [],
}: InvoiceCalcInput): InvoiceTotals {
  let subtotal = 0n;
  const lines = items.map((item) => {
    const gross = multiplyDivide(toHundredths(item.qty), toHundredths(item.rate), 100n);
    const discount = discountOn(gross, item.discountType, toHundredths(item.discountValue));
    subtotal += gross - discount;
    return {
      gross: toRupees(gross),
      discount: toRupees(discount),
      amount: toRupees(gross - discount),
    };
  });

  // Every discount is worked out on the subtotal, so their order doesn't change their value.
  // Together they can't exceed the subtotal, so a later one is reduced if needed.
  let remaining = subtotal;
  const computedDiscounts = discounts.map((discount) => {
    const amount = min(
      discountOn(subtotal, discount.type, toHundredths(discount.value)),
      remaining,
    );
    remaining -= amount;
    return { ...discount, computedAmount: toRupees(amount) };
  });
  const taxable = remaining;

  let cgst = 0n;
  let sgst = 0n;
  let igst = 0n;
  if (tax?.enabled) {
    const rate = toHundredths(tax.rate ?? DEFAULT_GST_RATE);
    if (tax.type === 'IGST') {
      igst = percentOf(taxable, rate);
    } else {
      // Each half is rounded on its own, so CGST and SGST are always equal.
      cgst = multiplyDivide(taxable, rate, 20_000n);
      sgst = cgst;
    }
  }
  const taxTotal = cgst + sgst + igst;
  const total = taxable + taxTotal;

  const advanceTotal = advances.reduce((sum, advance) => sum + toHundredths(advance), 0n);
  const balanceDue = total - advanceTotal;

  return {
    items: lines,
    discounts: computedDiscounts,
    subtotal: toRupees(subtotal),
    discountTotal: toRupees(subtotal - taxable),
    taxableAmount: toRupees(taxable),
    cgst: toRupees(cgst),
    sgst: toRupees(sgst),
    igst: toRupees(igst),
    taxTotal: toRupees(taxTotal),
    total: toRupees(total),
    advanceTotal: toRupees(advanceTotal),
    balanceDue: toRupees(balanceDue),
    amountInWords: amountInWords(toRupees(balanceDue)),
  };
}
