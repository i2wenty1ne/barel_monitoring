# SPEC: Industrial Flow Monitor & Control

## 0. Назначение документа

Этот документ описывает новую версию приложения, которое должно заменить текущую версию `Barrel Monitor`.

Новая версия должна быть не узким приложением для мониторинга бочек, а универсальной desktop-платформой для:

```text
мониторинга объектов
подключения источников данных
чтения датчиков
управления исполнительными механизмами
ведения истории измерений
построения графиков
настройки связей через graph editor
создания и выполнения процессов
```

Текущие runtime-возможности приложения должны работать на новой архитектуре. Старые форматы config не поддерживаются в runtime: приложение принимает только canonical schema v2.

Технологический стек оставляем:

```text
Electron
React
TypeScript
React Flow
TailwindCSS
```

Дополнительно допускаются инфраструктурные библиотеки внутри Electron main process, если они не ломают архитектуру:

```text
serialport
modbus library
zod
local file storage / SQLite-like local storage для истории
chart library для графиков
```

Renderer не должен иметь прямого доступа к Node.js, `fs`, `serialport`, `electron`, файловой системе и Modbus. Весь доступ к железу, файлам, конфигам и истории выполняется через Electron main process и безопасный preload API.

---

# 1. Цель новой версии

Текущая версия приложения умеет работать вокруг сущностей:

```text
бочка
устройство
канал
регистр
значение
```

Новая версия должна перейти к универсальной доменной модели:

```text
Asset
DataSource
Point
TelemetryPoint
ControlPoint
Actuator
Command
Process
ProcessGraph
MonitoringProfile
MonitoringSession
TimeSeriesRecord
EventLog
```

Нужно, чтобы приложение могло описывать не только бочки, но и:

```text
бочки
резервуары
насосы
задвижки
клапаны
весы
грузовики
линии подачи
индикаторы
реле
датчики температуры
датчики объема
датчики уровня
датчики веса
датчики присутствия
процессы загрузки/перекачки/наполнения
```

---

# 2. Главная идея продукта

Приложение должно позволять пользователю собрать промышленную схему без программирования:

```text
1. Добавить объект, например Бочка №1.
2. Добавить источник данных, например Modbus RTU устройство.
3. Добавить точки данных: объем, температура, уровень.
4. Привязать точки данных к объекту.
5. Включить мониторинг конкретного объекта.
6. Записывать историю значений.
7. Смотреть live-значения.
8. Строить графики по истории.
9. Добавить исполнительные механизмы: насос, задвижка, светодиод.
10. Добавить команды: включить насос, открыть задвижку, включить индикатор.
11. Через React Flow настроить связи и сценарии.
12. Запустить процесс, например загрузку грузовика по массе.
13. Получить журнал процесса и итоговые значения.
```

---

# 3. Что нужно сохранить из текущей версии

Из текущего `Barrel Monitor` нужно мигрировать:

```text
Electron desktop app
React renderer
TypeScript
TailwindCSS UI
FSD-подход / модульная архитектура
безопасный preload/contextBridge
config storage
event log
mock data mode
real Modbus RTU mode
manual register read
COM-port selection
serial settings
device settings
channel settings
barrel visualization
barrel details
diagnostics page
event log page
about page
settings page
Windows packaging
read-only Modbus polling
status handling: ok/warning/alarm/error/stale
```

Но старые сущности должны быть переименованы и перенесены:

```text
Barrel  → Asset type: tank/barrel
Device  → DataSource
Channel → Point / TelemetryPoint
Register config → DataAddress
Snapshot value → Reading
Barrel card → Asset dashboard widget
```

---

# 4. Новая терминология

## 4.1 Asset

`Asset` — объект мониторинга или управления.

Примеры:

```text
Бочка №1
Резервуар №2
Насос №1
Задвижка подачи
Весы №1
Пост загрузки №1
Световой индикатор
Грузовик
```

В UI:

```text
Объекты
```

В коде:

```ts
Asset
```

---

## 4.2 DataSource

`DataSource` — источник данных или шлюз, откуда приложение получает значения или куда отправляет команды.

Примеры:

```text
Modbus RTU устройство
Modbus TCP устройство
Raspberry Pi simulator
ESP32 gateway
Mock source
HTTP API
MQTT gateway
```

В UI:

```text
Источники данных
```

В коде:

```ts
DataSource
```

---

## 4.3 Point

`Point` — универсальная точка данных.

Point может быть читаемой или управляемой.

```text
TelemetryPoint — читаемое значение
ControlPoint   — управляемая точка
```

Примеры TelemetryPoint:

```text
уровень бочки
температура бочки
объем бочки
вес на весах
насос работает
задвижка открыта
авария насоса
грузовик на весах
```

Примеры ControlPoint:

```text
включить насос
выключить насос
открыть задвижку
закрыть задвижку
включить светодиод
задать уставку
сбросить аварию
```

В UI:

```text
Параметры
Точки данных
Точки управления
```

В коде:

```ts
Point
TelemetryPoint
ControlPoint
```

---

## 4.4 Actuator

`Actuator` — исполнительный механизм.

Примеры:

```text
насос
реле
задвижка
клапан
светодиод
сирена
конвейер
мотор
нагреватель
```

В UI:

```text
Исполнительные механизмы
```

В коде:

```ts
Actuator
```

---

## 4.5 Command

`Command` — доменное действие над исполнительным механизмом.

Примеры:

```text
start pump
stop pump
open valve
close valve
turn on led
turn off led
reset alarm
set target value
```

Команда не должна быть простой записью в регистр. Команда должна проходить через:

```text
validation
permissions
confirmation
interlocks
write operation
feedback validation
event log
command result
```

---

## 4.6 MonitoringProfile

`MonitoringProfile` — настройка записи истории для конкретного объекта.

Например:

```text
Для Бочки №1 писать:
- объем каждые 5 секунд
- температуру каждые 10 секунд
- уровень только при изменении больше 1%
```

---

## 4.7 MonitoringSession

`MonitoringSession` — факт включенного мониторинга объекта.

Например:

```text
Мониторинг Бочки №1 включен 2026-06-30 12:00:00.
Пишутся volume и temperature.
Статус: running.
```

---

## 4.8 Process

`Process` — сценарий или технологический процесс.

Примеры:

```text
Загрузка грузовика по массе
Наполнение бочки до объема
Перекачка из резервуара А в резервуар Б
Контроль температуры
Автоматическое включение насоса
```

---

## 4.9 ProcessGraph

`ProcessGraph` — граф процесса, редактируемый через React Flow.

React Flow используется только как визуальный редактор.

React Flow не должен напрямую читать Modbus и не должен напрямую писать в регистры.

