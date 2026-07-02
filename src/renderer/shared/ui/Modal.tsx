import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';
import { Button } from './Button';

type ModalProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  isCloseDisabled?: boolean;
  maxWidthClassName?: string;
  onClose: () => void;
  title: string;
};

export function Modal({
  children,
  footer,
  isCloseDisabled = false,
  maxWidthClassName = 'max-w-5xl',
  onClose,
  title
}: ModalProps): React.JSX.Element {
  const { t } = useTranslation();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !isCloseDisabled) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCloseDisabled, onClose]);

  function requestClose(): void {
    if (!isCloseDisabled) {
      onClose();
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onMouseDown={requestClose}
      role="dialog"
    >
      <div
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-2xl shadow-black/30 ${maxWidthClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <h2 className="min-w-0 text-lg font-semibold text-white">{translateLiteral(t, title)}</h2>
          <Button
            aria-label={translateLiteral(t, 'Закрыть')}
            className="h-9 w-9 shrink-0 px-0"
            disabled={isCloseDisabled}
            onClick={requestClose}
            variant="ghost"
          >
            ×
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 bg-slate-950/35 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
