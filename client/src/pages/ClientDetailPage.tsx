import { CLIENT_TYPE_LABELS } from '@a2/shared';
import { Download, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { BackLink, PageHeader, SectionCard, StatCard } from '@/components/ui/page';
import { downloadFile } from '@/lib/api';
import { useClient, useDeleteClient } from '@/lib/queries';

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const client = useClient(id);
  const deleteClient = useDeleteClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingProject, setAddingProject] = useState(false);

  if (client.isPending) return <ListSkeleton />;
  if (client.isError) {
    return <ErrorState message={client.error.message} onRetry={() => client.refetch()} />;
  }

  const c = client.data;
  const address = [
    c.addressLine1,
    c.addressLine2,
    [c.city, c.state].filter(Boolean).join(', '),
    c.pin,
  ].filter(Boolean);
  const details = [
    ['Contact', c.contactPerson],
    ['Phone', c.phone],
    ['Email', c.email],
    ['GSTIN', c.gstin],
    ['Notes', c.notes],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const downloadStatement = () =>
    downloadFile(`/reports/outstanding?clientId=${c.id}&format=pdf`).catch((error: Error) =>
      toast.error(error.message),
    );

  const confirmDelete = () =>
    deleteClient.mutate(id, {
      onSuccess: () => {
        toast.success('Client deleted');
        navigate('/clients');
      },
      onError: (error) => {
        toast.error(error.message);
        setDeleting(false);
      },
    });

  const addProjectButton = (
    <Button size="sm" onClick={() => setAddingProject(true)}>
      <Plus className="h-4 w-4" aria-hidden />
      New project
    </Button>
  );

  return (
    <>
      <PageHeader
        label={<BackLink to="/clients">← {CLIENT_TYPE_LABELS[c.type]} client</BackLink>}
        title={c.name}
        subtitle={c.alias}
        actions={
          <>
            {c.outstanding > 0 && (
              <Button variant="outline" onClick={downloadStatement}>
                <Download className="h-4 w-4" aria-hidden />
                Statement
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total billed" amount={c.billed} />
          <StatCard label="Paid" amount={c.received} />
          <StatCard label="Outstanding" amount={c.outstanding} accent={c.outstanding > 0} />
        </div>

        <Card className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <p className="section-label">Address</p>
            <div className="mt-2 text-sm">
              {address.length ? address.map((line) => <p key={line}>{line}</p>) : <p>—</p>}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <SectionCard label="Projects" action={addProjectButton}>
          {c.projects.length ? (
            <ProjectTable projects={c.projects} />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Add a project to track its contract value and milestones."
            />
          )}
        </SectionCard>

        <SectionCard label="Invoices">
          <InvoiceTable invoices={c.invoices} />
        </SectionCard>
      </div>

      <ClientFormDialog open={editing} onOpenChange={setEditing} client={c} />
      <ProjectFormDialog
        open={addingProject}
        onOpenChange={setAddingProject}
        defaultClientId={c.id}
        onSaved={(projectId) => navigate(`/projects/${projectId}`)}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this client?"
        description={`${c.name} will be removed permanently. Clients with projects or invoices can't be deleted.`}
        confirmLabel="Delete client"
        pending={deleteClient.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