Правильная цепочка:

```text
React Flow
↓
ProcessGraph JSON
↓
ProcessRuntime
↓
CommandService
↓
SafetyService / InterlockService
↓
DataService
↓
Modbus / Mock / другое железо
```

---

## 4.10 TimeSeriesRecord

`TimeSeriesRecord` — одна историческая запись значения.

Например:

```text
2026-06-30 12:00:05
Бочка №1
Температура
24.7 °C
quality: good
```

---

# 5. Доменная модель

## 5.1 Asset

```ts
type AssetType =
  | 'tank'
  | 'barrel'
  | 'pump'
  | 'valve'
  | 'scale'
  | 'truck'
  | 'loadingStation'
  | 'indicator'
  | 'line'
  | 'room'
  | 'machine'
  | 'custom';

type Asset = {
  id: string;
  name: string;
  type: AssetType;

  description?: string;

  parentAssetId?: string | null;
  childAssetIds?: string[];

  pointIds: string[];
  actuatorIds: string[];

  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
};
```

Пример:

```json
{
  "id": "tank-1",
  "name": "Бочка №1",
  "type": "barrel",
  "pointIds": [
    "tank-1-volume",
    "tank-1-temperature",
    "tank-1-level"
  ],
  "actuatorIds": [],
  "metadata": {
    "maxVolumeL": 1000,
    "heightMm": 3000
  }
}
```

---

## 5.2 DataSource

```ts
type DataSourceType =
  | 'mock'
  | 'modbus-rtu'
  | 'modbus-tcp'
  | 'http'
  | 'mqtt'
  | 'manual';

type DataSource = {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;

  connection: DataSourceConnection;

  pollingIntervalMs?: number;
  timeoutMs?: number;
  retryCount?: number;

  createdAt: string;
  updatedAt: string;
};

type DataSourceConnection =
  | MockConnectionConfig
  | ModbusRtuConnectionConfig
  | ModbusTcpConnectionConfig
  | HttpConnectionConfig
  | MqttConnectionConfig
  | ManualConnectionConfig;

type ModbusRtuConnectionConfig = {
  type: 'modbus-rtu';
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
};
```

Пример:

```json
{
  "id": "rpi-modbus-1",
  "name": "Raspberry Pi Modbus Simulator",
  "type": "modbus-rtu",
  "enabled": true,
  "connection": {
    "type": "modbus-rtu",
    "port": "COM3",
    "baudRate": 115200,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "none"
  },
  "pollingIntervalMs": 1000,
  "timeoutMs": 500,
  "retryCount": 1
}
```

---

## 5.3 DataAddress

`DataAddress` описывает, где взять значение внутри источника данных.

```ts
type DataAddress =
  | ModbusDataAddress
  | HttpDataAddress
  | MqttDataAddress
  | MockDataAddress
  | ManualDataAddress;

type ModbusDataAddress = {
  protocol: 'modbus';
  slaveId: number;

  area: 'holding-register' | 'input-register' | 'coil' | 'discrete-input';

  functionCode: 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16;

  registerAddress?: number;
  coilAddress?: number;

  registerCount?: number;

  valueType:
    | 'boolean'
    | 'uint16'
    | 'int16'
    | 'uint32'
    | 'int32'
    | 'float32';

  byteOrder?: 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';
};
```

---

## 5.4 Point

```ts
type PointKind = 'telemetry' | 'control' | 'calculated';

type PointValueType =
  | 'boolean'
  | 'uint16'
  | 'int16'
  | 'uint32'
  | 'int32'
  | 'float32'
  | 'string';

type PointStatus =
  | 'ok'
  | 'warning'
  | 'alarm'
  | 'error'
  | 'stale'
  | 'disabled';

type Point = {
  id: string;
  name: string;

  kind: PointKind;

  assetId?: string;
  dataSourceId?: string;

  valueType: PointValueType;

  rawUnit?: string;
  displayUnit?: string;

  address?: DataAddress;

  scaling?: ScalingConfig;
  thresholds?: ThresholdConfig;

  recordable: boolean;

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
};
```

---

## 5.5 TelemetryPoint

```ts
type TelemetryPoint = Point & {
  kind: 'telemetry';
  address: DataAddress;
  recordable: boolean;
};
```

Пример уровня:

```json
{
  "id": "tank-1-level",
  "name": "Уровень Бочки №1",
  "kind": "telemetry",
  "assetId": "tank-1",
  "dataSourceId": "rpi-modbus-1",
  "valueType": "uint16",
  "rawUnit": "мм",
  "displayUnit": "%",
  "recordable": true,
  "enabled": true,
  "address": {
    "protocol": "modbus",
    "slaveId": 1,
    "area": "holding-register",
    "functionCode": 3,
    "registerAddress": 0,
    "registerCount": 1,
    "valueType": "uint16",
    "byteOrder": "ABCD"
  },
  "scaling": {
    "type": "linear",
    "rawMin": 0,
    "rawMax": 3000,
    "displayMin": 0,
    "displayMax": 100
  }
}
```

---

## 5.6 ControlPoint

```ts
type ControlPoint = Point & {
  kind: 'control';

  allowedValues?: Array<boolean | number | string>;

  requiresConfirmation: boolean;

  safetyLevel: 'normal' | 'dangerous' | 'critical';

  writeAddress: DataAddress;
};
```

Пример управления насосом:

```json
{
  "id": "pump-1-run-command",
  "name": "Команда включения насоса №1",
  "kind": "control",
  "assetId": "pump-1",
  "dataSourceId": "rpi-modbus-1",
  "valueType": "boolean",
  "requiresConfirmation": true,
  "safetyLevel": "dangerous",
  "recordable": false,
  "enabled": true,
  "writeAddress": {
    "protocol": "modbus",
    "slaveId": 1,
    "area": "coil",
    "functionCode": 5,
    "coilAddress": 0,
    "valueType": "boolean"
  }
}
```

---

## 5.7 ScalingConfig

```ts
type ScalingConfig =
  | {
      type: 'none';
    }
  | {
      type: 'linear';
      rawMin: number;
      rawMax: number;
      displayMin: number;
      displayMax: number;
      clamp?: boolean;
    }
  | {
      type: 'factor';
      factor: number;
      offset?: number;
    };
```

Примеры:

```json
{
  "type": "linear",
  "rawMin": 0,
  "rawMax": 3000,
  "displayMin": 0,
  "displayMax": 100,
  "clamp": true
}
```

```json
{
  "type": "factor",
  "factor": 0.1
}
```

---

## 5.8 ThresholdConfig

```ts
type ThresholdConfig = {
  warningLow?: number;
  warningHigh?: number;
  alarmLow?: number;
  alarmHigh?: number;
};
```

