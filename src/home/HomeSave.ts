import type { HomeInputMode, HomeVector } from './HomeTypes';

export interface HomeSaveState {
  schemaVersion: 1;
  position: HomeVector;
  facing: HomeVector;
  lastEntranceId?: string;
  visitedEntranceIds: string[];
  inputMode: HomeInputMode;
  orientation: {
    enabled: boolean;
    calibratedBeta: number;
    calibratedGamma: number;
  };
  debugEnabled: boolean;
  autosavedAt: number;
}

export const HOME_WORLD_WIDTH = 2200;
export const HOME_WORLD_HEIGHT = 1200;

export function createDefaultHomeState(): HomeSaveState {
  return {
    schemaVersion: 1,
    position: { x: 350, y: 600 },
    facing: { x: 1, y: 0 },
    visitedEntranceIds: [],
    inputMode: 'auto',
    orientation: {
      enabled: false,
      calibratedBeta: 0,
      calibratedGamma: 0,
    },
    debugEnabled: false,
    autosavedAt: 0,
  };
}

const finite = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function migrateHomeState(value: unknown): HomeSaveState {
  const defaults = createDefaultHomeState();
  if (!value || typeof value !== 'object') return defaults;
  const record = value as Record<string, unknown>;
  const position = record.position && typeof record.position === 'object' ? record.position as Record<string, unknown> : {};
  const facing = record.facing && typeof record.facing === 'object' ? record.facing as Record<string, unknown> : {};
  const orientation = record.orientation && typeof record.orientation === 'object' ? record.orientation as Record<string, unknown> : {};
  const validModes: readonly HomeInputMode[] = ['auto', 'keyboard', 'gamepad', 'touch', 'orientation'];
  const inputMode = typeof record.inputMode === 'string' && validModes.includes(record.inputMode as HomeInputMode)
    ? record.inputMode as HomeInputMode
    : defaults.inputMode;
  const facingX = finite(facing.x, defaults.facing.x);
  const facingY = finite(facing.y, defaults.facing.y);
  const facingLength = Math.hypot(facingX, facingY) || 1;
  return {
    schemaVersion: 1,
    position: {
      x: clamp(finite(position.x, defaults.position.x), 70, HOME_WORLD_WIDTH - 70),
      y: clamp(finite(position.y, defaults.position.y), 70, HOME_WORLD_HEIGHT - 70),
    },
    facing: {
      x: facingX / facingLength,
      y: facingY / facingLength,
    },
    lastEntranceId: typeof record.lastEntranceId === 'string' ? record.lastEntranceId : undefined,
    visitedEntranceIds: Array.isArray(record.visitedEntranceIds)
      ? [...new Set(record.visitedEntranceIds.filter((entry): entry is string => typeof entry === 'string'))]
      : [],
    inputMode,
    orientation: {
      enabled: orientation.enabled === true,
      calibratedBeta: finite(orientation.calibratedBeta, 0),
      calibratedGamma: finite(orientation.calibratedGamma, 0),
    },
    debugEnabled: record.debugEnabled === true,
    autosavedAt: Math.max(0, finite(record.autosavedAt, 0)),
  };
}
