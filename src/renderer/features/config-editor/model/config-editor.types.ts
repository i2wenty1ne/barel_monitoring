import type { AppConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError, SystemInfo } from '../../../../shared/types/ipc.types';

export type ConfigEditorState = {
  config: AppConfig | null;
  originalConfig: AppConfig | null;
  systemInfo: SystemInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  validationErrors: ConfigValidationError[];
  hasUnsavedChanges: boolean;
};