Пример:

```json
{
  "warningLow": 10,
  "warningHigh": 90,
  "alarmLow": 5,
  "alarmHigh": 95
}
```

---

## 5.9 Reading

```ts
type Reading = {
  pointId: string;
  assetId?: string;

  rawValue: number | boolean | string | null;
  displayValue: number | boolean | string | null;

  rawUnit?: string;
  displayUnit?: string;

  status: PointStatus;

  quality: 'good' | 'bad' | 'uncertain' | 'stale';

  timestamp: string;

  error?: string;
};
```

---

## 5.10 Actuator

```ts
type ActuatorType =
  | 'pump'
  | 'valve'
  | 'relay'
  | 'led'
  | 'motor'
  | 'heater'
  | 'fan'
  | 'alarm'
  | 'custom';

type Actuator = {
  id: string;
  name: string;
  type: ActuatorType;

  assetId?: string;

  commandPointIds: string[];
  feedbackPointIds: string[];

  supportedCommands: CommandType[];

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
};
```

---

## 5.11 Command

```ts
type CommandType =
  | 'start'
  | 'stop'
  | 'open'
  | 'close'
  | 'turnOn'
  | 'turnOff'
  | 'reset'
  | 'setValue'
  | 'custom';

type CommandStatus =
  | 'created'
  | 'pendingConfirmation'
  | 'rejected'
  | 'blocked'
  | 'sent'
  | 'confirmed'
  | 'failed'
  | 'timeout';

type Command = {
  id: string;

  actuatorId: string;
  commandType: CommandType;

  value?: boolean | number | string;

  requestedBy?: string;
  requestedAt: string;

  status: CommandStatus;

  result?: CommandResult;

  error?: string;
};

type CommandResult = {
  commandId: string;

  success: boolean;

  sentAt?: string;
  confirmedAt?: string;

  feedbackPointId?: string;
  feedbackValue?: number | boolean | string;

  error?: string;
};
```

---

## 5.12 Interlock

```ts
type Interlock = {
  id: string;

  name: string;

  targetActuatorId: string;
  targetCommand: CommandType;

  enabled: boolean;

  condition: string;

  effect: 'warn' | 'block';

  message: string;

  createdAt: string;
  updatedAt: string;
};
```

Пример:

```json
{
  "id": "pump-1-no-dry-run",
  "name": "Защита от сухого хода",
  "targetActuatorId": "pump-1",
  "targetCommand": "start",
  "enabled": true,
  "condition": "tank-1-level-percent < 10",
  "effect": "block",
  "message": "Нельзя включить насос: уровень ниже 10%."
}
```

---

## 5.13 MonitoringProfile

```ts
type MonitoringProfile = {
  id: string;

  assetId: string;

  name: string;

  enabled: boolean;

  pointConfigs: MonitoringPointConfig[];

  createdAt: string;
  updatedAt: string;
};

type MonitoringPointConfig = {
  pointId: string;

  enabled: boolean;

  mode: 'interval' | 'onChange' | 'both';

  sampleIntervalMs: number;

  minChangeDelta?: number;

  retentionDays?: number;
};
```

---

## 5.14 MonitoringSession

```ts
type MonitoringSession = {
  id: string;

  assetId: string;
  profileId: string;

  status: 'running' | 'paused' | 'stopped' | 'error';

  startedAt: string;
  stoppedAt?: string;

  startedBy?: string;

  note?: string;
};
```

---

## 5.15 TimeSeriesRecord

```ts
type TimeSeriesRecord = {
  id: string;

  assetId: string;
  pointId: string;

  monitoringSessionId?: string;

  timestamp: string;

  rawValue: number | boolean | string | null;
  value: number | boolean | string | null;

  unit?: string;

  quality: 'good' | 'bad' | 'uncertain' | 'stale';

  source: 'modbus' | 'mock' | 'manual' | 'calculated';

  metadata?: Record<string, unknown>;
};
```

---

## 5.16 Process

```ts
type Process = {
  id: string;

  name: string;
  description?: string;

  graphId: string;

  inputSchema: ProcessInputSchema;

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
};

type ProcessInputSchema = {
  fields: Array<{
    key: string;
    label: string;
    valueType: 'string' | 'number' | 'boolean';
    required: boolean;
    unit?: string;
    min?: number;
    max?: number;
    defaultValue?: string | number | boolean;
  }>;
};
```

---

## 5.17 ProcessGraph

```ts
type ProcessGraph = {
  id: string;

  processId: string;

  nodes: ProcessGraphNode[];
  edges: ProcessGraphEdge[];

  createdAt: string;
  updatedAt: string;
};

type ProcessGraphNode =
  | StartNode
  | CompleteNode
  | ReadPointNode
  | CaptureReadingNode
  | CommandNode
  | ConditionNode
  | MathNode
  | WaitNode
  | InputNode
  | InterlockNode;

type ProcessGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};
```

---

## 5.18 ProcessJob

```ts
type ProcessJob = {
  id: string;

  processId: string;

  status:
    | 'created'
    | 'waiting'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';

  input: Record<string, unknown>;

  context: Record<string, unknown>;

  startedAt?: string;
  completedAt?: string;

  result?: Record<string, unknown>;

  error?: string;
};
```

---

# 6. Основные пользовательские сценарии

## 6.1 Миграция старого сценария бочек

Пользователь должен иметь возможность сделать то же, что в старой версии:

```text
1. Добавить источник данных МВ110 или УР 203Ex.
2. Указать COM-порт.
3. Указать baudRate, parity, dataBits, stopBits.
4. Добавить объект "Бочка №1".
5. Добавить точку "Уровень".
6. Добавить точку "Температура".
7. Привязать точки к бочке.
8. Настроить Modbus-регистры.
9. Читать live-значения.
10. Видеть карточку бочки.
11. Видеть детальную страницу бочки.
12. Использовать диагностику ручного чтения регистров.
13. Смотреть журнал событий.
```

---

## 6.2 Добавление бочки с датчиками

Сценарий:

```text
1. Пользователь открывает "Объекты".
2. Нажимает "Добавить объект".
3. Выбирает тип "Бочка".
4. Указывает название: "Бочка №1".
5. Указывает параметры:
   - объем, л
   - высота, мм
   - описание
6. Добавляет точки:
   - Объем
   - Температура
   - Уровень
7. Для каждой точки выбирает источник данных.
8. Для каждой точки задает адрес данных.
9. Сохраняет объект.
10. Объект появляется на мониторинге.
```

---

## 6.3 Включение мониторинга конкретной бочки

Сценарий:

