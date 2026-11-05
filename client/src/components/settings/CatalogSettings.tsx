import {
  catalogItemSchema,
  formatINR,
  type CatalogItemInput,
  type CatalogItemPayload,
  type CatalogItemRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SectionCard, Table, tdClass, thClass } from '@/components/ui/page';
import { useCatalog, useDeleteCatalogItem, useSaveCatalogItem } from '@/lib/queries';

const EMPTY: CatalogItemInput = { title: '', subDescription: '', defaultRate: 0, category: '' };

interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItemRecord;
}

function CatalogDialog({ open, onOpenChange, item }: CatalogDialogProps) {
  const save = useSaveCatalogItem(item?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogItemInput, unknown, CatalogItemPayload>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            title: item.title,
            subDescription: item.subDescription ?? '',
            defaultRate: item.defaultRate,
            category: item.category ?? '',
          }
        : EMPTY,
    );
  }, [open, item, reset]);

  const onSubmit = (values: CatalogItemPayload) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(item ? 'Item updated' : 'Item added');
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? 'Edit catalogue item' : 'New catalogue item'}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field id="cat-title" label="Title" error={errors.title?.message} className="sm:col-span-2">
          <Input id="cat-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
        </Field>
        <Field
          id="cat-sub"
          label="Description"
          error={errors.subDescription?.message}
          className="sm:col-span-2"
        >
          <Input id="cat-sub" {...register('subDescription')} />
        </Field>
        <Field id="cat-rate" label="Default rate (₹)" error={errors.defaultRate?.message}>
          <Input
            id="cat-rate"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.defaultRate)}
            {...register('defaultRate')}
          />
        </Field>
        <Field id="cat-category" label="Category" error={errors.category?.message}>
          <Input id="cat-category" {...register('category')} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {item ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CatalogSettings() {
  const { data: items = [] } = useCatalog();
  const deleteItem = useDeleteCatalogItem();
  const [form, setForm] = useState<{ item?: CatalogItemRecord } | null>(null);
  const [toDelete, setToDelete] = useState<CatalogItemRecord | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteItem.mutate(toDelete.id, {
      onSuccess: () => toast.success('Item deleted'),
      onError: (error) => toast.error(error.message),
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <>
      <SectionCard
        label="Service catalogue"
        action={
          <Button size="sm" onClick={() => setForm({})}>
            <Plus className="h-4 w-4" aria-hidden />
            New item
          </Button>
        }
      >
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} hidden sm:table-cell`}>Category</th>
              <th className={`${thClass} text-right`}>Rate</th>
              <th className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className={tdClass}>
                  <p className="font-medium">{item.title}</p>
                  {item.subDescription && (
                    <p className="text-xs text-muted-foreground">{item.subDescription}</p>
                  )}
                </td>
                <td className={`${tdClass} hidden sm:table-cell`}>{item.category ?? '—'}</td>
                <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                  {formatINR(item.defaultRate)}
                </td>
                <td className={`${tdClass} whitespace-nowrap text-right`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${item.title}`}
                    onClick={() => setForm({ item })}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => setToDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>

      <CatalogDialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        item={form?.item}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this item?"
        description={`${toDelete?.title ?? 'This item'} will leave the catalogue. Existing invoices keep their own copy.`}
        confirmLabel="Delete item"
        pending={deleteItem.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
