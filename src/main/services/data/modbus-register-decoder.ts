import type { ChannelConfig, ChannelDataType } from '../../../shared/types/config.types';

export function decodeRegisters(
  registers: number[],
  dataType: ChannelDataType,
  byteOrder: ChannelConfig['byteOrder']
): number {
  const requiredRegisters = getRequiredRegisterCount(dataType);

  if (registers.length < requiredRegisters) {
    throw new Error(
      `Decode error: expected ${requiredRegisters} register(s), received ${registers.length}`
    );
  }

  if (dataType === 'int16') {
    return createRegisterBuffer(registers[0] ?? 0).readInt16BE(0);
  }

  if (dataType === 'uint16') {
    return createRegisterBuffer(registers[0] ?? 0).readUInt16BE(0);
  }

  const bytes = createOrderedBytes(registers.slice(0, 2), byteOrder);
  const buffer = Buffer.from(bytes);

  if (dataType === 'int32') {
    return buffer.readInt32BE(0);
  }

  if (dataType === 'uint32') {
    return buffer.readUInt32BE(0);
  }

  return buffer.readFloatBE(0);
}

export function getRequiredRegisterCount(dataType: ChannelDataType): number {
  return dataType === 'int16' || dataType === 'uint16' ? 1 : 2;
}

function createRegisterBuffer(register: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(register & 0xffff, 0);
  return buffer;
}

function createOrderedBytes(registers: number[], byteOrder: ChannelConfig['byteOrder']): number[] {
  const first = createRegisterBuffer(registers[0] ?? 0);
  const second = createRegisterBuffer(registers[1] ?? 0);
  const bytes = [first[0] ?? 0, first[1] ?? 0, second[0] ?? 0, second[1] ?? 0];
  const indexesByOrder: Record<ChannelConfig['byteOrder'], number[]> = {
    ABCD: [0, 1, 2, 3],
    CDAB: [2, 3, 0, 1],
    BADC: [1, 0, 3, 2],
    DCBA: [3, 2, 1, 0]
  };

  return indexesByOrder[byteOrder].map((index) => bytes[index] ?? 0);
}
