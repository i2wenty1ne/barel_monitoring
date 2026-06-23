import { z } from 'zod';

const thresholdSchema = z
  .object({
    warningLow: z.number(),
    alarmLow: z.number(),
    warningHigh: z.number(),
    alarmHigh: z.number()
  })
  .superRefine((value, context) => {
    if (value.alarmLow > value.warningLow) {
      context.addIssue({
        code: 'custom',
        path: ['alarmLow'],
        message: 'alarmLow должен быть меньше или равен warningLow'
      });
    }

    if (value.warningLow >= value.warningHigh) {
      context.addIssue({
        code: 'custom',
        path: ['warningLow'],
        message: 'warningLow должен быть меньше warningHigh'
      });
    }

    if (value.warningHigh > value.alarmHigh) {
      context.addIssue({
        code: 'custom',
        path: ['warningHigh'],
        message: 'warningHigh должен быть меньше или равен alarmHigh'
      });
    }
  });

const scalingSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z
    .object({
      type: z.literal('linear'),
      rawMin: z.number(),
      rawMax: z.number(),
      displayMin: z.number(),
      displayMax: z.number()
    })
    .superRefine((value, context) => {
      if (value.rawMin >= value.rawMax) {
        context.addIssue({
          code: 'custom',
          path: ['rawMin'],
          message: 'rawMin должен быть меньше rawMax'
        });
      }

      if (value.displayMin >= value.displayMax) {
        context.addIssue({
          code: 'custom',
          path: ['displayMin'],
          message: 'displayMin должен быть меньше displayMax'
        });
      }
    })
]);

const channelSchema = z
  .object({
    id: z.string().min(1, 'id канала не может быть пустым'),
    name: z.string().min(1, 'name канала не может быть пустым'),
    type: z.enum(['temperature', 'level', 'custom']),
    deviceId: z.string().min(1),
    moduleInputNumber: z.number().int().positive(),
    registerAddress: z.number().int().min(0),
    modbusFunction: z.union([z.literal(3), z.literal(4)]),
    dataType: z.enum(['int16', 'uint16', 'int32', 'uint32', 'float32']),
    registerCount: z.number().int().positive(),
    byteOrder: z.enum(['ABCD', 'BADC', 'CDAB', 'DCBA']),
    rawUnit: z.string(),
    displayUnit: z.string(),
    decimals: z.number().int().min(0).max(6),
    scaling: scalingSchema
  })
  .superRefine((value, context) => {
    if (value.dataType === 'float32' && value.registerCount !== 2) {
      context.addIssue({
        code: 'custom',
        path: ['registerCount'],
        message: 'Для float32 registerCount должен быть равен 2'
      });
    }
  });

const barrelSchema = z.object({
  id: z.string().min(1, 'id бочки не может быть пустым'),
  name: z.string().min(1, 'name бочки не может быть пустым'),
  active: z.boolean(),
  visible: z.boolean(),
  temperatureChannelId: z.string(),
  levelChannelId: z.string(),
  displayOrder: z.number().int().positive(),
  cardSize: z.enum(['small', 'medium', 'large'])
});

export const appConfigSchema = z
  .object({
    app: z.object({
      mode: z.enum(['mock', 'real']),
      pollingIntervalMs: z.number().int().positive()
    }),
    connection: z.object({
      type: z.literal('modbus-rtu'),
      port: z.string().min(1, 'port не может быть пустым'),
      baudRate: z.number().int().positive(),
      dataBits: z.union([z.literal(7), z.literal(8)]),
      stopBits: z.union([z.literal(1), z.literal(2)]),
      parity: z.enum(['none', 'even', 'odd']),
      timeoutMs: z.number().int().positive(),
      retries: z.number().int().min(0)
    }),
    device: z.object({
      id: z.string().min(1, 'id устройства не может быть пустым'),
      name: z.string().min(1, 'name устройства не может быть пустым'),
      model: z.string().min(1, 'model устройства не может быть пустым'),
      protocol: z.literal('modbus-rtu'),
      modbusAddress: z.number().int().min(1).max(247),
      active: z.boolean()
    }),
    channels: z.array(channelSchema),
    barrels: z.array(barrelSchema),
    thresholds: z.object({
      temperature: thresholdSchema,
      level: thresholdSchema
    }),
    interface: z.object({
      theme: z.enum(['dark', 'light', 'system']),
      cardSize: z.enum(['small', 'medium', 'large']),
      columns: z.union([z.literal('auto'), z.number().int().positive()]),
      showLastUpdate: z.boolean(),
      showRawValuesInDetails: z.boolean(),
      fullscreenOnStart: z.boolean()
    })
  })
  .superRefine((config, context) => {
    const deviceIds = new Set([config.device.id]);
    const channelIds = config.channels.map((channel) => channel.id);
    const uniqueChannelIds = new Set(channelIds);
    const barrelIds = config.barrels.map((barrel) => barrel.id);
    const uniqueBarrelIds = new Set(barrelIds);

    if (channelIds.length !== uniqueChannelIds.size) {
      context.addIssue({
        code: 'custom',
        path: ['channels'],
        message: 'channel.id должен быть уникальным'
      });
    }

    if (barrelIds.length !== uniqueBarrelIds.size) {
      context.addIssue({
        code: 'custom',
        path: ['barrels'],
        message: 'barrel.id должен быть уникальным'
      });
    }

    config.channels.forEach((channel, index) => {
      if (!deviceIds.has(channel.deviceId)) {
        context.addIssue({
          code: 'custom',
          path: ['channels', index, 'deviceId'],
          message: 'deviceId должен ссылаться на существующий device.id'
        });
      }
    });

    config.barrels.forEach((barrel, index) => {
      if (barrel.active && (!barrel.temperatureChannelId || !barrel.levelChannelId)) {
        context.addIssue({
          code: 'custom',
          path: ['barrels', index],
          message: 'Активная бочка должна иметь каналы температуры и уровня'
        });
      }

      if (!uniqueChannelIds.has(barrel.temperatureChannelId)) {
        context.addIssue({
          code: 'custom',
          path: ['barrels', index, 'temperatureChannelId'],
          message: 'temperatureChannelId должен ссылаться на существующий channel.id'
        });
      }

      if (!uniqueChannelIds.has(barrel.levelChannelId)) {
        context.addIssue({
          code: 'custom',
          path: ['barrels', index, 'levelChannelId'],
          message: 'levelChannelId должен ссылаться на существующий channel.id'
        });
      }
    });
  });

export type AppConfigSchema = z.infer<typeof appConfigSchema>;
