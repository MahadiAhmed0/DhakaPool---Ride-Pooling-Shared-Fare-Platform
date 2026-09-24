'use client';
// Asks before anything that cannot be undone (NFR-USA-06), and says what it costs, for example
// "৳20.00 cancellation fee". Built on the native <dialog>, which keeps keyboard focus inside and
// closes with Escape.
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from './button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isWorking?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    title,
    children,
    confirmLabel,
    cancelLabel = 'Go back',
    isWorking,
    onConfirm,
    onClose,
  } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog?.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      className="m-auto w-[min(92vw,28rem)] border-3 border-ink bg-page p-6 shadow-brutal backdrop:bg-black/50"
    >
      <h2 id="confirm-dialog-title" className="text-xl">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="danger" onClick={onConfirm} disabled={isWorking}>
          {isWorking ? 'Working…' : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={isWorking}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  );
}
