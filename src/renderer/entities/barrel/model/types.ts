import type { BarrelConfig } from '../../../../shared/types/config.types';
import type { ChannelReading, Status } from '../../../../shared/types/monitoring.types';

export type BarrelViewModel = {
  barrel: BarrelConfig;
  temperature: ChannelReading | null;
  level: ChannelReading | null;
  status: Status;
  updatedAt: string | null;
};
