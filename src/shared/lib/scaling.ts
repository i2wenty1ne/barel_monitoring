import type { ScalingConfig } from '../types/config.types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function applyScaling(rawValue: number, scaling: ScalingConfig): number {
  if (scaling.type === 'none') {
    return rawValue;
  }

  const displayValue =
    scaling.displayMin +
    ((rawValue - scaling.rawMin) / (scaling.rawMax - scaling.rawMin)) *
      (scaling.displayMax - scaling.displayMin);

  return clamp(displayValue, scaling.displayMin, scaling.displayMax);
}
