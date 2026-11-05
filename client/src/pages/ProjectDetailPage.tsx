import { formatDate, formatINR, MILESTONE_STATUS_LABELS, type MilestoneRecord } from '@a2/shared';
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { MilestoneFormDialog } from '@/components/projects/MilestoneFormDialog';
import { ProgressBar } from '@/components/projects/ProgressBar';
import { ProjectBadge } from '@/components/projects/ProjectBadge';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import {
  BackLink,
  PageHeader,
  SectionCard,
  StatCard,
  Table,
  tdClass,
  thClass,
} from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDeleteMilestone, useDeleteProject, useProject } from '@/lib/queries';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const project = useProject(id);
  const deleteProject = useDeleteProject();
  const deleteMilestone = useDeleteMilestone();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState<{ milestone?: MilestoneRecord } | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<MilestoneRecord | null>(null);

  if (project.isPending) return <ListSkeleton />;
  if (project.isError) {
    return <ErrorState message={project.error.message} onRetry={() => project.refetch()} />;
  }

  const p = project.data;

  const confirmDeleteProject = () =>
    deleteProject.mutate(id, {
      onSuccess: () => {
        toast.success('Project deleted');
        navigate('/projects');
      },
      onError: (error) => {
        toast.error(error.message);
        setDeleting(false);
      },
    });

  const confirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    deleteMilestone.mutate(milestoneToDelete.id, {
      onSuccess: () => toast.success('Milestone deleted'),
      onError: (error) => toast.error(error.message),
      onSettled: () => setMilestoneToDelete(null),
    });
  };

  const addMilestoneButton = (
    <Button size="sm" onClick={() => setMilestoneForm({})}>
      <Plus className="h-4 w-4" aria-hidden />
      New milestone
    </Button>
  );

  return (
    <>
      <PageHeader
        label={<BackLink to="/projects">← {p.refCode}</BackLink>}
        title={p.name}
        actions={
          <>
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
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <ProjectBadge status={p.status} />
            <Link to={`/clients/${p.clientId}`} className="font-medium hover:text-orange">
              {p.clientName}
            </Link>
            {p.startDate && (
              <span className="text-muted-foreground">Started {formatDate(p.startDate)}</span>
            )}
          </div>
          {p.description && <p className="mt-3 text-sm">{p.description}</p>}
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Contract value" amount={p.contractValue} />
          <StatCard label="Billed" amount={p.billed} />
          <StatCard label="Received" amount={p.received} />
        </div>

        <Card className="space-y-4 p-5">
          <p className="section-label">Progress against contract</p>
          {p.contractValue > 0 ? (
            <>
              <ProgressBar
                label="Billed"
                value={p.billed}
                max={p.contractValue}
                barClassName="bg-navy dark:bg-cream"
              />
              <ProgressBar
                label="Received"
                value={p.received}
                max={p.contractValue}
                barClassName="bg-orange"
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a contract value to see progress against it.
            </p>
          )}
        </Card>

        <SectionCard label="Milestones" action={addMilestoneButton}>
          {p.milestones.length ? (
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Name</th>
                  <th className={`${thClass} text-right`}>Planned</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Due</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.milestones.map((milestone, index) => (
                  <tr key={milestone.id}>
                    <td className={tdClass}>{index + 1}</td>
                    <td className={`${tdClass} font-medium`}>{milestone.name}</td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      {formatINR(milestone.plannedAmount)}
                    </td>
                    <td className={`${tdClass} hidden whitespace-nowrap sm:table-cell`}>
                      {milestone.dueDate ? formatDate(milestone.dueDate) : '—'}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge>{MILESTONE_STATUS_LABELS[milestone.status]}</StatusBadge>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${milestone.name}`}
                        onClick={() => setMilestoneForm({ milestone })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${milestone.name}`}
                        onClick={() => setMilestoneToDelete(milestone)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Flag}
              title="No milestones yet"
              description="Break the project into milestones so invoices can be linked to them."
            />
          )}
        </SectionCard>

        <SectionCard label="Invoices">
          <InvoiceTable invoices={p.invoices} />
        </SectionCard>
      </div>

      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={p} />
      <MilestoneFormDialog
        open={milestoneForm !== null}
        onOpenChange={(open) => !open && setMilestoneForm(null)}
        projectId={p.id}
        milestone={milestoneForm?.milestone}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this project?"
        description={`${p.name} and its milestones will be removed permanently. Projects with invoices can't be deleted.`}
        confirmLabel="Delete project"
        pending={deleteProject.isPending}
        onConfirm={confirmDeleteProject}
      />
      <ConfirmDialog
        open={milestoneToDelete !== null}
        onOpenChange={(open) => !open && setMilestoneToDelete(null)}
        title="Delete this milestone?"
        description={`${milestoneToDelete?.name ?? 'This milestone'} will be removed permanently. Milestones with invoices can't be deleted.`}
        confirmLabel="Delete milestone"
        pending={deleteMilestone.isPending}
        onConfirm={confirmDeleteMilestone}
      />
    </>
  );
}