```text
1. Пользователь открывает Бочка №1.
2. Видит live-значения:
   - объем
   - температура
   - уровень
3. Открывает вкладку "Мониторинг".
4. Выбирает, какие точки писать в историю:
   - объем каждые 5 секунд
   - температура каждые 10 секунд
5. Нажимает "Включить мониторинг".
6. Создается MonitoringSession.
7. HistorianService начинает писать TimeSeriesRecord.
8. На странице бочки появляется статус "Мониторинг активен".
9. Пользователь открывает вкладку "История".
10. Строит график за выбранный период.
```

---

## 6.4 Добавление насоса

Сценарий:

```text
1. Пользователь создает Asset type: pump.
2. Создает Actuator type: pump.
3. Создает ControlPoint "Включить/выключить насос".
4. Создает TelemetryPoint "Насос работает".
5. Создает TelemetryPoint "Авария насоса".
6. Привязывает точки к источнику данных.
7. Указывает Modbus write address для ControlPoint.
8. Указывает Modbus read address для feedback.
9. В UI появляется карточка насоса.
10. Пользователь может включить/выключить насос в simulation mode.
```

Для MVP реальные write-команды должны быть выключены по умолчанию. Включение реальных write-команд должно требовать отдельного флага в настройках.

---

## 6.5 Добавление весов

Сценарий:

```text
1. Пользователь добавляет Asset type: scale.
2. Создает TelemetryPoint "Текущий вес".
3. Создает TelemetryPoint "Грузовик на весах".
4. Привязывает точки к Modbus-регистрам.
5. В мониторинге видит вес в kg.
6. Может использовать эту точку в ProcessGraph.
```

---

## 6.6 Процесс загрузки грузовика по массе

Сценарий:

```text
1. Пользователь добавляет LoadingStation.
2. К LoadingStation привязывает:
   - Весы №1
   - Насос №1
   - Светодиод "Грузовик на весах"
3. Создает Process: "Загрузка грузовика по массе".
4. В React Flow собирает процесс:
   - Start
   - Check truck presence
   - Turn on LED
   - Operator input targetMassKg
   - Capture initial weight
   - Start pump
   - Loop read current weight
   - Calculate loaded mass
   - If loadedMass >= targetMassKg
   - Stop pump
   - Capture final weight
   - Complete
5. Оператор запускает ProcessJob.
6. Вводит целевую массу вещества.
7. Runtime проверяет условия и блокировки.
8. Насос включается.
9. Вес увеличивается.
10. Когда достигнута целевая масса, насос выключается.
11. Система фиксирует:
   - начальный вес
   - финальный вес
   - фактически загруженную массу
   - время процесса
   - ошибки, если были
```

---

# 7. Архитектура приложения

## 7.1 Общая структура

```text
src/
  main/
    app/
    ipc/
    services/
    storage/
    data-sources/
    historian/
    process-runtime/
    command/
    diagnostics/
    config/
    event-log/

  preload/
    index.ts

  renderer/
    app/
    pages/
    widgets/
    features/
    entities/
    shared/
```

---

## 7.2 Main process

Main process отвечает за:

```text
чтение/запись конфигурации
работу с serialport
Modbus RTU
mock data
live snapshot
историю значений
event log
diagnostics
process runtime
command execution
interlock checks
IPC API
Windows native integration
```

Renderer не должен напрямую читать файлы, COM-порты и железо.

---

## 7.3 Preload API

Preload должен экспортировать безопасный API:

```ts
window.appApi = {
  config: {
    get: () => Promise<AppConfig>;
    save: (config: AppConfig) => Promise<void>;
    reset: () => Promise<AppConfig>;
  };

  dataSources: {
    listSerialPorts: () => Promise<SerialPortInfo[]>;
    testConnection: (dataSourceId: string) => Promise<TestConnectionResult>;
  };

  readings: {
    getSnapshot: () => Promise<LiveSnapshot>;
    subscribeSnapshot: (callback: (snapshot: LiveSnapshot) => void) => Unsubscribe;
    readPointNow: (pointId: string) => Promise<Reading>;
    manualRead: (request: ManualReadRequest) => Promise<ManualReadResult>;
  };

  assets: {
    list: () => Promise<Asset[]>;
    get: (id: string) => Promise<Asset | null>;
    create: (input: CreateAssetInput) => Promise<Asset>;
    update: (id: string, patch: UpdateAssetInput) => Promise<Asset>;
    remove: (id: string) => Promise<void>;
  };

  points: {
    list: () => Promise<Point[]>;
    create: (input: CreatePointInput) => Promise<Point>;
    update: (id: string, patch: UpdatePointInput) => Promise<Point>;
    remove: (id: string) => Promise<void>;
  };

  monitoring: {
    startSession: (assetId: string, profileId: string) => Promise<MonitoringSession>;
    stopSession: (sessionId: string) => Promise<void>;
    getActiveSessions: () => Promise<MonitoringSession[]>;
    getProfiles: (assetId: string) => Promise<MonitoringProfile[]>;
    saveProfile: (profile: MonitoringProfile) => Promise<MonitoringProfile>;
  };

  history: {
    getTrend: (query: GetTrendQuery) => Promise<TrendSeries[]>;
    exportCsv: (query: GetTrendQuery) => Promise<ExportResult>;
  };

  commands: {
    execute: (request: ExecuteCommandRequest) => Promise<CommandResult>;
    getHistory: (query: CommandHistoryQuery) => Promise<Command[]>;
  };

  processes: {
    list: () => Promise<Process[]>;
    get: (id: string) => Promise<Process | null>;
    save: (process: Process) => Promise<Process>;
    saveGraph: (graph: ProcessGraph) => Promise<ProcessGraph>;
    validateGraph: (graph: ProcessGraph) => Promise<GraphValidationResult>;
    startJob: (processId: string, input: Record<string, unknown>) => Promise<ProcessJob>;
    stopJob: (jobId: string) => Promise<void>;
    getJob: (jobId: string) => Promise<ProcessJob | null>;
  };

  events: {
    list: (query: EventLogQuery) => Promise<EventLogEntry[]>;
    subscribe: (callback: (event: EventLogEntry) => void) => Unsubscribe;
    clear: () => Promise<void>;
  };

  diagnostics: {
    getSystemInfo: () => Promise<SystemInfo>;
    copyDiagnostics: () => Promise<string>;
  };
};
```

---

# 8. Storage

## 8.1 Что хранить

Нужно хранить:

```text
AppConfig
Assets
DataSources
Points
Actuators
MonitoringProfiles
MonitoringSessions
TimeSeriesRecords
Processes
ProcessGraphs
ProcessJobs
Commands
EventLog
```

