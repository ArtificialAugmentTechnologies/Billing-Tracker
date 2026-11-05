import { settingsSchema, signatureSchema, type SettingsRecord } from '@a2/shared';
import type { CompanySettings } from '@prisma/client';
import { Router } from 'express';
import { audit } from '../lib/audit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/auth';

const toRecord = (settings: CompanySettings): SettingsRecord => ({
  name: settings.name,
  addressLine: settings.addressLine,
  phone: settings.phone,
  email: settings.email,
  website: settings.website,
  gstin: settings.gstin,
  bankAccountName: settings.bankAccountName,
  bankName: settings.bankName,
  bankAccountNo: settings.bankAccountNo,
  bankIfsc: settings.bankIfsc,
  upiId: settings.upiId,
  invoicePrefix: settings.invoicePrefix,
  nextInvoiceSeq: settings.nextInvoiceSeq,
  defaultTerms: settings.defaultTerms,
  defaultPaymentTermDays: settings.defaultPaymentTermDays,
  gstEnabledDefault: settings.gstEnabledDefault,
  currentFY: settings.currentFY,
  signatureUrl: settings.signatureUrl,
});

export const settingsRouter = Router();

settingsRouter.use(requireRole('ADMIN'));

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(toRecord(await prisma.companySettings.findUniqueOrThrow({ where: { id: 1 } })));
  }),
);

settingsRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const input = settingsSchema.parse(req.body);

    const settings = await prisma.$transaction(async (tx) => {
      // The same lock numbering uses, so a finalize can't slip in between the check and the save.
      await tx.$queryRaw`SELECT id FROM "CompanySettings" WHERE id = 1 FOR UPDATE`;
      const { currentFY } = await tx.companySettings.findUniqueOrThrow({ where: { id: 1 } });

      const used = await tx.invoice.findMany({
        where: { invoiceNo: { startsWith: `${input.invoicePrefix}/${currentFY}/` } },
        select: { invoiceNo: true },
      });
      const highest = Math.max(
        0,
        ...used.map((invoice) => Number(invoice.invoiceNo.split('/').pop()) || 0),
      );
      if (input.nextInvoiceSeq <= highest) {
        throw new HttpError(
          400,
          `Invoice ${highest} already exists in ${currentFY}, so the next number must be higher`,
        );
      }

      return tx.companySettings.update({ where: { id: 1 }, data: input });
    });

    await audit(req.user?.id, 'CompanySettings', '1', 'UPDATE');
    res.json(toRecord(settings));
  }),
);

settingsRouter.put(
  '/signature',
  asyncHandler(async (req, res) => {
    const { signatureUrl } = signatureSchema.parse(req.body);
    await prisma.companySettings.update({ where: { id: 1 }, data: { signatureUrl } });
    await audit(req.user?.id, 'CompanySettings', '1', 'UPDATE');
    res.status(204).end();
  }),
);
