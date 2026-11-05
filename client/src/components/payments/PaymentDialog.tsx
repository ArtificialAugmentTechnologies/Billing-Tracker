import {
  formatINR,
  PAYMENT_MODE_LABELS,
  PAYMENT_MODES,
  paymentSchema,
  type PaymentInput,
  type PaymentPayload,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { todayLocal } from '@/lib/invoice-preview';
import { useOpenInvoices, useRecordPayment } from '@/lib/queries';

const defaults = (amount: number): PaymentInput => ({
  date: todayLocal(),
  amount,
  mode: 'BANK_TRANSFER',
  reference: '',
  notes: '',
});

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The invoice to pay. Without one, the dialog asks which invoice it's for. */
  invoice?: { id: string; balance: number };
}

export function PaymentDialog({ open, onOpenChange, invoice }: PaymentDialogProps) {
  const record = useRecordPayment();
  const { data: openInvoices = [] } = useOpenInvoices(open && !invoice);
  const [chosenId, setChosenId] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput, unknown, PaymentPayload>({
    resolver: zodResolver(paymentSchema),
    defaultValues: defaults(0),
  });

  useEffect(() => {
    if (!open) return;
    setChosenId('');
    reset(defaults(invoice?.balance ?? 0));
  }, [open, invoice, reset]);

  const invoiceId = invoice?.id ?? chosenId;

  const onSubmit = (input: PaymentPayload) => {
    if (!invoiceId) {
      toast.error('Choose an invoice');
      return;
    }
    record.mutate(
      { invoiceId, input },
      {
        onSuccess: () => {
          toast.success('Payment recorded');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Record payment">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        {!invoice && (
          <Field id="payment-invoice" label="Invoice" className="sm:col-span-2">
            <Select
              id="payment-invoice"
              value={chosenId}
              onChange={(event) => {
                const row = openInvoices.find((entry) => entry.id === event.target.value);
                setChosenId(event.target.value);
                setValue('amount', row?.balance ?? 0);
              }}
            >
              <option value="">Choose an invoice</option>
              {openInvoices.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.invoiceNo} · {row.clientName} · {formatINR(row.balance)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id="payment-amount" label="Amount (₹)" error={errors.amount?.message}>
          <Input
            id="payment-amount"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.amount)}
            {...register('amount')}
          />
        </Field>
        <Field id="payment-date" label="Date" error={errors.date?.message}>
          <Input
            id="payment-date"
            type="date"
            max={todayLocal()}
            aria-invalid={Boolean(errors.date)}
            {...register('date')}
          />
        </Field>
        <Field id="payment-mode" label="Mode">
          <Select id="payment-mode" {...register('mode')}>
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {PAYMENT_MODE_LABELS[mode]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="payment-reference" label="Reference / UTR no." error={errors.reference?.message}>
          <Input id="payment-reference" {...register('reference')} />
        </Field>
        <Field
          id="payment-notes"
          label="Notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea id="payment-notes" rows={2} {...register('notes')} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={record.isPending}>
            Record payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