Для MVP можно использовать локальное хранилище в Electron main process.

Требования:

```text
хранилище должно быть локальным
должно работать без интернета
должно быть переносимым
должно валидировать schema v2 без runtime-миграций
должно уметь экспортировать историю в CSV
```

Для конфигурации можно использовать JSON.

Для истории лучше использовать локальную базу, потому что история может быть большой.

---

## 8.2 Config schema v2

Приложение принимает только canonical schema v2.

Актуальные top-level сущности:

```text
dataSources
points
assets
monitoringProfiles
```

Правила загрузки:

```text
1. отсутствующий config создает default schema v2 config
2. некорректный JSON дает default config и validation error
3. невалидная schema v2 дает default config и validation error
4. валидная schema v2 используется напрямую
5. ConfigService не создает backup и не выполняет write-back нормализацию
```

---

# 9. DataService

## 9.1 Назначение

`DataService` отвечает за чтение live-значений.

Он должен поддерживать:

```text
MockDataService
ModbusRtuDataService
ManualDataService
future: ModbusTcpDataService
future: HttpDataService
future: MqttDataService
```

---

## 9.2 LiveSnapshot

```ts
type LiveSnapshot = {
  timestamp: string;

  readingsByPointId: Record<string, Reading>;

  dataSourceStatuses: Record<string, DataSourceStatus>;

  errors: Array<{
    source: string;
    message: string;
    timestamp: string;
  }>;
};
```

---

## 9.3 Polling rules

Требования:

```text
не выполнять параллельные запросы к одному Modbus RTU порту
использовать timeout
использовать retryCount
не падать при ошибке одного point
отдавать partial snapshot
не спамить event log одинаковыми ошибками
помечать устаревшие значения как stale
```

---

## 9.4 Modbus RTU read

Должны поддерживаться:

```text
Function 01 Read Coils
Function 02 Read Discrete Inputs
Function 03 Read Holding Registers
Function 04 Read Input Registers
```

Должны поддерживаться типы:

```text
boolean
uint16
int16
uint32
int32
float32
```

Должен поддерживаться byte order:

```text
ABCD
CDAB
BADC
DCBA
```

---

## 9.5 Modbus write

На первом этапе реальные write-команды должны быть отключены по умолчанию.

Должны поддерживаться после явного включения:

```text
Function 05 Write Single Coil
Function 06 Write Single Register
Function 15 Write Multiple Coils
Function 16 Write Multiple Registers
```

Перед записью обязательно:

```text
validate command
check permissions
check confirmation
check interlocks
write event log
execute write
read feedback point if configured
confirm result
write command result
```

---

# 10. HistorianService

## 10.1 Назначение

`HistorianService` отвечает за запись исторических значений.

Он не читает железо напрямую. Он получает live snapshot от `DataService`.

---

## 10.2 Правила записи

Для каждого активного `MonitoringSession` сервис должен:

```text
найти MonitoringProfile
найти включенные pointConfigs
следить за readings этих point
записывать TimeSeriesRecord по правилам:
  interval
  onChange
  both
учитывать minChangeDelta
учитывать quality
учитывать retentionDays
```

---

## 10.3 Запись по interval

Если `mode = interval`, значение пишется не чаще указанного интервала.

Пример:

```text
sampleIntervalMs = 5000
значение пишется каждые 5 секунд
```

---

## 10.4 Запись onChange

Если `mode = onChange`, значение пишется только при значимом изменении.

Пример:

```text
minChangeDelta = 0.2
температура изменилась с 24.1 до 24.2 → не пишем
температура изменилась с 24.1 до 24.4 → пишем
```

---

## 10.5 Trend query

```ts
type GetTrendQuery = {
  assetId?: string;
  pointIds: string[];

  from: string;
  to: string;

  aggregation?: 'raw' | 'avg' | 'min' | 'max' | 'last';
  bucketMs?: number;
};
```

---

## 10.6 Trend result

```ts
type TrendSeries = {
  pointId: string;
  pointName: string;
  unit?: string;

  values: Array<{
    timestamp: string;
    value: number | boolean | string | null;
    quality: 'good' | 'bad' | 'uncertain' | 'stale';
  }>;
};
```

---

# 11. CommandService

## 11.1 Назначение

`CommandService` отвечает за выполнение действий.

Он должен быть отдельным от `DataService`.

---

## 11.2 Pipeline команды

```text
1. receive command request
2. validate actuator exists
3. validate command is supported
4. validate control point exists
5. validate allowed value
6. check app mode: simulation / real
7. check requiresConfirmation
8. check interlocks
9. write command created event
10. execute write through DataSource adapter
11. wait for feedback if configured
12. create CommandResult
13. write event log
14. return result
```

---

## 11.3 Safety

Если команда имеет `safetyLevel = dangerous` или `critical`, UI обязан показать confirmation dialog.

Для `critical` дополнительно можно требовать ввод текста подтверждения:

```text
ВВЕСТИ: ПОДТВЕРЖДАЮ
```

---

# 12. ProcessRuntime

## 12.1 Назначение

`ProcessRuntime` исполняет граф процесса.

Он не должен быть привязан к React Flow напрямую. Он должен получать сериализованный `ProcessGraph`.

---

## 12.2 Поддерживаемые node types

```text
start
complete
input
readPoint
captureReading
command
condition
math
wait
interlock
event
```

---

## 12.3 StartNode

Запускает процесс.

```ts
type StartNode = {
  id: string;
  type: 'start';
  data: {};
};
```

---

## 12.4 InputNode

Описывает входной параметр.

```ts
type InputNode = {
  id: string;
  type: 'input';
  data: {
    key: string;
    label: string;
    valueType: 'string' | 'number' | 'boolean';
    required: boolean;
    unit?: string;
    min?: number;
    max?: number;
  };
};
```

---

## 12.5 ReadPointNode

Читает текущее значение point.

```ts
type ReadPointNode = {
  id: string;
  type: 'readPoint';
  data: {
    pointId: string;
    variable: string;
  };
};
```

---

## 12.6 CaptureReadingNode

Фиксирует значение в context процесса.

```ts
type CaptureReadingNode = {
  id: string;
  type: 'captureReading';
  data: {
    pointId: string;
    variable: string;
  };
};
```

---

## 12.7 CommandNode

Выполняет команду.

```ts
type CommandNode = {
  id: string;
  type: 'command';
  data: {
    actuatorId: string;
    commandType: CommandType;
    value?: boolean | number | string;
    waitForConfirmation?: boolean;
  };
};
```

---

## 12.8 ConditionNode

Выполняет условие.

```ts
type ConditionNode = {
  id: string;
  type: 'condition';
  data: {
    expression: string;
  };
};
```

