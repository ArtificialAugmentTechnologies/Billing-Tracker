import {
  DISCOUNT_TYPES,
  formatINR,
  type CatalogItemRecord,
  type InvoiceInput,
  type InvoicePayload,
  type InvoiceTotals,
} from '@a2/shared';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { BuilderSection } from './SectionCard';

const BLANK_ITEM = { title: '', subDescription: '', qty: 1, rate: 0 };

const DISCOUNT_TYPE_LABELS = { PERCENT: '%', FLAT: '₹' };

interface LineItemRowProps {
  id: string;
  index: number;
  amount: number;
  canRemove: boolean;
  onRemove: () => void;
}

function LineItemRow({ id, index, amount, canRemove, onRemove }: LineItemRowProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<InvoiceInput, unknown, InvoicePayload>();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const discountType = useWatch({ control, name: `items.${index}.discountType` });
  const itemErrors = errors.items?.[index];
  const row = index + 1;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'rounded-xl border border-border bg-card p-3',
        isDragging && 'relative z-10 shadow-card',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Move item ${row}`}
          className="mt-2 cursor-grab touch-none rounded-lg p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            aria-label={`Item ${row} title`}
            placeholder="Item title"
            aria-invalid={Boolean(itemErrors?.title)}
            {...register(`items.${index}.title`)}
          />
          {itemErrors?.title && <p className="text-xs text-orange">{itemErrors.title.message}</p>}
          <Input
            aria-label={`Item ${row} description`}
            placeholder="Description (optional)"
            {...register(`items.${index}.subDescription`)}
          />

          <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              aria-label={`Item ${row} quantity`}
              aria-invalid={Boolean(itemErrors?.qty)}
              {...register(`items.${index}.qty`)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              aria-label={`Item ${row} rate`}
              aria-invalid={Boolean(itemErrors?.rate)}
              {...register(`items.${index}.rate`)}
            />
            <p
              className="min-w-24 text-right text-sm font-semibold"
              data-testid={`item-${row}-amount`}
            >
              {formatINR(amount)}
            </p>
          </div>
          {(itemErrors?.qty || itemErrors?.rate) && (
            <p className="text-xs text-orange">
              {itemErrors.qty?.message ?? itemErrors.rate?.message}
            </p>
          )}

          <div className="flex min-h-8 flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(discountType)}
                className="accent-orange"
                onChange={(event) => {
                  setValue(`items.${index}.discountType`, event.target.checked ? 'PERCENT' : null, {
                    shouldDirty: true,
                  });
                  if (!event.target.checked) {
                    setValue(`items.${index}.discountValue`, null, { shouldDirty: true });
                  }
                }}
              />
              Line discount
            </label>
            {discountType && (
              <>
                <Select
                  aria-label={`Item ${row} discount type`}
                  className="h-8 w-16"
                  {...register(`items.${index}.discountType`)}
                >
                  {DISCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DISCOUNT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Item ${row} discount value`}
                  aria-invalid={Boolean(itemErrors?.discountValue)}
                  className="h-8 w-28"
                  {...register(`items.${index}.discountValue`)}
                />
                {itemErrors?.discountValue && (
                  <p className="text-xs text-orange">{itemErrors.discountValue.message}</p>
                )}
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={`Remove item ${row}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function LineItemsSection({ totals }: { totals: InvoiceTotals }) {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<InvoiceInput, unknown, InvoicePayload>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' });
  const { data: catalog = [] } = useCatalog();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      fields.findIndex((field) => field.id === active.id),
      fields.findIndex((field) => field.id === over.id),
    );
  };

  const insertFromCatalog = (entry: CatalogItemRecord) => {
    const item = {
      title: entry.title,
      subDescription: entry.subDescription ?? '',
      qty: 1,
      rate: entry.defaultRate,
    };
    // A catalogue pick fills an untouched blank row rather than leaving it behind.
    const lastIndex = fields.length - 1;
    if (lastIndex >= 0 && !getValues(`items.${lastIndex}.title`)) {
      setValue(`items.${lastIndex}.title`, item.title, { shouldDirty: true });
      setValue(`items.${lastIndex}.subDescription`, item.subDescription, { shouldDirty: true });
      setValue(`items.${lastIndex}.rate`, item.rate, { shouldDirty: true });
    } else {
      append(item);
    }
  };

  return (
    <BuilderSection
      label="Line items"
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => append(BLANK_ITEM)}>
          <Plus className="h-4 w-4" aria-hidden />
          Add item
        </Button>
      }
    >
      {catalog.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-muted-foreground">Quick add from catalogue</p>
          <div className="flex flex-wrap gap-1.5">
            {catalog.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => insertFromCatalog(entry)}
                className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
              >
                {entry.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <LineItemRow
                key={field.id}
                id={field.id}
                index={index}
                amount={totals.items[index]?.amount ?? 0}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {errors.items?.root?.message && (
        <p className="mt-2 text-xs text-orange">{errors.items.root.message}</p>
      )}
    </BuilderSection>
  );
}
