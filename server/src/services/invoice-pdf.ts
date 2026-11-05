import { renderInvoiceHtml } from '@a2/shared';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { renderPdf } from '../pdf/render';
import { loadInvoiceDocument } from './invoice-document';

const STORAGE_DIR = fileURLToPath(new URL('../../storage/invoices/', import.meta.url));

const toFilename = (invoiceNo: string) => `${invoiceNo.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;

async function readStored(name: string | null) {
  if (!name) return null;
  try {
    return await readFile(`${STORAGE_DIR}${name}`);
  } catch {
    return null; // The file is gone, so it gets generated again.
  }
}

/**
 * Finalized invoices keep the file made when they were issued, so a later change to the company
 * settings can't alter them. Drafts are rendered fresh each time and never stored.
 */
export async function getInvoicePdf(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { invoiceNo: true, status: true, pdfPath: true },
  });
  if (!invoice) throw new HttpError(404, 'Invoice not found');

  const filename = toFilename(invoice.invoiceNo);
  const stored = await readStored(invoice.pdfPath);
  if (stored) return { pdf: stored, filename };

  const pdf = Buffer.from(await renderPdf(renderInvoiceHtml(await loadInvoiceDocument(id))));
  if (invoice.status !== 'DRAFT') {
    const pdfPath = `${id}.pdf`;
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(`${STORAGE_DIR}${pdfPath}`, pdf);
    await prisma.invoice.update({ where: { id }, data: { pdfPath } });
  }
  return { pdf, filename };
}
