import { useEffect } from 'react';
import { i18n, normalizeLanguage } from './i18n';

export function I18nConfigSync(): null {
  useEffect(() => {
    let isMounted = true;

    async function syncLanguage(): Promise<void> {
      try {
        const result = await window.barrelMonitor.config.get();
        const language = normalizeLanguage(result.config.interface.language);
        if (isMounted && i18n.language !== language) {
          await i18n.changeLanguage(language);
        }
      } catch (error) {
        console.error('Failed to sync UI language', error);
      }
    }

    void syncLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
