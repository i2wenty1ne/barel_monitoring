import type { TFunction } from 'i18next';

export function translateLiteral(t: TFunction, value: string): string {
  const key = `literal.${value}`;
  const exact = t(key, { defaultValue: value });
  if (exact !== value) {
    return exact;
  }

  if (value.includes('. ')) {
    const translatedParts = value.split('. ').map((part) => translateLiteral(t, part));
    const translated = translatedParts.join('. ');
    if (translated !== value) {
      return translated;
    }
  }

  if (value.includes(' / ')) {
    const translatedParts = value.split(' / ').map((part) => translateLiteral(t, part));
    const translated = translatedParts.join(' / ');
    if (translated !== value) {
      return translated;
    }
  }

  const colonMatch = value.match(/^([^:]+): (.+)$/);
  if (colonMatch) {
    const translatedPrefix = t(`literal.${colonMatch[1]}`, { defaultValue: colonMatch[1] });
    if (translatedPrefix !== colonMatch[1]) {
      return `${translatedPrefix}: ${colonMatch[2]}`;
    }
  }

  const countMatch = value.match(/^(\d+) (.+)$/);
  if (countMatch) {
    const translatedUnit = t(`literal.${countMatch[2]}`, { defaultValue: countMatch[2] });
    if (translatedUnit !== countMatch[2]) {
      return `${countMatch[1]} ${translatedUnit}`;
    }
  }

  const suffixCountMatch = value.match(/^(.+) \((.+)\)$/);
  if (suffixCountMatch) {
    const translatedLabel = t(`literal.${suffixCountMatch[1]}`, { defaultValue: suffixCountMatch[1] });
    if (translatedLabel !== suffixCountMatch[1]) {
      return `${translatedLabel} (${suffixCountMatch[2]})`;
    }
  }

  return value;
}

export function translateLiteralNode(t: TFunction, value: React.ReactNode): React.ReactNode {
  if (typeof value === 'string') {
    return translateLiteral(t, value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => translateLiteralNode(t, item));
  }

  return value;
}
