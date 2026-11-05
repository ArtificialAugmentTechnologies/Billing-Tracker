import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectSchema,
  suggestRefCode,
  type ProjectDetail,
  type ProjectInput,
  type ProjectPayload,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useClients, useSaveProject } from '@/lib/queries';

const emptyProject = (clientId = ''): ProjectInput => ({
  clientId,
  name: '',
  refCode: '',
  description: '',
  contractValue: 0,
  startDate: '',
  status: 'ACTIVE',
});

const toFormValues = (project: ProjectDetail): ProjectInput => ({
  clientId: project.clientId,
  name: project.name,
  refCode: project.refCode,
  description: project.description ?? '',
  contractValue: project.contractValue,
  startDate: project.startDate ?? '',
  status: project.status,
});

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDetail;
  defaultClientId?: string;
  onSaved?: (id: string) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  defaultClientId,
  onSaved,
}: ProjectFormDialogProps) {
  const { data: clients = [] } = useClients();
  const save = useSaveProject(project?.id);
  const refEdited = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProjectInput, unknown, ProjectPayload>({
    resolver: zodResolver(projectSchema),
    defaultValues: emptyProject(),
  });

  useEffect(() => {
    if (!open) return;
    refEdited.current = Boolean(project);
    reset(project ? toFormValues(project) : emptyProject(defaultClientId));
  }, [open, project, defaultClientId, reset]);

  const clientId = useWatch({ control, name: 'clientId' });
  const name = useWatch({ control, name: 'name' });

  // The code follows the client and name until someone types their own.
  useEffect(() => {
    if (refEdited.current) return;
    const client = clients.find((candidate) => candidate.id === clientId);
    setValue('refCode', client ? suggestRefCode(client.alias || client.name, name) : '');
  }, [clients, clientId, name, setValue]);

  const onSubmit = (values: ProjectPayload) =>
    save.mutate(values, {
      onSuccess: ({ id }) => {
        toast.success(project ? 'Project updated' : 'Project added');
        onOpenChange(false);
        onSaved?.(id);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? 'Edit project' : 'New project'}
      className="max-w-2xl"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          id="project-client"
          label="Client"
          error={errors.clientId?.message}
          className="sm:col-span-2"
        >
          <Select
            id="project-client"
            aria-invalid={Boolean(errors.clientId)}
            {...register('clientId')}
          >
            <option value="">Choose a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="project-name"
          label="Project name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input id="project-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field id="project-ref" label="Reference code" error={errors.refCode?.message}>
          <Input
            id="project-ref"
            aria-invalid={Boolean(errors.refCode)}
            {...register('refCode', {
              onChange: () => {
                refEdited.current = true;
              },
            })}
          />
        </Field>
        <Field
          id="project-value"
          label="Total contract value (₹)"
          error={errors.contractValue?.message}
        >
          <Input
            id="project-value"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.contractValue)}
            {...register('contractValue')}
          />
        </Field>
        <Field id="project-start" label="Start date" error={errors.startDate?.message}>
          <Input id="project-start" type="date" {...register('startDate')} />
        </Field>
        <Field id="project-status" label="Status">
          <Select id="project-status" {...register('status')}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="project-description"
          label="Description"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <Textarea id="project-description" {...register('description')} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {project ? 'Save changes' : 'Add project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
