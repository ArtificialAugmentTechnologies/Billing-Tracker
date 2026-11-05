import {
  addDays,
  formatDate,
  PAYMENT_TERM_OPTIONS,
  type InvoiceInput,
  type InvoicePayload,
  type ProjectDetail,
} from '@a2/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useClients, useProjects } from '@/lib/queries';
import { BuilderSection } from './SectionCard';

const CUSTOM = 'custom';

interface DetailsSectionProps {
  project?: ProjectDetail;
  invoiceNo: string;
}

export function DetailsSection({ project, invoiceNo }: DetailsSectionProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<InvoiceInput, unknown, InvoicePayload>();
  const { data: clients = [] } = useClients();
  const [addingClient, setAddingClient] = useState(false);

  const clientId = useWatch({ control, name: 'clientId' });
  const invoiceDate = useWatch({ control, name: 'invoiceDate' });
  const paymentTermDays = useWatch({ control, name: 'paymentTermDays' });
  const { data: projects = [] } = useProjects({ clientId: clientId || undefined });

  const days = Number(paymentTermDays);
  const presetTerm = PAYMENT_TERM_OPTIONS.some((option) => option === days);
  const [customTerm, setCustomTerm] = useState(!presetTerm);

  const dueDate =
    invoiceDate && Number.isInteger(days) && !Number.isNaN(Date.parse(invoiceDate))
      ? addDays(invoiceDate, days)
      : null;

  const options = { shouldDirty: true };
  const chooseClient = (id: string) => {
    setValue('clientId', id, { ...options, shouldValidate: true });
    setValue('projectId', null, options);
    setValue('milestoneId', null, options);
    setValue('subtitle', '', options);
  };

  return (
    <BuilderSection label="Invoice details">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="invoice-client"
          label="Client"
          error={errors.clientId?.message}
          className="sm:col-span-2"
        >
          <div className="flex gap-2">
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  id="invoice-client"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => chooseClient(event.target.value)}
                  aria-invalid={Boolean(errors.clientId)}
                >
                  <option value="">Choose a client</option>
                  {clients.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setAddingClient(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              New client
            </Button>
          </div>
        </Field>

        <Field id="invoice-project" label="Project">
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Select
                id="invoice-project"
                value={field.value ?? ''}
                disabled={!clientId}
                onChange={(event) => {
                  setValue('projectId', event.target.value || null, options);
                  setValue('milestoneId', null, options);
                  setValue('subtitle', '', options);
                }}
              >
                <option value="">No project</option>
                {projects.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        <Field id="invoice-milestone" label="Milestone">
          <Controller
            control={control}
            name="milestoneId"
            render={({ field }) => (
              <Select
                id="invoice-milestone"
                value={field.value ?? ''}
                disabled={!project?.milestones.length}
                onChange={(event) => {
                  const id = event.target.value;
                  const index = project?.milestones.findIndex((m) => m.id === id) ?? -1;
                  const milestone = project?.milestones[index];
                  setValue('milestoneId', id || null, options);
                  setValue(
                    'subtitle',
                    milestone ? `Milestone ${index + 1} · ${milestone.name}` : '',
                    options,
                  );
                }}
              >
                <option value="">No milestone</option>
                {project?.milestones.map((milestone, index) => (
                  <option key={milestone.id} value={milestone.id}>
                    {index + 1}. {milestone.name}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        <Field
          id="invoice-subtitle"
          label="Subtitle"
          error={errors.subtitle?.message}
          className="sm:col-span-2"
        >
          <Input
            id="invoice-subtitle"
            placeholder="e.g. Milestone 1 · First Delivery"
            {...register('subtitle')}
          />
        </Field>

        <Field id="invoice-date" label="Invoice date" error={errors.invoiceDate?.message}>
          <Input
            id="invoice-date"
            type="date"
            aria-invalid={Boolean(errors.invoiceDate)}
            {...register('invoiceDate')}
          />
        </Field>

        <Field id="invoice-term" label="Payment terms" error={errors.paymentTermDays?.message}>
          <div className="flex gap-2">
            <Select
              id="invoice-term"
              value={customTerm ? CUSTOM : String(paymentTermDays)}
              onChange={(event) => {
                const custom = event.target.value === CUSTOM;
                setCustomTerm(custom);
                if (!custom) {
                  setValue('paymentTermDays', Number(event.target.value), options);
                }
              }}
            >
              {PAYMENT_TERM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Net {option}
                </option>
              ))}
              <option value={CUSTOM}>Custom</option>
            </Select>
            {customTerm && (
              <Input
                type="number"
                min="0"
                aria-label="Payment term in days"
                aria-invalid={Boolean(errors.paymentTermDays)}
                className="w-24"
                {...register('paymentTermDays')}
              />
            )}
          </div>
        </Field>

        <dl className="grid gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm sm:col-span-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Due date</dt>
            <dd className="font-medium">{dueDate ? formatDate(dueDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Number when finalized</dt>
            <dd className="break-words font-medium">{invoiceNo}</dd>
          </div>
        </dl>
      </div>

      <ClientFormDialog
        open={addingClient}
        onOpenChange={setAddingClient}
        onSaved={(saved) => chooseClient(saved.id)}
      />
    </BuilderSection>
  );
}
