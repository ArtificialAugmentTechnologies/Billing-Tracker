import {
  formatINR,
  invoiceSchema,
  type InvoiceBuilderDefaults,
  type InvoiceInput,
  type InvoicePayload,
  type InvoiceRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileCheck2, Maximize2, Save } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BackLink, PageHeader } from '@/components/ui/page';
import { downloadFile } from '@/lib/api';
import { buildPreviewDocument, todayLocal } from '@/lib/invoice-preview';
import {
  useClient,
  useFinalizeInvoice,
  useNextInvoiceNo,
  useProject,
  useSaveInvoice,
} from '@/lib/queries';
import { cn } from '@/lib/utils';
import { FullScreenPreview } from '../FullScreenPreview';
import { InvoicePreview } from '../InvoicePreview';
import { AdvancesSection, DiscountsSection, NotesSection, TaxSection } from './AdjustmentSections';
import { DetailsSection } from './DetailsSection';
import { LineItemsSection } from './LineItemsSection';

function newInvoiceValues(defaults: InvoiceBuilderDefaults): InvoiceInput {
  return {
    clientId: '',
    projectId: null,
    milestoneId: null,
    subtitle: '',
    invoiceDate: todayLocal(),
    paymentTermDays: defaults.defaultPaymentTermDays,
    gstEnabled: defaults.gstEnabledDefault,
    gstType: defaults.gstEnabledDefault ? 'CGST_SGST' : null,
    gstRate: defaults.gstEnabledDefault ? 18 : null,
    items: [{ title: '', subDescription: '', qty: 1, rate: 0 }],
    discounts: [],
    advances: [],
    terms: defaults.defaultTerms,
    notes: '',
    ribbonText: null,
  };
}

interface InvoiceBuilderProps {
  defaults: InvoiceBuilderDefaults;
  invoice?: InvoiceRecord;
}

export function InvoiceBuilder({ defaults, invoice }: InvoiceBuilderProps) {
  const navigate = useNavigate();
  const save = useSaveInvoice(invoice?.id);
  const finalize = useFinalizeInvoice();
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [fullScreen, setFullScreen] = useState(false);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const busy = save.isPending || finalize.isPending;

  const form = useForm<InvoiceInput, unknown, InvoicePayload>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice ?? newInvoiceValues(defaults),
  });
  const { control, handleSubmit, formState } = form;

  const values = useWatch({ control }) as InvoiceInput;
  const deferredValues = useDeferredValue(values);

  const { data: client } = useClient(values.clientId ?? '');
  const { data: project } = useProject(values.projectId ?? '');
  const { data: nextNumber } = useNextInvoiceNo(values.invoiceDate ?? '');
  const invoiceNo = nextNumber?.invoiceNo ?? '—';

  const document = useMemo(
    () =>
      buildPreviewDocument(deferredValues, {
        company: defaults.company,
        client: deferredValues.clientId ? client : undefined,
        project: deferredValues.projectId ? project : undefined,
        invoiceNo,
      }),
    [deferredValues, defaults.company, client, project, invoiceNo],
  );

  // Warns before closing the tab with unsaved work.
  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formState.isDirty]);

  const onSubmit = handleSubmit(
    (payload) =>
      save.mutate(payload, {
        onSuccess: ({ id }) => {
          toast.success(invoice ? 'Draft saved' : 'Draft created');
          navigate(`/invoices/${id}`);
        },
        onError: (error) => toast.error(error.message),
      }),
    () => toast.error('Please fix the highlighted fields'),
  );

  /** Saves the latest edits, issues the invoice, then downloads its PDF. */
  const finalizeNow = handleSubmit(
    async (payload) => {
      let savedId = invoice?.id;
      try {
        savedId = (await save.mutateAsync(payload)).id;
        const { invoiceNo: issuedNo } = await finalize.mutateAsync(savedId);
        toast.success(`Invoice ${issuedNo} finalized`);
        await downloadFile(`/invoices/${savedId}/pdf`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        setConfirmingFinalize(false);
      }
      if (savedId) navigate(`/invoices/${savedId}`);
    },
    () => {
      setConfirmingFinalize(false);
      toast.error('Please fix the highlighted fields');
    },
  );

  const saveButton = (
    <Button type="button" variant="outline" disabled={busy} onClick={onSubmit}>
      <Save className="h-4 w-4" aria-hidden />
      Save as draft
    </Button>
  );
  const finalizeButton = (
    <Button type="button" disabled={busy} onClick={() => setConfirmingFinalize(true)}>
      <FileCheck2 className="h-4 w-4" aria-hidden />
      Finalize &amp; generate PDF
    </Button>
  );

  return (
    <FormProvider {...form}>
      <PageHeader
        label={<BackLink to="/invoices">← Invoices</BackLink>}
        title={invoice ? 'Edit draft' : 'New invoice'}
        subtitle={`Balance due ${formatINR(document.totals.balanceDue)}`}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setFullScreen(true)}>
              <Maximize2 className="h-4 w-4" aria-hidden />
              Full screen
            </Button>
            {saveButton}
            {finalizeButton}
          </>
        }
      />

      <div role="tablist" aria-label="Builder view" className="mb-4 flex gap-2 xl:hidden">
        {(['form', 'preview'] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            role="tab"
            aria-selected={view === tab}
            variant={view === tab ? 'primary' : 'outline'}
            size="sm"
            className="flex-1 capitalize"
            onClick={() => setView(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form
          noValidate
          onSubmit={onSubmit}
          className={cn('min-w-0 space-y-4', view === 'preview' && 'hidden xl:block')}
        >
          <DetailsSection project={project} invoiceNo={invoiceNo} />
          <LineItemsSection totals={document.totals} />
          <DiscountsSection totals={document.totals} />
          <TaxSection totals={document.totals} />
          <AdvancesSection totals={document.totals} />
          <NotesSection />
          <div className="flex flex-wrap justify-end gap-2">
            {saveButton}
            {finalizeButton}
          </div>
        </form>

        <div className={cn('min-w-0 xl:sticky xl:top-0', view === 'form' && 'hidden xl:block')}>
          <InvoicePreview document={document} />
        </div>
      </div>

      {fullScreen && <FullScreenPreview document={document} onClose={() => setFullScreen(false)} />}
      <ConfirmDialog
        open={confirmingFinalize}
        onOpenChange={setConfirmingFinalize}
        title="Finalize this invoice?"
        description={`It will become ${invoiceNo} and can't be edited afterwards. An admin can issue a revision if it needs changing.`}
        confirmLabel="Finalize"
        tone="primary"
        pending={busy}
        onConfirm={finalizeNow}
      />
    </FormProvider>
  );
}
