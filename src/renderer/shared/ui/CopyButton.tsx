import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';
import { Button } from './Button';

type CopyButtonProps = {
  getText: () => string;
  label?: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
};

export function CopyButton({
  getText,
  label,
  onCopied,
  onError
}: CopyButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopy(): Promise<void> {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(getText());
      onCopied?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.clipboardUnavailable');
      onError?.(message);
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Button disabled={isCopying} onClick={() => void handleCopy()} variant="secondary">
      {isCopying ? t('common.copying') : label ? translateLiteral(t, label) : t('common.copy')}
    </Button>
  );
}