У ConditionNode должны быть исходы:

```text
true
false
error
```

---

## 12.9 MathNode

Вычисляет значение.

```ts
type MathNode = {
  id: string;
  type: 'math';
  data: {
    variable: string;
    expression: string;
  };
};
```

---

## 12.10 WaitNode

Ждет время.

```ts
type WaitNode = {
  id: string;
  type: 'wait';
  data: {
    durationMs: number;
  };
};
```

---

## 12.11 CompleteNode

Завершает процесс.

```ts
type CompleteNode = {
  id: string;
  type: 'complete';
  data: {
    result?: Record<string, string>;
  };
};
```

---

## 12.12 Graph validation

Перед сохранением графа нужно проверять:

```text
есть ровно один start node
есть хотя бы один complete node
нет битых edges
нет ссылок на несуществующие pointId
нет ссылок на несуществующие actuatorId
condition node имеет true/false ветки
command node имеет actuatorId
readPoint node имеет pointId
нет бесконечных циклов без wait node
нет недоступных node
```

---

# 13. React Flow

## 13.1 Назначение

React Flow используется для:

```text
визуального редактора связей
визуального редактора процессов
отображения схемы объекта/станции
```

---

## 13.2 Graph editor modes

Нужно предусмотреть два режима:

```text
Asset graph mode
Process graph mode
```

### Asset graph mode

Показывает связи:

```text
Asset → Points
Asset → Actuators
Point → DataSource
Actuator → ControlPoints
Actuator → FeedbackPoints
```

### Process graph mode

Показывает сценарий исполнения:

```text
Start → Condition → Command → Wait → Read → Math → Complete
```

---

## 13.3 React Flow nodes

Нужно реализовать custom nodes:

```text
AssetNode
DataSourceNode
TelemetryPointNode
ControlPointNode
ActuatorNode
StartNode
InputNode
ReadPointNode
CaptureReadingNode
CommandNode
ConditionNode
MathNode
WaitNode
CompleteNode
InterlockNode
```

---

# 14. UI: основные разделы

## 14.1 Sidebar

Новая навигация:

```text
Мониторинг
Объекты
Источники данных
Точки данных
Исполнительные механизмы
Процессы
Запуски
Графы
История
Диагностика
Журнал событий
Настройки
О приложении
```

---

## 14.2 MonitoringPage

Назначение:

```text
показывать live-состояние объектов
```

Функции:

```text
карточки объектов
статус каждого объекта
основные points
warning/alarm/error indication
поиск
фильтр по типу asset
фильтр по статусу
переход в детали объекта
```

Для бочки сохранить текущую визуализацию заполнения.

Но компонент должен называться не `BarrelCard`, а:

```text
AssetCard
TankWidget
```

---

## 14.3 AssetListPage

Функции:

```text
список объектов
создать объект
редактировать объект
удалить объект
перейти в детали
фильтр по типу
```

---

## 14.4 AssetDetailsPage

Вкладки:

```text
Обзор
Параметры
Мониторинг
История
Исполнительные механизмы
Связи
События
Настройки
```

### Обзор

Показывает:

```text
название
тип
статус
live readings
основные виджеты
```

### Параметры

Показывает points, связанные с asset.

### Мониторинг

Позволяет включить/выключить MonitoringSession.

### История

Показывает графики по TimeSeriesRecord.

### Связи

Показывает React Flow asset graph.

---

## 14.5 DataSourcesPage

Функции:

```text
список источников данных
создать источник
редактировать источник
удалить источник
test connection
list serial ports
```

Для Modbus RTU:

```text
COM port
baudRate
dataBits
stopBits
parity
timeoutMs
pollingIntervalMs
retryCount
```

---

## 14.6 PointsPage

Функции:

```text
список всех точек данных
создать telemetry point
создать control point
редактировать address
редактировать scaling
редактировать thresholds
manual read point
```

---

## 14.7 ActuatorsPage

Функции:

```text
список исполнительных механизмов
создать actuator
привязать command points
привязать feedback points
test command in simulation mode
```

---

## 14.8 ProcessesPage

Функции:

```text
список процессов
создать процесс
редактировать process graph
валидировать граф
запустить процесс
посмотреть jobs
```

---

## 14.9 ProcessEditorPage

Использует React Flow.

Функции:

```text
drag/drop nodes
edit node properties
connect nodes
validate graph
save graph
run simulation
```

---

## 14.10 ProcessJobsPage

Показывает запуски процессов.

```text
process name
status
startedAt
completedAt
input
result
error
event log
```

---

## 14.11 HistoryPage

Функции:

```text
выбор asset
выбор points
выбор периода
выбор aggregation
построить график
экспорт CSV
```

---

## 14.12 DiagnosticsPage

Сохранить текущие возможности и расширить.

Должно быть:

```text
состояние DataSources
состояние polling
ручное чтение Modbus
ручная запись Modbus только в debug/simulation/explicit real-write mode
raw registers
decoded value
live snapshot JSON
copy diagnostics
serial ports list
```

---

## 14.13 EventLogPage

Должен показывать:

```text
system events
config events
connection events
reading errors
monitoring session events
command events
process events
```

Фильтры:

```text
level
source
assetId
pointId
actuatorId
processId
date range
search
```

---

## 14.14 SettingsPage

Разделы:

```text
Общее
Интерфейс
Безопасность
Хранилище
Modbus
История
Команды
```

В безопасности:

```text
enable real write commands
require confirmation for dangerous commands
require confirmation for critical commands
simulation mode
```

---

# 15. EventLog

```ts
type EventLogEntry = {
  id: string;

  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';

  category:
    | 'system'
    | 'config'
    | 'dataSource'
    | 'reading'
    | 'monitoring'
    | 'command'
    | 'process'
    | 'history'
    | 'diagnostics';

  message: string;

  timestamp: string;

  assetId?: string;
  pointId?: string;
  dataSourceId?: string;
  actuatorId?: string;
  commandId?: string;
  processId?: string;
  jobId?: string;

  metadata?: Record<string, unknown>;
};
```

---

# 16. Безопасность

## 16.1 Electron security

Обязательно:

```text
contextIsolation: true
nodeIntegration: false
sandbox where possible
no remote module
preload only
strict IPC validation with zod
no direct fs from renderer
no direct serialport from renderer
```

---

## 16.2 Command safety

Реальные команды управления должны быть безопасными:

```text
write commands disabled by default
simulation mode first
confirmation required for dangerous commands
critical commands require stronger confirmation
interlocks checked before execution
feedback validation after execution
all commands logged
failed commands logged
manual emergency stop concept
```

---

## 16.3 Industrial disclaimer behavior

