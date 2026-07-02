import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <Panel className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg shadow-slate-950/20">
      <div>
        <div className="text-sm font-medium text-slate-100">
          {hasUnsavedChanges ? t('settings.savePanel.hasChanges') : t('settings.savePanel.noChanges')}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {t('settings.savePanel.hint')}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving || !hasUnsavedChanges} onClick={onSave} variant="primary">
          {isSaving ? t('settings.savePanel.saving') : t('settings.savePanel.save')}
        </Button>
        <Button disabled={isSaving || !hasUnsavedChanges} onClick={onResetDraft} variant="secondary">
          {t('settings.savePanel.resetDraft')}
        </Button>
        <Button disabled={isSaving} onClick={onReload} variant="ghost">
          {t('settings.savePanel.reload')}
        </Button>
      </div>
    </Panel>
  );
}
