import { financialYear, nextInvoiceNumber, type NumberingSettings } from '@a2/shared';
import type { Prisma } from '@prisma/client';

/**
 * Allocates the next invoice number. Call it inside the transaction that creates the invoice:
 * the settings row stays locked until that commits, so two users can't get the same number,
 * and a rolled-back invoice doesn't use one up.
 */
export async function allocateInvoiceNo(tx: Prisma.TransactionClient, invoiceDate: string) {
  const [settings] = await tx.$queryRaw<NumberingSettings[]>`
    SELECT "invoicePrefix", "nextInvoiceSeq", "currentFY"
    FROM "CompanySettings"
    WHERE id = 1
    FOR UPDATE
  `;
  if (!settings) throw new Error('Company settings are missing. Run the database seed.');

  const fy = financialYear(invoiceDate);
  const earlier =
    fy < settings.currentFY
      ? await tx.invoice.findMany({
          where: { invoiceNo: { startsWith: `${settings.invoicePrefix}/${fy}/` } },
          select: { invoiceNo: true },
        })
      : [];

  const next = nextInvoiceNumber(
    settings,
    invoiceDate,
    earlier.map((invoice) => invoice.invoiceNo),
  );

  if (next.settings) {
    await tx.companySettings.update({ where: { id: 1 }, data: next.settings });
  }
  return next.invoiceNo;
}