Приложение не должно позиционироваться как единственная система промышленной защиты.

В UI для real-write mode нужно предупреждение:

```text
Режим реального управления включает запись в устройства. 
Используйте только на тестовом стенде или после проверки схемы и блокировок.
```

---

# 17. Тестовая среда

Новая версия должна поддерживать тестовый стенд пользователя:

```text
Windows PC
Barrel Monitor / новая версия приложения
USB-RS485 adapter #1
RS-485 A/B
USB-RS485 adapter #2
Raspberry Pi 5
Python Modbus slave simulator
ESP32
датчики из Keystudio kit
```

Первый тестовый профиль:

```text
DataSource: Raspberry Pi Modbus Simulator
COM: выбранный порт Windows
baudRate: 115200
8N1
slaveId: 1
```

Регистры тестового стенда:

```text
HR 0  = уровень, мм, uint16
HR 1  = уровень, %, uint16
HR 2  = температура, °C, int16
HR 10-11 = температура, float32
HR 12-13 = уровень, %, float32
HR 20 = статус датчика, uint16
Coil 0 = насос включен
Coil 1 = светодиод включен
```

---

# 18. Acceptance criteria

## 18.1 Config schema v2

Готово, если:

```text
отсутствующий config создает default schema v2 config
валидный schema v2 config читается напрямую
старый config не мигрирует автоматически
невалидный config переводит приложение в default/error flow
schema v2 требует interface.language
ручное чтение Modbus работает
event log сохраняется
```

---

## 18.2 Live monitoring

Готово, если:

```text
DataService читает points
UI показывает live readings
ошибки одного point не ломают весь snapshot
stale/error отображается корректно
mock mode работает
modbus mode работает
```

---

## 18.3 Object monitoring history

Готово, если:

```text
для Asset можно создать MonitoringProfile
можно выбрать recordable points
можно включить MonitoringSession
HistorianService пишет TimeSeriesRecord
можно остановить MonitoringSession
можно построить график по истории
можно экспортировать CSV
```

---

## 18.4 Commands

Готово, если:

```text
можно создать Actuator
можно создать ControlPoint
можно выполнить command в simulation mode
command проходит validation
command пишет event log
interlock может заблокировать command
command result отображается в UI
```

---

## 18.5 Process graph

Готово, если:

```text
можно создать Process
можно открыть React Flow editor
можно добавить nodes
можно соединить nodes
можно сохранить graph
можно валидировать graph
ошибки graph отображаются пользователю
```

---

## 18.6 Process runtime

Готово, если:

```text
можно запустить простой процесс
runtime проходит по graph
readPoint node читает live value
condition node выбирает true/false branch
command node вызывает CommandService
wait node ждет
complete node завершает ProcessJob
ProcessJob сохраняет result
```

---

# 19. Поэтапная реализация

## Stage 1 — новая доменная модель

Цель:

```text
закрепить Asset/DataSource/Point как runtime-модель
```

Задачи:

```text
создать новые TypeScript-типы
создать zod schemas
создать AppConfig v2
обновить ConfigService
обновить EventLogService
обновить MockDataService
обновить ModbusDataService
оставить UI минимально рабочим
```

---

## Stage 2 — новый мониторинг объектов

Цель:

```text
переписать UI мониторинга под Asset
```

Задачи:

```text
MonitoringPage
AssetCard
TankWidget вместо BarrelCard
AssetDetailsPage
Points list
LiveSnapshot by pointId
status handling
```

---

## Stage 3 — источники данных и точки данных

Цель:

```text
сделать полноценные CRUD-экраны для DataSource и Point
```

Задачи:

```text
DataSourcesPage
PointsPage
Modbus address editor
scaling editor
threshold editor
manual read
serial ports list
test connection
```

---

## Stage 4 — история и графики

Цель:

```text
включать мониторинг конкретного объекта и строить графики
```

Задачи:

```text
MonitoringProfile
MonitoringSession
HistorianService
TimeSeriesRecord storage
HistoryPage
AssetDetails History tab
Trend query
CSV export
```

---

## Stage 5 — исполнительные механизмы и команды

Цель:

```text
добавить насосы, клапаны, реле, светодиоды и команды
```

Задачи:

```text
Actuator entity
ControlPoint entity
CommandService
CommandResult
simulation mode
interlocks
confirmation dialogs
Command history
```

---

## Stage 6 — React Flow asset graph

Цель:

```text
показывать связи объектов, точек, источников и механизмов
```

Задачи:

```text
AssetGraphPage
React Flow nodes
AssetNode
PointNode
DataSourceNode
ActuatorNode
read-only graph view
basic edit mode
```

---

## Stage 7 — Process graph editor

Цель:

```text
создавать процессы через React Flow
```

Задачи:

```text
ProcessesPage
ProcessEditorPage
custom process nodes
graph validation
save/load process graph
```

---

## Stage 8 — Process runtime

Цель:

```text
исполнять граф процесса
```

Задачи:

```text
ProcessRuntime
ProcessJob
runtime context
readPoint execution
condition execution
command execution
wait execution
complete execution
job event log
```

---

## Stage 9 — сценарий загрузки грузовика

Цель:

```text
реализовать эталонный процесс "Загрузка грузовика по массе"
```

Сценарий:

```text
весы видят грузовик
включается светодиод
оператор вводит массу вещества
фиксируется начальный вес
включается насос
система следит за текущим весом
при достижении целевой массы насос выключается
фиксируется финальный вес
показывается фактически загруженная масса
```

---

# 20. Non-goals для первой версии

В первой новой версии не нужно:

```text
облачная синхронизация
мобильное приложение
многопользовательские роли
сложный RBAC
OPC UA
MQTT production integration
PLC programming
автоматическая генерация сложных процессов ИИ
полноценная SCADA
```

Но архитектура не должна мешать добавить это позже.

---

# 21. Ключевые архитектурные запреты

Нельзя:

```text
оставлять Barrel как главную доменную сущность
называть все каналы Channel без разделения telemetry/control
писать в Modbus напрямую из React component
читать serialport из renderer
делать React Flow исполнителем логики
смешивать live readings и historical records
делать насос просто boolean-полем внутри бочки
делать command без event log
делать command без interlock checks
делать graph без validation
хранить историю только в памяти
```

Нужно:

```text
Asset как универсальный объект
Point как универсальная точка данных
TelemetryPoint для чтения
ControlPoint для управления
Actuator для исполнительных механизмов
CommandService для действий
HistorianService для истории
ProcessRuntime для исполнения graph
React Flow только для редактирования/визуализации
```

---

# 22. Пример полной конфигурации нового приложения

