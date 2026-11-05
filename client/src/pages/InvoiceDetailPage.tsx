import { invoiceEmailText } from '@a2/shared';
import {
  Copy,
  Download,
  FileCheck2,
  FilePen,
  Mail,
  Maximize2,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullScreenPreview } from '@/components/invoices/FullScreenPreview';
import { InvoicePreview, printInvoicePreview } from '@/components/invoices/InvoicePreview';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceTable';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { BackLink, PageHeader } from '@/components/ui/page';
import { downloadFile } from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import {
  useDeleteInvoice,
  useDuplicateInvoice,
  useFinalizeInvoice,
  useInvoice,
  useInvoiceDocument,
  useNextInvoiceNo,
  useReviseInvoice,
} from '@/lib/queries';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const document = useInvoiceDocument(id);
  const record = useInvoice(id);
  const nextNumber = useNextInvoiceNo(document.data?.invoiceDate ?? '');
  const duplicate = useDuplicateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const finalize = useFinalizeInvoice();
  const revise = useReviseInvoice();
  const [fullScreen, setFullScreen] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'finalize' | 'revise' | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (document.isPending) return <ListSkeleton />;
  if (document.isError) {
    return <ErrorState message={document.error.message} onRetry={() => document.refetch()} />;
  }

  const status = record.data?.status;
  const isDraft = status === 'DRAFT';
  const canRevise =
    user?.role === 'ADMIN' && status !== undefined && !isDraft && status !== 'CANCELLED';

  const showError = (error: Error) => toast.error(error.message);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/invoices/${id}/pdf`);
    } catch (error) {
      showError(error as Error);
    } finally {
      setDownloading(false);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(invoiceEmailText(document.data));
      toast.success('Email text copied');
    } catch {
      toast.error("We couldn't copy to the clipboard");
    }
  };

  const duplicateInvoice = () =>
    duplicate.mutate(id, {
      onSuccess: ({ id: copyId }) => {
        toast.success('Copied to a new draft');
        navigate(`/invoices/${copyId}/edit`);
      },
      onError: showError,
    });

  const confirmDelete = () =>
    deleteInvoice.mutate(id, {
      onSuccess: () => {
        toast.success('Draft deleted');
        navigate('/invoices');
      },
      onError: showError,
      onSettled: () => setDialog(null),
    });

  const confirmFinalize = () =>
    finalize.mutate(id, {
      onSuccess: async ({ invoiceNo }) => {
        toast.success(`Invoice ${invoiceNo} finalized`);
        await downloadPdf();
      },
      onError: showError,
      onSettled: () => setDialog(null),
    });

  const confirmRevise = () =>
    revise.mutate(id, {
      onSuccess: ({ id: revisionId }) => {
        toast.success('Revision started');
        navigate(`/invoices/${revisionId}/edit`);
      },
      onError: showError,
      onSettled: () => setDialog(null),
    });

  return (
    <>
      <PageHeader
        label={<BackLink to="/invoices">← Invoices</BackLink>}
        title={document.data.invoiceNo}
        subtitle={document.data.client.name}
        actions={
          <>
            {isDraft && (
              <Button onClick={() => setDialog('finalize')}>
                <FileCheck2 className="h-4 w-4" aria-hidden />
                Finalize &amp; generate PDF
              </Button>
            )}
            {isDraft && (
              <Button variant="outline" asChild>
                <Link to={`/invoices/${id}/edit`}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Link>
              </Button>
            )}
            <Button variant="outline" disabled={downloading} onClick={downloadPdf}>
              <Download className="h-4 w-4" aria-hidden />
              Download PDF
            </Button>
            <Button variant="outline" onClick={printInvoicePreview}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
            <Button variant="outline" onClick={() => setFullScreen(true)}>
              <Maximize2 className="h-4 w-4" aria-hidden />
              Full screen
            </Button>
            <Button variant="outline" disabled={duplicate.isPending} onClick={duplicateInvoice}>
              <Copy className="h-4 w-4" aria-hidden />
              Duplicate
            </Button>
            <Button variant="outline" onClick={copyEmail}>
              <Mail className="h-4 w-4" aria-hidden />
              Copy email text
            </Button>
            {canRevise && (
              <Button variant="outline" onClick={() => setDialog('revise')}>
                <FilePen className="h-4 w-4" aria-hidden />
                Create revision
              </Button>
            )}
            {isDraft && (
              <Button variant="outline" onClick={() => setDialog('delete')}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-[794px]">
        {status && (
          <div className="mb-3">
            <InvoiceStatusBadge status={status} />
          </div>
        )}
        <InvoicePreview document={document.data} />
      </div>

      {fullScreen && (
        <FullScreenPreview document={document.data} onClose={() => setFullScreen(false)} />
      )}
      <ConfirmDialog
        open={dialog === 'finalize'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Finalize this invoice?"
        description={`It will become ${nextNumber.data?.invoiceNo ?? 'the next invoice number'} and can't be edited afterwards. An admin can issue a revision if it needs changing.`}
        confirmLabel="Finalize"
        tone="primary"
        pending={finalize.isPending}
        onConfirm={confirmFinalize}
      />
      <ConfirmDialog
        open={dialog === 'revise'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Create a revision?"
        description={`This starts a new draft with the same details and payments. ${document.data.invoiceNo} stays valid until you finalize the revision, which cancels it.`}
        confirmLabel="Create revision"
        tone="primary"
        pending={revise.isPending}
        onConfirm={confirmRevise}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Delete this draft?"
        description="The draft and any advances recorded on it will be removed permanently."
        confirmLabel="Delete draft"
        pending={deleteInvoice.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
