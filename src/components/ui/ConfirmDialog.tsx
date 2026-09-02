import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-ink-600 dark:text-ink-300 mb-6">{message}</p>
      <div className="flex justify-end space-x-3">
        <Button variant="ghost" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
