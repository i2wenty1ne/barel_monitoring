import { Button } from '../../../shared/ui/Button';

type ClearEventsButtonProps = {
  onClick: () => void;
};

export function ClearEventsButton({ onClick }: ClearEventsButtonProps): React.JSX.Element {
  return (
    <Button onClick={onClick} variant="danger">
      Очистить журнал
    </Button>
  );
}
