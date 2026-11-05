import { Button } from './button';
import { Dialog } from './dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
