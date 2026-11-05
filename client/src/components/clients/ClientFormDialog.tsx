import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
  clientSchema,
  type ClientInput,
  type ClientPayload,
  type ClientRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSaveClient } from '@/lib/queries';

const EMPTY: ClientInput = {
  name: '',
  alias: '',
  type: 'COMPANY',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pin: '',
  contactPerson: '',
  phone: '',
  email: '',
  gstin: '',
  notes: '',
};

const toFormValues = (client: ClientRecord): ClientInput =>
  Object.fromEntries(
    Object.keys(EMPTY).map((key) => [key, client[key as keyof ClientRecord] ?? '']),
  ) as ClientInput;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRecord;
  onSaved?: (client: ClientRecord) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  const save = useSaveClient(client?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientInput, unknown, ClientPayload>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(client ? toFormValues(client) : EMPTY);
  }, [open, client, reset]);

  const onSubmit = (values: ClientPayload) =>
    save.mutate(values, {
      onSuccess: (saved) => {
        toast.success(client ? 'Client updated' : 'Client added');
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={client ? 'Edit client' : 'New client'}
      className="max-w-2xl"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          id="client-name"
          label="Client / company name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input id="client-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field id="client-alias" label="Short name / alias" error={errors.alias?.message}>
          <Input id="client-alias" {...register('alias')} />
        </Field>
        <Field id="client-type" label="Client type">
          <Select id="client-type" {...register('type')}>
            {CLIENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CLIENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="client-address1" label="Address line 1" error={errors.addressLine1?.message}>
          <Input id="client-address1" {...register('addressLine1')} />
        </Field>
        <Field id="client-address2" label="Address line 2" error={errors.addressLine2?.message}>
          <Input id="client-address2" {...register('addressLine2')} />
        </Field>
        <Field id="client-city" label="City" error={errors.city?.message}>
          <Input id="client-city" {...register('city')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="client-state" label="State" error={errors.state?.message}>
            <Input id="client-state" {...register('state')} />
          </Field>
          <Field id="client-pin" label="PIN" error={errors.pin?.message}>
            <Input
              id="client-pin"
              inputMode="numeric"
              aria-invalid={Boolean(errors.pin)}
              {...register('pin')}
            />
          </Field>
        </div>
        <Field id="client-contact" label="Contact person" error={errors.contactPerson?.message}>
          <Input id="client-contact" {...register('contactPerson')} />
        </Field>
        <Field id="client-phone" label="Phone" error={errors.phone?.message}>
          <Input id="client-phone" type="tel" {...register('phone')} />
        </Field>
        <Field id="client-email" label="Email" error={errors.email?.message}>
          <Input
            id="client-email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>
        <Field id="client-gstin" label="GSTIN (optional)" error={errors.gstin?.message}>
          <Input id="client-gstin" aria-invalid={Boolean(errors.gstin)} {...register('gstin')} />
        </Field>
        <Field
          id="client-notes"
          label="Notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea id="client-notes" {...register('notes')} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {client ? 'Save changes' : 'Add client'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
