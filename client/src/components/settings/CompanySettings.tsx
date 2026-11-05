import {
  formatDate,
  formatInvoiceNo,
  MAX_SIGNATURE_LENGTH,
  settingsSchema,
  type SettingsInput,
  type SettingsPayload,
  type SettingsRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X } from 'lucide-react';
import { useEffect, useRef, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { todayLocal } from '@/lib/invoice-preview';
import { useSaveSettings, useSaveSignature } from '@/lib/queries';

const toFormValues = (settings: SettingsRecord): SettingsInput => ({
  name: settings.name,
  addressLine: settings.addressLine,
  phone: settings.phone,
  email: settings.email,
  website: settings.website,
  gstin: settings.gstin ?? '',
  bankAccountName: settings.bankAccountName ?? '',
  bankName: settings.bankName ?? '',
  bankAccountNo: settings.bankAccountNo ?? '',
  bankIfsc: settings.bankIfsc ?? '',
  upiId: settings.upiId ?? '',
  invoicePrefix: settings.invoicePrefix,
  nextInvoiceSeq: settings.nextInvoiceSeq,
  defaultTerms: settings.defaultTerms,
  defaultPaymentTermDays: settings.defaultPaymentTermDays,
  gstEnabledDefault: settings.gstEnabledDefault,
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="section-label mb-4">{label}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function SignatureCard({ signatureUrl }: { signatureUrl: string | null }) {
  const save = useSaveSignature();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (dataUrl: string | null, message: string) =>
    save.mutate(dataUrl, {
      onSuccess: () => toast.success(message),
      onError: (error) => toast.error(error.message),
    });

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_SIGNATURE_LENGTH) toast.error('Keep the image under 500 KB');
      else upload(dataUrl, 'Signature saved');
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="p-5">
      <h2 className="section-label mb-4">Signature image</h2>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-48 items-center justify-center rounded-xl border border-border bg-white p-2">
          {signatureUrl ? (
            <img src={signatureUrl} alt="Current signature" className="max-h-full max-w-full" />
          ) : (
            <span className="text-xs text-grey-light">No signature yet</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Signature image file"
          className="sr-only"
          onChange={onFile}
        />
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Upload
        </Button>
        {signatureUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => upload(null, 'Signature removed')}
          >
            <X className="h-4 w-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        PNG, JPEG or WebP, up to 500 KB. Invoices finalized from now on will use it.
      </p>
    </Card>
  );
}

export function CompanySettings({ settings }: { settings: SettingsRecord }) {
  const save = useSaveSettings();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<SettingsInput, unknown, SettingsPayload>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(settings),
  });

  useEffect(() => reset(toFormValues(settings)), [settings, reset]);

  const prefix = useWatch({ control, name: 'invoicePrefix' });
  const nextSeq = useWatch({ control, name: 'nextInvoiceSeq' });

  const onSubmit = (values: SettingsPayload) =>
    save.mutate(values, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (error) => toast.error(error.message),
    });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Section label="Company profile">
        <Field id="set-name" label="Company name" error={errors.name?.message}>
          <Input id="set-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field id="set-address" label="Address line" error={errors.addressLine?.message}>
          <Input id="set-address" {...register('addressLine')} />
        </Field>
        <Field id="set-phone" label="Phone" error={errors.phone?.message}>
          <Input id="set-phone" type="tel" {...register('phone')} />
        </Field>
        <Field id="set-email" label="Email" error={errors.email?.message}>
          <Input id="set-email" type="email" {...register('email')} />
        </Field>
        <Field id="set-website" label="Website" error={errors.website?.message}>
          <Input id="set-website" {...register('website')} />
        </Field>
        <Field id="set-gstin" label="GSTIN (optional)" error={errors.gstin?.message}>
          <Input id="set-gstin" aria-invalid={Boolean(errors.gstin)} {...register('gstin')} />
        </Field>
      </Section>

      <Card className="p-5">
        <h2 className="section-label mb-4">Logo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-xl bg-cream p-6">
            <Logo variant="color" className="text-lg" />
          </div>
          <div className="flex items-center justify-center rounded-xl bg-navy p-6">
            <Logo variant="reversed" className="text-lg" />
          </div>
        </div>
      </Card>

      <Section label="Bank details">
        <Field id="set-bank-name" label="Account name" error={errors.bankAccountName?.message}>
          <Input id="set-bank-name" {...register('bankAccountName')} />
        </Field>
        <Field id="set-bank" label="Bank" error={errors.bankName?.message}>
          <Input id="set-bank" {...register('bankName')} />
        </Field>
        <Field id="set-account" label="Account number" error={errors.bankAccountNo?.message}>
          <Input id="set-account" {...register('bankAccountNo')} />
        </Field>
        <Field id="set-ifsc" label="IFSC" error={errors.bankIfsc?.message}>
          <Input id="set-ifsc" {...register('bankIfsc')} />
        </Field>
        <Field id="set-upi" label="UPI ID" error={errors.upiId?.message}>
          <Input id="set-upi" {...register('upiId')} />
        </Field>
      </Section>

      <Section label="Invoice numbering and defaults">
        <Field id="set-prefix" label="Invoice prefix" error={errors.invoicePrefix?.message}>
          <Input
            id="set-prefix"
            aria-invalid={Boolean(errors.invoicePrefix)}
            {...register('invoicePrefix')}
          />
        </Field>
        <Field id="set-seq" label="Next number" error={errors.nextInvoiceSeq?.message}>
          <Input
            id="set-seq"
            type="number"
            min="1"
            aria-invalid={Boolean(errors.nextInvoiceSeq)}
            {...register('nextInvoiceSeq')}
          />
        </Field>
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Next invoice: {formatInvoiceNo(prefix, settings.currentFY, Number(nextSeq) || 0)}.
          Numbering restarts at 001 each April. Today is {formatDate(todayLocal())}.
        </p>
        <Field
          id="set-days"
          label="Default payment term (days)"
          error={errors.defaultPaymentTermDays?.message}
        >
          <Input
            id="set-days"
            type="number"
            min="0"
            aria-invalid={Boolean(errors.defaultPaymentTermDays)}
            {...register('defaultPaymentTermDays')}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-orange"
            {...register('gstEnabledDefault')}
          />
          GST on by default
        </label>
        <Field
          id="set-terms"
          label="Default terms"
          error={errors.defaultTerms?.message}
          className="sm:col-span-2"
        >
          <Textarea id="set-terms" rows={4} {...register('defaultTerms')} />
        </Field>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending || !isDirty}>
          Save settings
        </Button>
      </div>

      <SignatureCard signatureUrl={settings.signatureUrl} />
    </form>
  );
}
