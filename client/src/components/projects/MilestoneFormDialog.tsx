import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUSES,
  milestoneSchema,
  type MilestoneInput,
  type MilestonePayload,
  type MilestoneRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSaveMilestone } from '@/lib/queries';

const EMPTY: MilestoneInput = { name: '', plannedAmount: 0, dueDate: '', status: 'PENDING' };

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: MilestoneRecord;
}

export function MilestoneFormDialog({
  open,
  onOpenChange,
  projectId,
  milestone,
}: MilestoneFormDialogProps) {
  const save = useSaveMilestone(projectId, milestone?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MilestoneInput, unknown, MilestonePayload>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(milestone ? { ...milestone, dueDate: milestone.dueDate ?? '' } : EMPTY);
  }, [open, milestone, reset]);

  const onSubmit = (values: MilestonePayload) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(milestone ? 'Milestone updated' : 'Milestone added');
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={milestone ? 'Edit milestone' : 'New milestone'}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          id="milestone-name"
          label="Name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input id="milestone-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field
          id="milestone-amount"
          label="Planned amount (₹)"
          error={errors.plannedAmount?.message}
        >
          <Input
            id="milestone-amount"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.plannedAmount)}
            {...register('plannedAmount')}
          />
        </Field>
        <Field id="milestone-due" label="Due date" error={errors.dueDate?.message}>
          <Input id="milestone-due" type="date" {...register('dueDate')} />
        </Field>
        <Field id="milestone-status" label="Status" className="sm:col-span-2">
          <Select id="milestone-status" {...register('status')}>
            {MILESTONE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MILESTONE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {milestone ? 'Save changes' : 'Add milestone'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
