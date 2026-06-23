import { useState } from 'react';
import type { TestConnectionResult } from '../../../../shared/types/monitoring.types';
import { BarrelsSettingsTab } from '../../../features/barrel-settings/ui/BarrelsSettingsTab';
import { ChannelsSettingsTab } from '../../../features/channel-settings/ui/ChannelsSettingsTab';
import { ConfigValidationSummary } from '../../../features/config-editor/ui/ConfigValidationSummary';
import { SaveConfigPanel } from '../../../features/config-editor/ui/SaveConfigPanel';
import { useConfigEditor } from '../../../features/config-editor/model/useConfigEditor';
import { ConnectionSettingsTab } from '../../../features/connection-settings/ui/ConnectionSettingsTab';
import { DeviceSettingsTab } from '../../../features/device-settings/ui/DeviceSettingsTab';
import { InterfaceSettingsTab } from '../../../features/interface-settings/ui/InterfaceSettingsTab';
import { ServiceSettingsTab } from '../../../features/service-settings/ui/ServiceSettingsTab';
import { ThresholdsSettingsTab } from '../../../features/threshold-settings/ui/ThresholdsSettingsTab';
import { Alert } from '../../../shared/ui/Alert';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SettingsTabs, type SettingsTabId } from './SettingsTabs';

export function SettingsPage(): React.JSX.Element {
  const editor = useConfigEditor();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('connection');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  async function handleTestConnection(): Promise<void> {
    setIsTesting(true);
    try {
      const result = await window.barrelMonitor.monitoring.testConnection();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  }

  if (editor.isLoading && !editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="Настройки" />
        <LoadingState />
      </section>
    );
  }

  if (editor.error && !editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="Настройки" />
        <ErrorState message={editor.error} onRetry={() => void editor.reloadConfig()} />
      </section>
    );
  }

  if (!editor.config) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="Настройки" />
        <ErrorState message="Config не загружен" onRetry={() => void editor.reloadConfig()} />
      </section>
    );
  }

  const config = editor.config;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Barrel Monitor"
        title="Настройки"
        description="Редактирование локального config.json. Изменения применяются только после сохранения."
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

        <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'connection' ? (
          <ConnectionSettingsTab
            config={config}
            isTesting={isTesting}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
            onTestConnection={() => void handleTestConnection()}
            testResult={testResult}
            validationErrors={editor.validationErrors}
          />
        ) : null}
        {activeTab === 'device' ? (
          <DeviceSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
            validationErrors={editor.validationErrors}
          />
        ) : null}
        {activeTab === 'channels' ? (
          <ChannelsSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
          />
        ) : null}
        {activeTab === 'barrels' ? (
          <BarrelsSettingsTab
            config={config}
            onChange={(nextConfig) => editor.updateConfig(() => nextConfig)}
          />
        ) : null}
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
          cancelText="Отмена"
          confirmText="Сбросить"
          message="Config.json будет перезаписан дефолтными настройками. Это действие нельзя отменить через UI."
          onCancel={() => setIsResetDialogOpen(false)}
          onConfirm={() => {
            setIsResetDialogOpen(false);
            void editor.resetToDefault();
          }}
          title="Сбросить настройки?"
        />
      ) : null}
    </section>
  );
}
