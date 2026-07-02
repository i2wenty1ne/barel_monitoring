import type { TFunction } from 'i18next';

export function translateLiteral(t: TFunction, value: string): string {
  const key = `literal.${value}`;
  return t(key, { defaultValue: value });
}

export function translateLiteralNode(t: TFunction, value: React.ReactNode): React.ReactNode {
  return typeof value === 'string' ? translateLiteral(t, value) : value;
}
