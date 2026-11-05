import { invoiceEmailText } from '@a2/shared';
import { Copy, Mail, Maximize2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullScreenPreview } from '@/components/invoices/FullScreenPreview';
import { InvoicePreview } from '@/components/invoices/InvoicePreview';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { BackLink, PageHeader } from '@/components/ui/page';
import {
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoice,
  useInvoiceDocument,
} from '@/lib/queries';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const document = useInvoiceDocument(id);
  const record = useInvoice(id);
  const duplicate = useDuplicateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const [fullScreen, setFullScreen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (document.isPending) return <ListSkeleton />;
  if (document.isError) {
    return <ErrorState message={document.error.message} onRetry={() => document.refetch()} />;
  }

  const isDraft = record.data?.status === 'DRAFT';

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
      onError: (error) => toast.error(error.message),
    });

  const confirmDelete = () =>
    deleteInvoice.mutate(id, {
      onSuccess: () => {
        toast.success('Draft deleted');
        navigate('/invoices');
      },
      onError: (error) => {
        toast.error(error.message);
        setDeleting(false);
      },
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
              <Button asChild>
                <Link to={`/invoices/${id}/edit`}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Link>
              </Button>
            )}
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
            {isDraft && (
              <Button variant="outline" onClick={() => setDeleting(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-[794px]">
        <InvoicePreview document={document.data} />
      </div>

      {fullScreen && (
        <FullScreenPreview document={document.data} onClose={() => setFullScreen(false)} />
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this draft?"
        description="The draft and any advances recorded on it will be removed permanently."
        confirmLabel="Delete draft"
        pending={deleteInvoice.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
