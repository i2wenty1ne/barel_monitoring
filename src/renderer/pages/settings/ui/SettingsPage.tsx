import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ConfigValidationSummary } from '../../../features/config-editor/ui/ConfigValidationSummary';
import { SaveConfigPanel } from '../../../features/config-editor/ui/SaveConfigPanel';
import { useConfigEditor } from '../../../features/config-editor/model/useConfigEditor';
import { InterfaceSettingsTab } from '../../../features/interface-settings/ui/InterfaceSettingsTab';
import { ServiceSettingsTab } from '../../../features/service-settings/ui/ServiceSettingsTab';
import { ThresholdsSettingsTab } from '../../../features/threshold-settings/ui/ThresholdsSettingsTab';
import { Alert } from '../../../shared/ui/Alert';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { i18n, normalizeLanguage } from '../../../shared/i18n/i18n';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SettingsTabs, type SettingsTabId } from './SettingsTabs';

export function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const editor = useConfigEditor();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const activeTab = getSettingsTab(searchParams.get('tab'));

  useEffect(() => {
    const language = normalizeLanguage(editor.config?.interface.language);
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [editor.config?.interface.language]);

  function handleTabChange(tab: SettingsTabId): void {
    setSearchParams(tab === 'thresholds' ? {} : { tab });
  }

  if (editor.isLoading && !editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow={t('common.appEyebrow')} title={t('settings.title')} />
        <LoadingState />
      </section>
    );
  }

  if (editor.error && !editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow={t('common.appEyebrow')} title={t('settings.title')} />
        <ErrorState message={editor.error} onRetry={() => void editor.reloadConfig()} />
      </section>
    );
  }

  if (!editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow={t('common.appEyebrow')} title={t('settings.title')} />
        <ErrorState message={t('settings.configNotLoaded')} onRetry={() => void editor.reloadConfig()} />
      </section>
    );
  }

  const config = editor.config;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={t('common.appEyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <div className="space-y-5">
        <SaveConfigPanel
          hasUnsavedChanges={editor.hasUnsavedChanges}
          isSaving={editor.isSaving}
          onReload={() => void editor.reloadConfig()}
          onResetDraft={editor.resetDraft}
          onSave={() => void editor.saveConfig()}
        />

        {editor.successMessage ? <Alert type="success">{editor.successMessage}</Alert> : null}
        {editor.error ? <Alert type="error">{editor.error}</Alert> : null}
        <ConfigValidationSummary validationErrors={editor.validationErrors} />

        <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'thresholds' ? (
          <ThresholdsSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
          />
        ) : null}
        {activeTab === 'interface' ? (
          <InterfaceSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
          />
        ) : null}
        {activeTab === 'service' ? (
          <ServiceSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
            onOpenConfigFolder={() => void editor.openConfigFolder()}
            onOpenLogsFolder={() => void editor.openLogsFolder()}
            onReloadConfig={() => void editor.reloadConfig()}
            onRequestResetToDefault={() => setIsResetDialogOpen(true)}
            systemInfo={editor.systemInfo}
          />
        ) : null}
      </div>

      {isResetDialogOpen ? (
        <ConfirmDialog
          cancelText={t('common.cancel')}
          confirmText={t('settings.resetConfirm')}
          message={t('settings.resetMessage')}
          onCancel={() => setIsResetDialogOpen(false)}
          onConfirm={() => {
            setIsResetDialogOpen(false);
            void editor.resetToDefault();
          }}
          title={t('settings.resetTitle')}
        />
      ) : null}
    </section>
  );
}

function getSettingsTab(value: string | null): SettingsTabId {
  const tabs: SettingsTabId[] = [
    'thresholds',
    'interface',
    'service'
  ];

  return value && tabs.includes(value as SettingsTabId) ? (value as SettingsTabId) : 'thresholds';
}
