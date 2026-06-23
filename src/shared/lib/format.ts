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

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
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
    return `${seconds} сек назад`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes} мин назад`;
}
