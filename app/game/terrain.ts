import {
  SURFACE_Y,
  TILE_SIZE,
  WORLD_WIDTH,
} from "./core.ts";

export const LEGACY_GROUND_Y = SURFACE_Y * TILE_SIZE;
export const GROUND_ASSET_WIDTH = 96;
export const GROUND_ASSET_CROP_Y = 0;
export const GROUND_ASSET_CROP_HEIGHT = 32;
export const TERRAIN_MAX_RANGE = TILE_SIZE * 2;
export const TERRAIN_MAX_STEP = TILE_SIZE;

const GROUND_REPEAT_TILES = Math.ceil(GROUND_ASSET_WIDTH / TILE_SIZE);

export interface TerrainProfile {
  seed: number;
  tileOffset: number;
  heights: number[];
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

export function createTerrainProfile(seed: number): TerrainProfile {
  const tileOffset = positiveModulo(
    Math.floor(seed),
    GROUND_REPEAT_TILES,
  );
  const random = seededRandom(Math.floor(seed) ^ 0x6d2b79f5);
  const heights = Array.from(
    { length: WORLD_WIDTH },
    () => LEGACY_GROUND_Y,
  );
  let cursor = 6;
  let level = 0;
  while (cursor < WORLD_WIDTH - 6) {
    const runLength = 5 + Math.floor(random() * 8);
    const change = random() < 0.3 ? 0 : random() < 0.5 ? -1 : 1;
    level = clamp(level + change, -1, 1);
    const end = Math.min(WORLD_WIDTH - 6, cursor + runLength);
    for (let tile = cursor; tile < end; tile += 1) {
      heights[tile] = LEGACY_GROUND_Y + level * TILE_SIZE;
    }
    cursor = end;
  }

  const center = Math.floor(WORLD_WIDTH / 2);
  for (let tile = center - 5; tile <= center + 5; tile += 1) {
    heights[tile] = LEGACY_GROUND_Y;
  }
  for (let tile = 0; tile < 6; tile += 1) {
    heights[tile] = LEGACY_GROUND_Y;
    heights[WORLD_WIDTH - 1 - tile] = LEGACY_GROUND_Y;
  }

  return { seed, tileOffset, heights };
}

export function groundYAt(profile: TerrainProfile, worldX: number): number {
  const tile = clamp(
    Math.floor(worldX / TILE_SIZE),
    0,
    WORLD_WIDTH - 1,
  );
  return profile.heights[tile];
}

export function groundSpan(
  profile: TerrainProfile,
  worldX: number,
  width: number,
): { minimum: number; maximum: number; variation: number; supportY: number } {
  const samples: number[] = [];
  const end = Math.max(worldX, worldX + Math.max(0, width - 1));
  for (let x = worldX; x <= end; x += 4) {
    samples.push(groundYAt(profile, x));
  }
  samples.push(groundYAt(profile, end));
  const minimum = Math.min(...samples);
  const maximum = Math.max(...samples);
  return {
    minimum,
    maximum,
    variation: maximum - minimum,
    supportY: minimum,
  };
}

export function reanchorLegacyGroundY(
  profile: TerrainProfile,
  worldX: number,
  width: number,
  height: number,
  savedY: number,
): number {
  if (Math.abs(savedY + height - LEGACY_GROUND_Y) > 3) return savedY;
  return groundSpan(profile, worldX, width).supportY - height;
}

export function groundAssetSourceX(
  profile: TerrainProfile,
  worldTile: number,
): number {
  return positiveModulo(
    (worldTile + profile.tileOffset) * TILE_SIZE,
    GROUND_ASSET_WIDTH,
  );
}

export function groundAssetTopOffset(
  _profile: TerrainProfile,
  _worldTile: number,
): number {
  return GROUND_ASSET_CROP_HEIGHT;
}
