export type SafeJsonParseResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export function safeJsonParse<T>(content: string): SafeJsonParseResult<T> {
  try {
    return {
      success: true,
      data: JSON.parse(content) as T
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown JSON parse error'
    };
  }
}

export function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
