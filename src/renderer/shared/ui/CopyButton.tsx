import { useState } from 'react';
import { Button } from './Button';

type CopyButtonProps = {
  getText: () => string;
  label?: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
};

export function CopyButton({
  getText,
  label = 'Скопировать',
  onCopied,
  onError
}: CopyButtonProps): React.JSX.Element {
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopy(): Promise<void> {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(getText());
      onCopied?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard недоступен';
      onError?.(message);
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Button disabled={isCopying} onClick={() => void handleCopy()} variant="secondary">
      {isCopying ? 'Копирование...' : label}
    </Button>
  );
}
