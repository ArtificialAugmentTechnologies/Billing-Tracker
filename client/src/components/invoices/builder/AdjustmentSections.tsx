import {
  DEFAULT_GST_RATE,
  DISCOUNT_TYPES,
  formatINR,
  PAYMENT_MODE_LABELS,
  PAYMENT_MODES,
  RIBBON_OPTIONS,
  type InvoiceInput,
  type InvoicePayload,
  type InvoiceTotals,
} from '@a2/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { todayLocal } from '@/lib/invoice-preview';
import { BuilderSection } from './SectionCard';

const useInvoiceForm = () => useFormContext<InvoiceInput, unknown, InvoicePayload>();

export function DiscountsSection({ totals }: { totals: InvoiceTotals }) {
  const {
    control,
    register,
    formState: { errors },
  } = useInvoiceForm();
  const { fields, append, remove } = useFieldArray({ control, name: 'discounts' });

  return (
    <BuilderSection
      label="Discounts"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ label: 'Partner discount', type: 'FLAT', value: 0 })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add discount
        </Button>
      }
    >
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No discounts on this invoice.</p>
      )}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldErrors = errors.discounts?.[index];
          const row = index + 1;
          return (
            <div key={field.id}>
              <div className="grid grid-cols-[1fr_4rem_6rem_auto] items-center gap-2 max-sm:grid-cols-[1fr_4rem_5rem_auto]">
                <Input
                  aria-label={`Discount ${row} label`}
                  aria-invalid={Boolean(fieldErrors?.label)}
                  {...register(`discounts.${index}.label`)}
                />
                <Select
                  aria-label={`Discount ${row} type`}
                  {...register(`discounts.${index}.type`)}
                >
                  {DISCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === 'PERCENT' ? '%' : '₹'}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Discount ${row} value`}
                  aria-invalid={Boolean(fieldErrors?.value)}
                  {...register(`discounts.${index}.value`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={`Remove discount ${row}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="mt-1 flex justify-between gap-2 text-xs">
                <span className="text-orange">
                  {fieldErrors?.label?.message ?? fieldErrors?.value?.message}
                </span>
                <span className="text-muted-foreground" data-testid={`discount-${row}-amount`}>
                  {formatINR(-(totals.discounts[index]?.computedAmount ?? 0))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </BuilderSection>
  );
}

export function TaxSection({ totals }: { totals: InvoiceTotals }) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useInvoiceForm();
  const gstEnabled = useWatch({ control, name: 'gstEnabled' });
  const gstType = useWatch({ control, name: 'gstType' });

  return (
    <BuilderSection label="Tax">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 accent-orange"
          checked={gstEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            setValue('gstEnabled', enabled, { shouldDirty: true });
            if (enabled) {
              setValue('gstType', gstType ?? 'CGST_SGST', { shouldDirty: true });
              setValue('gstRate', DEFAULT_GST_RATE, { shouldDirty: true });
            }
          }}
        />
        GST applicable
      </label>

      {gstEnabled ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="gst-type" label="GST type" error={errors.gstType?.message}>
            <Select id="gst-type" {...register('gstType')}>
              <option value="CGST_SGST">CGST + SGST (intra-state)</option>
              <option value="IGST">IGST (inter-state)</option>
            </Select>
          </Field>
          <Field id="gst-rate" label="Total rate (%)" error={errors.gstRate?.message}>
            <Input
              id="gst-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              aria-invalid={Boolean(errors.gstRate)}
              {...register('gstRate')}
            />
          </Field>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {gstType === 'IGST'
              ? `IGST ${formatINR(totals.igst)}`
              : `CGST ${formatINR(totals.cgst)} + SGST ${formatINR(totals.sgst)}`}{' '}
            on {formatINR(totals.taxableAmount)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          The invoice will say GST is not applicable.
        </p>
      )}
    </BuilderSection>
  );
}

export function AdvancesSection({ totals }: { totals: InvoiceTotals }) {
  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = useInvoiceForm();
  const { fields, append, remove } = useFieldArray({ control, name: 'advances' });

  return (
    <BuilderSection
      label="Advances received"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              amount: 0,
              date: getValues('invoiceDate') || todayLocal(),
              mode: 'BANK_TRANSFER',
              reference: '',
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add advance
        </Button>
      }
    >
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No advances received.</p>
      )}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldErrors = errors.advances?.[index];
          const row = index + 1;
          return (
            <div key={field.id} className="rounded-xl border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Advance ${row} amount`}
                  aria-invalid={Boolean(fieldErrors?.amount)}
                  {...register(`advances.${index}.amount`)}
                />
                <Input
                  type="date"
                  aria-label={`Advance ${row} date`}
                  aria-invalid={Boolean(fieldErrors?.date)}
                  {...register(`advances.${index}.date`)}
                />
                <Select aria-label={`Advance ${row} mode`} {...register(`advances.${index}.mode`)}>
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {PAYMENT_MODE_LABELS[mode]}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Input
                    aria-label={`Advance ${row} reference`}
                    placeholder="Reference / UTR"
                    {...register(`advances.${index}.reference`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label={`Remove advance ${row}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
              {(fieldErrors?.amount || fieldErrors?.date) && (
                <p className="mt-1 text-xs text-orange">
                  {fieldErrors.amount?.message ?? fieldErrors.date?.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {totals.balanceDue < 0 && (
        <p role="alert" className="mt-3 text-sm text-orange">
          Advances are more than the invoice total, so the balance is negative.
        </p>
      )}
    </BuilderSection>
  );
}

export function NotesSection() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useInvoiceForm();
  const ribbonText = useWatch({ control, name: 'ribbonText' });

  return (
    <BuilderSection label="Terms and notes">
      <div className="space-y-4">
        <Field id="invoice-terms" label="Terms" error={errors.terms?.message}>
          <Textarea id="invoice-terms" rows={4} {...register('terms')} />
        </Field>
        <Field
          id="invoice-notes"
          label="Notes (printed on the invoice)"
          error={errors.notes?.message}
        >
          <Textarea id="invoice-notes" rows={2} {...register('notes')} />
        </Field>
        <Field id="invoice-ribbon" label="Status ribbon">
          <Select
            id="invoice-ribbon"
            value={ribbonText ?? ''}
            onChange={(event) =>
              setValue('ribbonText', event.target.value || null, { shouldDirty: true })
            }
          >
            <option value="">No ribbon</option>
            {RIBBON_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </BuilderSection>
  );
}
