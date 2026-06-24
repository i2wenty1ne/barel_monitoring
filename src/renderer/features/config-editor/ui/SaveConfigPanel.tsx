import { Button } from '../../../shared/ui/Button';
import { Panel } from '../../../shared/ui/Panel';

type SaveConfigPanelProps = {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onResetDraft: () => void;
  onReload: () => void;
};

export function SaveConfigPanel({
  hasUnsavedChanges,
  isSaving,
  onSave,
  onResetDraft,
  onReload
}: SaveConfigPanelProps): React.JSX.Element {
  return (
    <Panel className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg shadow-slate-950/20">
      <div>
        <div className="text-sm font-medium text-slate-100">
          {hasUnsavedChanges ? 'Есть несохранённые изменения' : 'Изменений нет'}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          Сохранение валидирует config и перезапускает DataService.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving || !hasUnsavedChanges} onClick={onSave} variant="primary">
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button disabled={isSaving || !hasUnsavedChanges} onClick={onResetDraft} variant="secondary">
          Сбросить изменения
        </Button>
        <Button disabled={isSaving} onClick={onReload} variant="ghost">
          Перечитать config
        </Button>
      </div>
    </Panel>
  );
}
