import bcrypt from 'bcryptjs';
import {
  ClientType,
  DiscountType,
  InvoiceStatus,
  PaymentMode,
  PrismaClient,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@artificialaugmenttechnologies.com';
const CLIENT_ID = 'seed-client-agamathi';
const MILESTONE_ID = 'seed-milestone-agamathi-1';
const SAMPLE_INVOICE_NO = 'AAT/INV/2026-27/001';

const SAMPLE_TERMS = [
  '1. Payment due within 10 days of invoice date.',
  '2. Please quote the invoice number with your payment.',
  '3. Next milestone billed on delivery of remaining modules.',
].join('\n');

const CATALOG = [
  {
    title: 'UI/UX Design',
    subDescription: 'Wireframes, visual design, home page layout, 3D/dynamic effects',
    defaultRate: 8000,
    category: 'Web',
  },
  {
    title: 'Frontend Development (React)',
    subDescription: 'Home, About, Courses, Contact pages – responsive build',
    defaultRate: 12000,
    category: 'Web',
  },
  {
    title: 'Backend & SQL Database Setup',
    subDescription: 'Database design, enquiry/enrollment form APIs',
    defaultRate: 6000,
    category: 'Web',
  },
  {
    title: 'Deployment & Domain Configuration',
    subDescription: 'Hosting setup, domain mapping, SSL',
    defaultRate: 2000,
    category: 'Web',
  },
  { title: 'Workshop fee', defaultRate: 0, category: 'Training' },
  { title: 'Internship fee', defaultRate: 0, category: 'Training' },
  { title: 'Training course fee', defaultRate: 0, category: 'Training' },
];

async function seedAdmin() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('Set SEED_ADMIN_PASSWORD in server/.env before seeding.');

  // An existing admin keeps their password, so re-seeding can't lock anyone out.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: 'Admin',
      email: ADMIN_EMAIL,
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
}

async function seedSettings() {
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Artificial Augment Technologies',
      addressLine: 'Bangalore | Salem',
      phone: '+91 93443 52823',
      email: ADMIN_EMAIL,
      website: 'www.artificialaugmenttechnologies.com',
      bankAccountName: 'Account name',
      bankName: 'Bank name',
      bankAccountNo: 'Account number',
      bankIfsc: 'IFSC code',
      upiId: 'UPI ID',
      invoicePrefix: 'AAT/INV',
      nextInvoiceSeq: 2,
      currentFY: '2026-27',
      defaultTerms: SAMPLE_TERMS,
      defaultPaymentTermDays: 10,
      gstEnabledDefault: false,
    },
  });
}

async function seedCatalog() {
  for (const item of CATALOG) {
    await prisma.catalogItem.upsert({ where: { title: item.title }, update: {}, create: item });
  }
}

async function seedSampleInvoice() {
  const client = await prisma.client.upsert({
    where: { id: CLIENT_ID },
    update: {},
    create: {
      id: CLIENT_ID,
      name: 'Agamathi Educationals',
      alias: 'Agamathikalvi',
      type: ClientType.PARTNER,
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2',
      city: 'City',
      state: 'State',
      pin: '000000',
      contactPerson: 'Contact person',
      phone: '+91 00000 00000',
      email: 'contact@example.com',
    },
  });

  const project = await prisma.project.upsert({
    where: { refCode: 'AAT/PRJ/AGM-WEB' },
    update: {},
    create: {
      clientId: client.id,
      name: 'Agamathikalvi Website Redevelopment',
      refCode: 'AAT/PRJ/AGM-WEB',
      description:
        'New website built from scratch in React with SQL backend, replacing agamathikalvi.com.',
      startDate: new Date('2026-10-01'),
    },
  });

  const milestone = await prisma.milestone.upsert({
    where: { id: MILESTONE_ID },
    update: {},
    create: {
      id: MILESTONE_ID,
      projectId: project.id,
      name: 'First Delivery',
      plannedAmount: 26000,
      order: 1,
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNo: SAMPLE_INVOICE_NO },
    update: {},
    create: {
      invoiceNo: SAMPLE_INVOICE_NO,
      clientId: client.id,
      projectId: project.id,
      milestoneId: milestone.id,
      subtitle: 'Milestone 1 · First Delivery',
      invoiceDate: new Date('2026-10-27'),
      dueDate: new Date('2026-11-06'),
      paymentTermDays: 10,
      status: InvoiceStatus.PARTIALLY_PAID,
      gstEnabled: false,
      subtotal: 28000,
      discountTotal: 2000,
      taxTotal: 0,
      total: 26000,
      advanceTotal: 10000,
      balanceDue: 16000,
      amountInWords: 'Rupees Sixteen Thousand Only',
      terms: SAMPLE_TERMS,
      finalizedAt: new Date('2026-10-27'),
      items: {
        create: CATALOG.slice(0, 4).map((item, index) => ({
          order: index + 1,
          title: item.title,
          subDescription: item.subDescription,
          qty: 1,
          rate: item.defaultRate,
          amount: item.defaultRate,
        })),
      },
      discounts: {
        create: {
          label: 'Partner discount',
          type: DiscountType.FLAT,
          value: 2000,
          computedAmount: 2000,
        },
      },
      payments: {
        create: {
          date: new Date('2026-10-27'),
          amount: 10000,
          mode: PaymentMode.BANK_TRANSFER,
          notes: 'Advance received',
          isAdvance: true,
        },
      },
    },
  });
}

async function main() {
  await seedAdmin();
  await seedSettings();
  await seedCatalog();
  await seedSampleInvoice();
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
