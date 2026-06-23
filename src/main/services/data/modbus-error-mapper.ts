export function mapModbusError(error: unknown, port?: string): string {
  const technicalMessage = getTechnicalErrorMessage(error);
  const normalized = technicalMessage.toLowerCase();

  if (normalized.includes('enoent') || normalized.includes('cannot open') || normalized.includes('not found')) {
    return port ? `COM-порт ${port} не найден` : 'COM-порт не найден';
  }

  if (
    normalized.includes('access denied') ||
    normalized.includes('permission') ||
    normalized.includes('busy') ||
    normalized.includes('resource busy')
  ) {
    return port ? `COM-порт ${port} занят или нет доступа` : 'COM-порт занят или нет доступа';
  }

  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'Устройство не ответило за заданное время';
  }

  if (normalized.includes('crc')) {
    return 'Ошибка контрольной суммы Modbus';
  }

  if (
    normalized.includes('illegal data address') ||
    normalized.includes('invalid register') ||
    normalized.includes('exception code 2')
  ) {
    return 'Некорректный адрес регистра';
  }

  if (normalized.includes('decode')) {
    return 'Не удалось декодировать значение регистра';
  }

  return technicalMessage || 'Неизвестная ошибка Modbus';
}

export function getTechnicalErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown Modbus error';
}
