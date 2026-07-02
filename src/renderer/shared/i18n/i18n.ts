import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { InterfaceLanguage } from '../../../shared/types/config.types';

export const supportedLanguages: InterfaceLanguage[] = ['ru', 'en'];

export const languageOptions: Array<{ label: string; value: InterfaceLanguage }> = [
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' }
];

const resources = {
  ru: {
    translation: {
      common: {
        appEyebrow: 'Промышленный мониторинг',
        loading: 'Загрузка данных мониторинга',
        retry: 'Повторить',
        defaultErrorTitle: 'Не удалось загрузить данные',
        noData: 'Нет данных',
        yes: 'да',
        no: 'нет',
        yesCapital: 'Да',
        noCapital: 'Нет',
        close: 'Закрыть',
        cancel: 'Отмена',
        save: 'Сохранить',
        delete: 'Удалить',
        edit: 'Редактировать',
        create: 'Создать',
        copy: 'Скопировать',
        copying: 'Копирование...',
        clipboardUnavailable: 'Clipboard недоступен',
        enabled: 'Включен',
        disabled: 'Отключен',
        status: 'Статус',
        name: 'Название',
        type: 'Тип',
        source: 'Источник',
        object: 'Объект',
        message: 'Сообщение',
        details: 'Детали',
        time: 'Время',
        updated: 'Обновлено',
        error: 'Ошибка',
        success: 'Успех',
        warning: 'Предупреждение',
        alarm: 'Авария',
        info: 'Информация'
      },
      status: {
        ok: 'OK',
        warning: 'Предупреждение',
        alarm: 'Авария',
        noData: 'Нет данных',
        connectionError: 'Ошибка связи'
      },
      layout: {
        title: 'Промышленный мониторинг',
        subtitle: 'Объекты, точки и процессы',
        navLabel: 'Главная навигация',
        operatorPanel: 'Операторская панель',
        mode: 'Режим: {{mode}}',
        updated: 'Обновлено: {{value}}',
        waitingData: 'Ожидание данных',
        lastOk: 'Последний OK: {{value}}',
        warnings: 'Предупреждения: {{count}}',
        alarms: 'Аварии: {{count}}',
        refresh: 'Обновить',
        connectionWaiting: 'Связь: ожидание',
        connectionOk: 'Связь OK',
        portError: 'Ошибка порта',
        noDeviceResponse: 'Нет ответа от устройства',
        connectionError: 'Ошибка связи',
        nav: {
          monitoring: 'Мониторинг',
          assets: 'Объекты',
          dataSources: 'Источники данных',
          points: 'Точки данных',
          actuators: 'Механизмы',
          processes: 'Процессы',
          processJobs: 'Запуски',
          graphs: 'Графы',
          history: 'История',
          diagnostics: 'Диагностика',
          events: 'Журнал',
          settings: 'Настройки',
          about: 'О приложении'
        }
      },
      settings: {
        title: 'Настройки',
        description: 'Редактирование локального schema v2 config.json. Изменения применяются только после сохранения.',
        configNotLoaded: 'Config не загружен',
        resetTitle: 'Сбросить настройки?',
        resetMessage: 'Config.json будет перезаписан дефолтными настройками. Это действие нельзя отменить через UI.',
        resetConfirm: 'Сбросить',
        tabs: {
          thresholds: 'Пороги',
          interface: 'Интерфейс',
          service: 'Сервис'
        },
        savePanel: {
          hasChanges: 'Есть несохранённые изменения',
          noChanges: 'Изменений нет',
          hint: 'Сохранение валидирует config и перезапускает DataService.',
          saving: 'Сохранение...',
          save: 'Сохранить',
          resetDraft: 'Сбросить изменения',
          reload: 'Перечитать config'
        },
        editor: {
          loadError: 'Config load error',
          saveError: 'Config save error',
          resetError: 'Config reset error',
          saved: 'Config сохранён',
          reloaded: 'Config перечитан с диска',
          draftReset: 'Черновик сброшен к последней сохранённой версии',
          defaultsReset: 'Настройки сброшены к дефолтным',
          openConfigFolderError: 'Не удалось открыть папку конфигурации',
          openLogsFolderError: 'Не удалось открыть папку логов'
        },
        interface: {
          title: 'Интерфейс',
          language: 'Язык',
          theme: 'Тема',
          cardSize: 'Размер карточек',
          columns: 'Количество колонок',
          showLastUpdate: 'Показывать время обновления',
          showRawValues: 'Показывать сырые значения в деталях',
          fullscreen: 'Запускать в полноэкранном режиме',
          fullscreenHint: 'Применится после перезапуска приложения.'
        }
      },
      pages: {
        notFoundTitle: 'Страница не найдена',
        notFoundMessage: 'Проверьте адрес или вернитесь в раздел мониторинга',
        monitoring: {
          title: 'Мониторинг объектов',
          description: 'Текущее состояние объектов, построенное поверх объектов и точек.',
          summaryStatus: 'Общий статус',
          mode: 'Режим данных',
          lastUpdate: 'Последнее обновление',
          warnings: 'Предупреждения',
          alarms: 'Аварии',
          emptyTitle: 'Объекты не настроены',
          emptyDescription: 'Создайте Asset и привяжите к нему telemetry points.'
        },
        about: {
          title: 'О приложении',
          description: 'Версия, runtime, schema v2 и рабочие пути локального приложения.',
          systemUnavailable: 'System info недоступен',
          copySystemInfo: 'Скопировать системную информацию',
          dataSourcesTitle: 'Источники данных и подключения',
          modbusAddress: 'Адрес Modbus',
          timeout: 'Таймаут',
          retries: 'Повторы'
        }
      },
      events: {
        levels: {
          info: 'Информация',
          warning: 'Предупреждение',
          error: 'Ошибка'
        }
      },
      time: {
        secondsAgo: '{{count}} сек назад',
        minutesAgo: '{{count}} мин назад'
      }
    }
  },
  en: {
    translation: {
      common: {
        appEyebrow: 'Industrial monitoring',
        loading: 'Loading monitoring data',
        retry: 'Retry',
        defaultErrorTitle: 'Could not load data',
        noData: 'No data',
        yes: 'yes',
        no: 'no',
        yesCapital: 'Yes',
        noCapital: 'No',
        close: 'Close',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        copy: 'Copy',
        copying: 'Copying...',
        clipboardUnavailable: 'Clipboard is unavailable',
        enabled: 'Enabled',
        disabled: 'Disabled',
        status: 'Status',
        name: 'Name',
        type: 'Type',
        source: 'Source',
        object: 'Object',
        message: 'Message',
        details: 'Details',
        time: 'Time',
        updated: 'Updated',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        alarm: 'Alarm',
        info: 'Information'
      },
      status: {
        ok: 'OK',
        warning: 'Warning',
        alarm: 'Alarm',
        noData: 'No data',
        connectionError: 'Connection error'
      },
      layout: {
        title: 'Industrial monitoring',
        subtitle: 'Assets, points, and processes',
        navLabel: 'Main navigation',
        operatorPanel: 'Operator panel',
        mode: 'Mode: {{mode}}',
        updated: 'Updated: {{value}}',
        waitingData: 'Waiting for data',
        lastOk: 'Last OK: {{value}}',
        warnings: 'Warnings: {{count}}',
        alarms: 'Alarms: {{count}}',
        refresh: 'Refresh',
        connectionWaiting: 'Connection: waiting',
        connectionOk: 'Connection OK',
        portError: 'Port error',
        noDeviceResponse: 'No response from device',
        connectionError: 'Connection error',
        nav: {
          monitoring: 'Monitoring',
          assets: 'Assets',
          dataSources: 'Data sources',
          points: 'Data points',
          actuators: 'Actuators',
          processes: 'Processes',
          processJobs: 'Runs',
          graphs: 'Graphs',
          history: 'History',
          diagnostics: 'Diagnostics',
          events: 'Event log',
          settings: 'Settings',
          about: 'About'
        }
      },
      settings: {
        title: 'Settings',
        description: 'Editing local schema v2 config.json. Changes are applied only after saving.',
        configNotLoaded: 'Config is not loaded',
        resetTitle: 'Reset settings?',
        resetMessage: 'Config.json will be overwritten with default settings. This action cannot be undone in the UI.',
        resetConfirm: 'Reset',
        tabs: {
          thresholds: 'Thresholds',
          interface: 'Interface',
          service: 'Service'
        },
        savePanel: {
          hasChanges: 'Unsaved changes',
          noChanges: 'No changes',
          hint: 'Saving validates config and restarts DataService.',
          saving: 'Saving...',
          save: 'Save',
          resetDraft: 'Reset changes',
          reload: 'Reload config'
        },
        editor: {
          loadError: 'Config load error',
          saveError: 'Config save error',
          resetError: 'Config reset error',
          saved: 'Config saved',
          reloaded: 'Config reloaded from disk',
          draftReset: 'Draft was reset to the last saved version',
          defaultsReset: 'Settings were reset to defaults',
          openConfigFolderError: 'Could not open configuration folder',
          openLogsFolderError: 'Could not open logs folder'
        },
        interface: {
          title: 'Interface',
          language: 'Language',
          theme: 'Theme',
          cardSize: 'Card size',
          columns: 'Column count',
          showLastUpdate: 'Show update time',
          showRawValues: 'Show raw values in details',
          fullscreen: 'Start in fullscreen mode',
          fullscreenHint: 'Applies after application restart.'
        }
      },
      pages: {
        notFoundTitle: 'Page not found',
        notFoundMessage: 'Check the address or return to monitoring',
        monitoring: {
          title: 'Asset monitoring',
          description: 'Current asset state built from assets and points.',
          summaryStatus: 'Overall status',
          mode: 'Data mode',
          lastUpdate: 'Last update',
          warnings: 'Warnings',
          alarms: 'Alarms',
          emptyTitle: 'No assets configured',
          emptyDescription: 'Create an Asset and link telemetry points to it.'
        },
        about: {
          title: 'About',
          description: 'Version, runtime, schema v2, and local application paths.',
          systemUnavailable: 'System info is unavailable',
          copySystemInfo: 'Copy system information',
          dataSourcesTitle: 'Data sources and connections',
          modbusAddress: 'Modbus address',
          timeout: 'Timeout',
          retries: 'Retries'
        }
      },
      events: {
        levels: {
          info: 'Information',
          warning: 'Warning',
          error: 'Error'
        }
      },
      time: {
        secondsAgo: '{{count}} sec ago',
        minutesAgo: '{{count}} min ago'
      }
    }
  }
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false
  },
  returnNull: false
});

export function normalizeLanguage(value: unknown): InterfaceLanguage {
  return value === 'en' || value === 'ru' ? value : 'ru';
}

export function getCurrentLocale(): string {
  return normalizeLanguage(i18n.language) === 'en' ? 'en-US' : 'ru-RU';
}

export { i18n };
