/** Indian financial year (April to March) for a YYYY-MM-DD date, e.g. "2026-27". */
export function financialYear(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const startYear = month >= 4 ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYear}`;
}

export function formatInvoiceNo(prefix: string, fy: string, seq: number) {
  return `${prefix}/${fy}/${String(seq).padStart(3, '0')}`;
}

export interface NumberingSettings {
  invoicePrefix: string;
  nextInvoiceSeq: number;
  currentFY: string;
}

export interface InvoiceNumber {
  invoiceNo: string;
  /** New settings to save, or null when the settings counter is unchanged. */
  settings: Pick<NumberingSettings, 'nextInvoiceSeq' | 'currentFY'> | null;
}

/**
 * Works out the next invoice number for a date.
 *
 * The settings counter tracks the current financial year, and a later year restarts it at 001.
 * A backdated invoice belongs to an earlier year's series, so it continues from that year's
 * highest existing number, passed in `numbersInEarlierFY`, and leaves the counter alone.
 */
export function nextInvoiceNumber(
  settings: NumberingSettings,
  invoiceDate: string,
  numbersInEarlierFY: string[] = [],
): InvoiceNumber {
  const fy = financialYear(invoiceDate);

  if (fy < settings.currentFY) {
    const highest = Math.max(
      0,
      ...numbersInEarlierFY.map((invoiceNo) => Number(invoiceNo.split('/').pop()) || 0),
    );
    return { invoiceNo: formatInvoiceNo(settings.invoicePrefix, fy, highest + 1), settings: null };
  }

  const seq = fy === settings.currentFY ? settings.nextInvoiceSeq : 1;
  return {
    invoiceNo: formatInvoiceNo(settings.invoicePrefix, fy, seq),
    settings: { nextInvoiceSeq: seq + 1, currentFY: fy },
  };
}
