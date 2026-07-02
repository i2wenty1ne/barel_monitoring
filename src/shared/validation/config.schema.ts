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
      context.addIssue({ code: 'custom', path: ['alarmLow'], message: 'alarmLow должен быть <= warningLow' });
    }

    if (value.warningLow >= value.warningHigh) {
      context.addIssue({ code: 'custom', path: ['warningLow'], message: 'warningLow должен быть < warningHigh' });
    }

    if (value.warningHigh > value.alarmHigh) {
      context.addIssue({ code: 'custom', path: ['warningHigh'], message: 'warningHigh должен быть <= alarmHigh' });
    }
  });

const pointThresholdSchema = z
  .object({
    warningLow: z.number().optional(),
    warningHigh: z.number().optional(),
    alarmLow: z.number().optional(),
    alarmHigh: z.number().optional()
  })
  .superRefine((value, context) => {
    if (
      value.alarmLow !== undefined &&
      value.warningLow !== undefined &&
      value.alarmLow > value.warningLow
    ) {
      context.addIssue({ code: 'custom', path: ['alarmLow'], message: 'alarmLow должен быть <= warningLow' });
    }

    if (
      value.warningLow !== undefined &&
      value.warningHigh !== undefined &&
      value.warningLow >= value.warningHigh
    ) {
      context.addIssue({ code: 'custom', path: ['warningLow'], message: 'warningLow должен быть < warningHigh' });
    }

    if (
      value.warningHigh !== undefined &&
      value.alarmHigh !== undefined &&
      value.warningHigh > value.alarmHigh
    ) {
      context.addIssue({ code: 'custom', path: ['warningHigh'], message: 'warningHigh должен быть <= alarmHigh' });
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
      displayMax: z.number(),
      clamp: z.boolean().optional()
    })
    .superRefine((value, context) => {
      if (value.rawMin >= value.rawMax) {
        context.addIssue({ code: 'custom', path: ['rawMin'], message: 'rawMin должен быть меньше rawMax' });
      }

      if (value.displayMin >= value.displayMax) {
        context.addIssue({ code: 'custom', path: ['displayMin'], message: 'displayMin должен быть меньше displayMax' });
      }
    }),
  z.object({
    type: z.literal('factor'),
    factor: z.number(),
    offset: z.number().optional()
  })
]);

const dataAddressSchema = z.discriminatedUnion('protocol', [
  z.object({
    protocol: z.literal('modbus'),
    slaveId: z.number().int().min(1).max(247),
    area: z.enum(['holding-register', 'input-register', 'coil', 'discrete-input']),
    functionCode: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(15),
      z.literal(16)
    ]),
    registerAddress: z.number().int().min(0).optional(),
    coilAddress: z.number().int().min(0).optional(),
    bitIndex: z.number().int().min(0).max(15).optional(),
    registerCount: z.number().int().positive().optional(),
    valueType: z.enum(['boolean', 'uint16', 'int16', 'uint32', 'int32', 'float32']),
    byteOrder: z.enum(['ABCD', 'BADC', 'CDAB', 'DCBA']).optional()
  }),
  z.object({ protocol: z.literal('mock'), seed: z.number().optional() }),
  z.object({ protocol: z.literal('manual') }),
  z.object({ protocol: z.literal('http'), path: z.string().min(1) }),
  z.object({ protocol: z.literal('mqtt'), topic: z.string().min(1) })
]);

const dataSourceConnectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mock') }),
  z.object({
    type: z.literal('modbus-rtu'),
    port: z.string().min(1, 'port не может быть пустым'),
    baudRate: z.number().int().positive(),
    dataBits: z.union([z.literal(7), z.literal(8)]),
    stopBits: z.union([z.literal(1), z.literal(2)]),
    parity: z.enum(['none', 'even', 'odd'])
  }),
  z.object({ type: z.literal('modbus-tcp'), host: z.string().min(1), port: z.number().int().positive() }),
  z.object({ type: z.literal('http'), baseUrl: z.string().min(1) }),
  z.object({ type: z.literal('mqtt'), brokerUrl: z.string().min(1) }),
  z.object({ type: z.literal('manual') })
]);

const dataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['mock', 'modbus-rtu', 'modbus-tcp', 'http', 'mqtt', 'manual']),
  enabled: z.boolean(),
  connection: dataSourceConnectionSchema,
  pollingIntervalMs: z.number().int().min(250).optional(),
  timeoutMs: z.number().int().positive().optional(),
  retryCount: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    'tank',
    'barrel',
    'pump',
    'valve',
    'scale',
    'truck',
    'loadingStation',
    'indicator',
    'line',
    'room',
    'machine',
    'custom'
  ]),
  description: z.string().optional(),
  parentAssetId: z.string().nullable().optional(),
  childAssetIds: z.array(z.string()).optional(),
  pointIds: z.array(z.string()),
  actuatorIds: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const pointSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['telemetry', 'control', 'calculated']),
    assetId: z.string().optional(),
    dataSourceId: z.string().optional(),
    valueType: z.enum(['boolean', 'uint16', 'int16', 'uint32', 'int32', 'float32', 'string']),
    rawUnit: z.string().optional(),
    displayUnit: z.string().optional(),
    address: dataAddressSchema.optional(),
    scaling: scalingSchema.optional(),
    thresholds: pointThresholdSchema.optional(),
    recordable: z.boolean(),
    enabled: z.boolean(),
    allowedValues: z.array(z.union([z.boolean(), z.number(), z.string()])).optional(),
    requiresConfirmation: z.boolean().optional(),
    safetyLevel: z.enum(['normal', 'dangerous', 'critical']).optional(),
    writeAddress: dataAddressSchema.optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
  .superRefine((value, context) => {
    if (value.kind === 'telemetry' && !value.address) {
      context.addIssue({ code: 'custom', path: ['address'], message: 'TelemetryPoint должен иметь address' });
    }

    if (value.kind === 'control' && !value.writeAddress) {
      context.addIssue({ code: 'custom', path: ['writeAddress'], message: 'ControlPoint должен иметь writeAddress' });
    }

    if (value.kind === 'control' && value.writeAddress?.protocol === 'modbus') {
      if (value.writeAddress.functionCode === 5) {
        if (value.writeAddress.area !== 'coil') {
          context.addIssue({ code: 'custom', path: ['writeAddress', 'area'], message: 'FC5 должен использовать area coil' });
        }

        if (value.writeAddress.coilAddress === undefined) {
          context.addIssue({ code: 'custom', path: ['writeAddress', 'coilAddress'], message: 'FC5 должен иметь coilAddress' });
        }
      }

      if (value.writeAddress.functionCode === 16) {
        if (value.writeAddress.area !== 'holding-register') {
          context.addIssue({ code: 'custom', path: ['writeAddress', 'area'], message: 'FC16 должен использовать holding-register' });
        }

        if (value.writeAddress.registerAddress === undefined) {
          context.addIssue({ code: 'custom', path: ['writeAddress', 'registerAddress'], message: 'FC16 должен иметь registerAddress' });
        }

        if (value.writeAddress.bitIndex === undefined) {
          context.addIssue({ code: 'custom', path: ['writeAddress', 'bitIndex'], message: 'FC16 должен иметь bitIndex' });
        }
      }
    }
  });

const actuatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['pump', 'valve', 'relay', 'led', 'motor', 'heater', 'fan', 'alarm', 'custom']),
  assetId: z.string().optional(),
  commandPointIds: z.array(z.string()),
  feedbackPointIds: z.array(z.string()),
  supportedCommands: z.array(z.enum(['start', 'stop', 'open', 'close', 'turnOn', 'turnOff', 'reset', 'setValue', 'custom'])),
  enabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const monitoringProfileSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  pointConfigs: z.array(
    z.object({
      pointId: z.string().min(1),
      enabled: z.boolean(),
      mode: z.enum(['interval', 'onChange', 'both']),
      sampleIntervalMs: z.number().int().min(250),
      minChangeDelta: z.number().optional(),
      retentionDays: z.number().int().positive().optional()
    })
  ),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const interlockSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  targetActuatorId: z.string().min(1),
  targetCommand: z.enum(['start', 'stop', 'open', 'close', 'turnOn', 'turnOff', 'reset', 'setValue', 'custom']),
  enabled: z.boolean(),
  condition: z.string().min(1),
  effect: z.enum(['warn', 'block']),
  message: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const commandSchema = z.object({
  id: z.string().min(1),
  actuatorId: z.string().min(1),
  commandType: z.enum(['start', 'stop', 'open', 'close', 'turnOn', 'turnOff', 'reset', 'setValue', 'custom']),
  value: z.union([z.boolean(), z.number(), z.string()]).optional(),
  requestedBy: z.string().optional(),
  requestedAt: z.string().min(1),
  status: z.enum([
    'created',
    'pendingConfirmation',
    'rejected',
    'blocked',
    'sent',
    'confirmed',
    'failed',
    'timeout'
  ]),
  result: z
    .object({
      commandId: z.string().min(1),
      success: z.boolean(),
      sentAt: z.string().optional(),
      confirmedAt: z.string().optional(),
      feedbackPointId: z.string().optional(),
      feedbackValue: z.union([z.boolean(), z.number(), z.string()]).optional(),
      error: z.string().optional()
    })
    .optional(),
  error: z.string().optional()
});


const processSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  graphId: z.string().min(1),
  inputSchema: z.object({
    fields: z.array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        valueType: z.enum(['string', 'number', 'boolean']),
        required: z.boolean(),
        unit: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional()
      })
    )
  }),
  enabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const processGraphSchema = z.object({
  id: z.string().min(1),
  processId: z.string().min(1),
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum([
        'start',
        'complete',
        'input',
        'readPoint',
        'captureReading',
        'command',
        'condition',
        'math',
        'wait',
        'interlock',
        'event'
      ]),
      data: z.record(z.string(), z.unknown())
    })
  ),
  edges: z.array(
    z.object({
      id: z.string().min(1),
      source: z.string().min(1),
      target: z.string().min(1),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional()
    })
  ),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const processJobSchema = z.object({
  id: z.string().min(1),
  processId: z.string().min(1),
  status: z.enum(['created', 'waiting', 'running', 'paused', 'completed', 'failed', 'cancelled']),
  input: z.record(z.string(), z.unknown()),
  context: z.record(z.string(), z.unknown()),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional()
});

export const appConfigSchema = z
  .object({
    schemaVersion: z.literal(2),
    app: z.object({
      mode: z.enum(['mock', 'real']),
      pollingIntervalMs: z.number().int().min(250, 'pollingIntervalMs должен быть не меньше 250'),
      simulationCommandsOnly: z.boolean(),
      realWriteEnabled: z.boolean()
    }),
    dataSources: z.array(dataSourceSchema),
    assets: z.array(assetSchema),
    points: z.array(pointSchema),
    actuators: z.array(actuatorSchema),
    interlocks: z.array(interlockSchema),
    commands: z.array(commandSchema),
    monitoringProfiles: z.array(monitoringProfileSchema),
    monitoringSessions: z.array(
      z.object({
        id: z.string().min(1),
        assetId: z.string().min(1),
        profileId: z.string().min(1),
        status: z.enum(['running', 'paused', 'stopped', 'error']),
        startedAt: z.string().min(1),
        stoppedAt: z.string().optional(),
        startedBy: z.string().optional(),
        note: z.string().optional()
      })
    ),
    processes: z.array(processSchema),
    processGraphs: z.array(processGraphSchema),
    processJobs: z.array(processJobSchema),
    thresholds: z.object({
      temperature: thresholdSchema,
      level: thresholdSchema
    }),
    interface: z.object({
      theme: z.enum(['dark', 'light', 'system']),
      language: z.enum(['ru', 'en']),
      cardSize: z.enum(['small', 'medium', 'large']),
      columns: z.union([z.literal('auto'), z.number().int().positive()]),
      showLastUpdate: z.boolean(),
      showRawValuesInDetails: z.boolean(),
      fullscreenOnStart: z.boolean()
    })
  })
  .superRefine((config, context) => {
    const dataSourceIds = new Set(config.dataSources.map((item) => item.id));
    const assetIds = new Set(config.assets.map((item) => item.id));
    const pointIds = new Set(config.points.map((item) => item.id));
    const controlPointIds = new Set(config.points.filter((point) => point.kind === 'control').map((point) => point.id));
    const actuatorIds = new Set(config.actuators.map((item) => item.id));

    assertUnique(config.dataSources.map((item) => item.id), ['dataSources'], 'dataSource.id должен быть уникальным', context);
    assertUnique(config.assets.map((item) => item.id), ['assets'], 'asset.id должен быть уникальным', context);
    assertUnique(config.points.map((item) => item.id), ['points'], 'point.id должен быть уникальным', context);
    assertUnique(config.actuators.map((item) => item.id), ['actuators'], 'actuator.id должен быть уникальным', context);

    config.assets.forEach((asset, index) => {
      asset.pointIds.forEach((pointId) => {
        if (!pointIds.has(pointId)) {
          context.addIssue({ code: 'custom', path: ['assets', index, 'pointIds'], message: `pointId ${pointId} не найден` });
        }
      });
      asset.actuatorIds.forEach((actuatorId) => {
        if (!actuatorIds.has(actuatorId)) {
          context.addIssue({ code: 'custom', path: ['assets', index, 'actuatorIds'], message: `actuatorId ${actuatorId} не найден` });
        }
      });

      const levelPointId = asset.metadata?.levelPointId;
      if (typeof levelPointId === 'string' && levelPointId && !pointIds.has(levelPointId)) {
        context.addIssue({ code: 'custom', path: ['assets', index, 'metadata', 'levelPointId'], message: `levelPointId ${levelPointId} не найден` });
      }

      const temperaturePointId = asset.metadata?.temperaturePointId;
      if (typeof temperaturePointId === 'string' && temperaturePointId && !pointIds.has(temperaturePointId)) {
        context.addIssue({ code: 'custom', path: ['assets', index, 'metadata', 'temperaturePointId'], message: `temperaturePointId ${temperaturePointId} не найден` });
      }

      const volumePointId = asset.metadata?.volumePointId;
      if (typeof volumePointId === 'string' && volumePointId && !pointIds.has(volumePointId)) {
        context.addIssue({ code: 'custom', path: ['assets', index, 'metadata', 'volumePointId'], message: `volumePointId ${volumePointId} не найден` });
      }
    });

    config.points.forEach((point, index) => {
      if (point.assetId && !assetIds.has(point.assetId)) {
        context.addIssue({ code: 'custom', path: ['points', index, 'assetId'], message: 'assetId должен ссылаться на существующий asset.id' });
      }

      if (point.dataSourceId && !dataSourceIds.has(point.dataSourceId)) {
        context.addIssue({ code: 'custom', path: ['points', index, 'dataSourceId'], message: 'dataSourceId должен ссылаться на существующий dataSource.id' });
      }
    });

    config.actuators.forEach((actuator, index) => {
      if (actuator.assetId && !assetIds.has(actuator.assetId)) {
        context.addIssue({ code: 'custom', path: ['actuators', index, 'assetId'], message: 'assetId должен ссылаться на существующий asset.id' });
      }

      actuator.commandPointIds.forEach((pointId) => {
        if (!pointIds.has(pointId)) {
          context.addIssue({ code: 'custom', path: ['actuators', index, 'commandPointIds'], message: `commandPointId ${pointId} не найден` });
        } else if (!controlPointIds.has(pointId)) {
          context.addIssue({ code: 'custom', path: ['actuators', index, 'commandPointIds'], message: `commandPointId ${pointId} должен ссылаться на ControlPoint` });
        }
      });

      actuator.feedbackPointIds.forEach((pointId) => {
        if (!pointIds.has(pointId)) {
          context.addIssue({ code: 'custom', path: ['actuators', index, 'feedbackPointIds'], message: `feedbackPointId ${pointId} не найден` });
        }
      });
    });

    config.interlocks.forEach((interlock, index) => {
      if (!actuatorIds.has(interlock.targetActuatorId)) {
        context.addIssue({ code: 'custom', path: ['interlocks', index, 'targetActuatorId'], message: 'targetActuatorId должен ссылаться на существующий actuator.id' });
      }
    });

    config.monitoringProfiles.forEach((profile, index) => {
      if (!assetIds.has(profile.assetId)) {
        context.addIssue({ code: 'custom', path: ['monitoringProfiles', index, 'assetId'], message: 'assetId должен ссылаться на существующий asset.id' });
      }
      profile.pointConfigs.forEach((pointConfig) => {
        if (!pointIds.has(pointConfig.pointId)) {
          context.addIssue({ code: 'custom', path: ['monitoringProfiles', index, 'pointConfigs'], message: `pointId ${pointConfig.pointId} не найден` });
        }
      });
    });

  });

export type AppConfigSchema = z.infer<typeof appConfigSchema>;

function assertUnique(
  ids: string[],
  path: Array<string | number>,
  message: string,
  context: z.RefinementCtx
): void {
  if (ids.length !== new Set(ids).size) {
    context.addIssue({ code: 'custom', path, message });
  }
}
