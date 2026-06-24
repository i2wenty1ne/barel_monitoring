import { Button } from './Button';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  details,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-6">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        {details ? <div className="mt-4">{details}</div> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant="danger">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
