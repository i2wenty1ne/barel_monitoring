export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return value.toFixed(decimals);
}

export function formatTemperature(value: number | null | undefined): string {
  const formattedValue = formatNumber(value, 1);
  return formattedValue === '—' ? formattedValue : `${formattedValue} °C`;
}

export function formatPercent(value: number | null | undefined): string {
  const formattedValue = formatNumber(value, 0);
  return formattedValue === '—' ? formattedValue : `${formattedValue} %`;
}

export function formatRawValue(
  value: number | null | undefined,
  unit: string | null | undefined,
  decimals = 2
): string {
  const formattedValue = formatNumber(value, decimals);
  return formattedValue === '—' ? formattedValue : `${formattedValue} ${unit ?? ''}`.trim();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatStatusLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    ok: 'OK',
    warning: i18next.t('status.warning', { defaultValue: 'Предупреждение' }),
    alarm: i18next.t('status.alarm', { defaultValue: 'Авария' }),
    'no-data': i18next.t('status.noData', { defaultValue: 'Нет данных' }),
    'connection-error': i18next.t('status.connectionError', { defaultValue: 'Ошибка связи' })
  };

  return value ? (labels[value] ?? value) : '—';
}

export function formatEventLevel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    info: i18next.t('events.levels.info', { defaultValue: 'Информация' }),
    warning: i18next.t('events.levels.warning', { defaultValue: 'Предупреждение' }),
    error: i18next.t('events.levels.error', { defaultValue: 'Ошибка' })
  };

  return value ? (labels[value] ?? value) : '—';
}

export function stringifyPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return i18next.t('time.secondsAgo', { count: seconds, defaultValue: `${seconds} сек назад` });
  }

  const minutes = Math.round(seconds / 60);
  return i18next.t('time.minutesAgo', { count: minutes, defaultValue: `${minutes} мин назад` });
}

function getLocale(): string {
  return i18next.language === 'en' ? 'en-US' : 'ru-RU';
}
import i18next from 'i18next';
