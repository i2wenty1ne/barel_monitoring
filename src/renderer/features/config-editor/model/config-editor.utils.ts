import type { AppConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError } from '../../../../shared/types/ipc.types';

export function cloneConfig(config: AppConfig): AppConfig {
  return structuredClone(config);
}

export function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'e')
    .replace(/[а-я]/g, (char) => transliterateChar(char))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createUniqueId(base: string, existingIds: string[]): string {
  const cleanBase = slugifyName(base) || 'item';
  const existing = new Set(existingIds);

  if (!existing.has(cleanBase)) {
    return cleanBase;
  }

  let index = 2;
  while (existing.has(`${cleanBase}-${index}`)) {
    index += 1;
  }

  return `${cleanBase}-${index}`;
}

export function getValidationError(
  validationErrors: ConfigValidationError[],
  path: string
): string | undefined {
  return validationErrors.find((error) => error.path === path)?.message;
}

export function hasConfigChanged(config: AppConfig | null, originalConfig: AppConfig | null): boolean {
  if (!config || !originalConfig) {
    return false;
  }

  return JSON.stringify(config) !== JSON.stringify(originalConfig);
}

function transliterateChar(char: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya'
  };

  return map[char] ?? '';
}