```json
{
  "schemaVersion": 2,
  "app": {
    "mode": "real",
    "simulationCommandsOnly": true,
    "realWriteEnabled": false
  },
  "dataSources": [
    {
      "id": "rpi-modbus-1",
      "name": "Raspberry Pi Modbus Simulator",
      "type": "modbus-rtu",
      "enabled": true,
      "connection": {
        "type": "modbus-rtu",
        "port": "COM3",
        "baudRate": 115200,
        "dataBits": 8,
        "stopBits": 1,
        "parity": "none"
      },
      "pollingIntervalMs": 1000,
      "timeoutMs": 500,
      "retryCount": 1
    }
  ],
  "assets": [
    {
      "id": "tank-1",
      "name": "Бочка №1",
      "type": "barrel",
      "pointIds": [
        "tank-1-level",
        "tank-1-temperature"
      ],
      "actuatorIds": [],
      "metadata": {
        "heightMm": 3000,
        "maxVolumeL": 1000
      },
      "createdAt": "2026-06-30T00:00:00.000Z",
      "updatedAt": "2026-06-30T00:00:00.000Z"
    },
    {
      "id": "pump-1",
      "name": "Насос №1",
      "type": "pump",
      "pointIds": [
        "pump-1-running-feedback"
      ],
      "actuatorIds": [
        "pump-1-actuator"
      ],
      "createdAt": "2026-06-30T00:00:00.000Z",
      "updatedAt": "2026-06-30T00:00:00.000Z"
    }
  ],
  "points": [
    {
      "id": "tank-1-level",
      "name": "Уровень Бочки №1",
      "kind": "telemetry",
      "assetId": "tank-1",
      "dataSourceId": "rpi-modbus-1",
      "valueType": "uint16",
      "rawUnit": "мм",
      "displayUnit": "%",
      "recordable": true,
      "enabled": true,
      "address": {
        "protocol": "modbus",
        "slaveId": 1,
        "area": "holding-register",
        "functionCode": 3,
        "registerAddress": 0,
        "registerCount": 1,
        "valueType": "uint16",
        "byteOrder": "ABCD"
      },
      "scaling": {
        "type": "linear",
        "rawMin": 0,
        "rawMax": 3000,
        "displayMin": 0,
        "displayMax": 100,
        "clamp": true
      },
      "thresholds": {
        "warningLow": 10,
        "warningHigh": 90,
        "alarmLow": 5,
        "alarmHigh": 95
      }
    },
    {
      "id": "tank-1-temperature",
      "name": "Температура Бочки №1",
      "kind": "telemetry",
      "assetId": "tank-1",
      "dataSourceId": "rpi-modbus-1",
      "valueType": "int16",
      "rawUnit": "°C",
      "displayUnit": "°C",
      "recordable": true,
      "enabled": true,
      "address": {
        "protocol": "modbus",
        "slaveId": 1,
        "area": "holding-register",
        "functionCode": 3,
        "registerAddress": 2,
        "registerCount": 1,
        "valueType": "int16",
        "byteOrder": "ABCD"
      },
      "scaling": {
        "type": "none"
      }
    },
    {
      "id": "pump-1-running-feedback",
      "name": "Насос №1 работает",
      "kind": "telemetry",
      "assetId": "pump-1",
      "dataSourceId": "rpi-modbus-1",
      "valueType": "boolean",
      "recordable": true,
      "enabled": true,
      "address": {
        "protocol": "modbus",
        "slaveId": 1,
        "area": "coil",
        "functionCode": 1,
        "coilAddress": 0,
        "valueType": "boolean"
      },
      "scaling": {
        "type": "none"
      }
    },
    {
      "id": "pump-1-run-command",
      "name": "Включить/выключить Насос №1",
      "kind": "control",
      "assetId": "pump-1",
      "dataSourceId": "rpi-modbus-1",
      "valueType": "boolean",
      "recordable": false,
      "enabled": true,
      "requiresConfirmation": true,
      "safetyLevel": "dangerous",
      "allowedValues": [
        true,
        false
      ],
      "writeAddress": {
        "protocol": "modbus",
        "slaveId": 1,
        "area": "coil",
        "functionCode": 5,
        "coilAddress": 0,
        "valueType": "boolean"
      }
    }
  ],
  "actuators": [
    {
      "id": "pump-1-actuator",
      "name": "Насос №1",
      "type": "pump",
      "assetId": "pump-1",
      "commandPointIds": [
        "pump-1-run-command"
      ],
      "feedbackPointIds": [
        "pump-1-running-feedback"
      ],
      "supportedCommands": [
        "start",
        "stop"
      ],
      "enabled": true
    }
  ],
  "monitoringProfiles": [
    {
      "id": "tank-1-monitoring-profile",
      "assetId": "tank-1",
      "name": "Мониторинг Бочки №1",
      "enabled": true,
      "pointConfigs": [
        {
          "pointId": "tank-1-level",
          "enabled": true,
          "mode": "both",
          "sampleIntervalMs": 5000,
          "minChangeDelta": 1,
          "retentionDays": 30
        },
        {
          "pointId": "tank-1-temperature",
          "enabled": true,
          "mode": "both",
          "sampleIntervalMs": 10000,
          "minChangeDelta": 0.2,
          "retentionDays": 30
        }
      ]
    }
  ],
  "processes": [],
  "processGraphs": [],
  "interlocks": [
    {
      "id": "pump-1-low-level-block",
      "name": "Запрет пуска насоса при низком уровне",
      "targetActuatorId": "pump-1-actuator",
      "targetCommand": "start",
      "enabled": true,
      "condition": "tank-1-level < 10",
      "effect": "block",
      "message": "Нельзя включить насос: уровень Бочки №1 ниже 10%."
    }
  ]
}
```

---

# 23. Финальное требование к разработке

Разработку вести через Spec Driven Development.

Перед кодом нужно:

```text
1. Обновить доменную модель.
2. Обновить схемы валидации.
3. Описать миграцию config v1 → v2.
4. Обновить IPC-контракты.
5. Обновить storage-контракты.
6. Только после этого менять UI.
```

Любая новая фича должна иметь:

```text
domain model
zod schema
main service contract
preload API contract
renderer integration
error handling
event log
acceptance criteria
```

Главный принцип:

```text
Сначала универсальная модель.
Потом UI.
Потом железо.
Потом процессы.
```

Итоговая новая версия должна быть готова к сценариям:

```text
мониторинг бочек
история и графики по бочкам
подключение датчиков объема/температуры/уровня/веса
насосы и задвижки
управляемые действия
блокировки
визуальные связи через React Flow
процессы загрузки грузовика по массе
тестовый стенд на Raspberry Pi + ESP32 + USB-RS485
```
