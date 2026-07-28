import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultHomeState, HOME_WORLD_HEIGHT, HOME_WORLD_WIDTH, migrateHomeState } from '../src/home/HomeSave';
import type { HomeInteractionCandidate } from '../src/home/HomeTypes';
import { HomeInteractionSystem } from '../src/home/interaction/HomeInteractionSystem';
import { InputModeManager } from '../src/home/input/InputModeManager';
import { resolveHomeVoiceCommand } from '../src/home/voice/HomeVoiceCommands';
import { HOME_BUILDINGS, HOME_ENTRANCES } from '../src/home/world/HomeWorldContent';
import { SpatialGrid, aabbIntersects, circleIntersectsAabb } from '../src/home/world/SpatialGrid';
import { SaveManager } from '../src/storage/SaveManager';

describe('home input modes', () => {
  it('selects the latest active source in auto mode', () => {
    const manager = new InputModeManager('auto');
    manager.updateSource('keyboard', { x: 1, y: 0 }, 10);
    manager.updateSource('touch', { x: 0, y: -1 }, 20);
    expect(manager.resolve()).toEqual({ x: 0, y: -1 });
    expect(manager.currentSource).toBe('touch');
  });

  it('honors a fixed mode and applies deadzones and normalization', () => {
    const manager = new InputModeManager('gamepad');
    manager.updateSource('keyboard', { x: 1, y: 0 }, 10);
    manager.updateSource('gamepad', { x: .05, y: .04 }, 20);
    expect(manager.resolve()).toEqual({ x: 0, y: 0 });
    manager.updateSource('gamepad', { x: 2, y: 0 }, 30);
    expect(manager.resolve()).toEqual({ x: 1, y: 0 });
  });
});

describe('home save migration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes facing, clamps position and removes duplicate visits', () => {
    const migrated = migrateHomeState({
      position: { x: -100, y: HOME_WORLD_HEIGHT + 900 },
      facing: { x: 3, y: 4 },
      visitedEntranceIds: ['restaurant-door', 'restaurant-door', 42],
      inputMode: 'invalid',
      autosavedAt: -12,
    });
    expect(migrated.position).toEqual({ x: 70, y: HOME_WORLD_HEIGHT - 70 });
    expect(migrated.facing.x).toBeCloseTo(.6);
    expect(migrated.facing.y).toBeCloseTo(.8);
    expect(migrated.visitedEntranceIds).toEqual(['restaurant-door']);
    expect(migrated.inputMode).toBe('auto');
    expect(migrated.autosavedAt).toBe(0);
  });

  it('upgrades a legacy game save to version 6 with a valid home state', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    values.set('speak-to-fight:save', JSON.stringify({
      saveVersion: 5,
      player: { level: 4, coins: 80 },
      unlockedSkills: ['shield'],
      settings: { musicVolume: .4 },
    }));
    const migrated = SaveManager.load();
    expect(migrated.saveVersion).toBe(6);
    expect(migrated.player.level).toBe(4);
    expect(migrated.home).toEqual(createDefaultHomeState());
    expect(migrated.unlockedSkills).toContain('help');
  });
});

describe('home spatial and interaction systems', () => {
  it('queries spatial cells without duplicate entities', () => {
    const grid = new SpatialGrid(100);
    grid.rebuild([
      { id: 'wide', x: 100, y: 100, width: 180, height: 80 },
      { id: 'far', x: 500, y: 500, width: 30, height: 30 },
    ]);
    expect(grid.queryCircle(100, 100, 40).map((item) => item.id)).toEqual(['wide']);
    expect(aabbIntersects(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 15, y: 15, width: 20, height: 20 },
    )).toBe(true);
    expect(circleIntersectsAabb(
      { x: 25, y: 10, radius: 6 },
      { x: 0, y: 0, width: 20, height: 20 },
    )).toBe(true);
  });

  it('uses priority, facing and distance to select one nearby target', () => {
    const candidates: HomeInteractionCandidate[] = [
      { id: 'front', x: 80, y: 0, radius: 130, priority: 5, label: 'Front', hint: '', action: { type: 'sleep' } },
      { id: 'behind', x: -70, y: 0, radius: 130, priority: 5, label: 'Behind', hint: '', action: { type: 'settings' } },
      { id: 'priority', x: 0, y: 100, radius: 130, priority: 8, label: 'Priority', hint: '', action: { type: 'sleep' } },
    ];
    expect(new HomeInteractionSystem(candidates).select(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    )?.candidate.id).toBe('priority');
  });
});

describe('home world data and voice bridge', () => {
  it('keeps entrances independent from valid building definitions', () => {
    const buildingIds = new Set(HOME_BUILDINGS.map((building) => building.id));
    expect(HOME_BUILDINGS).toHaveLength(6);
    expect(HOME_ENTRANCES).toHaveLength(7);
    expect(HOME_ENTRANCES.every((entrance) => buildingIds.has(entrance.buildingId))).toBe(true);
    expect(HOME_ENTRANCES.every((entrance) => (
      entrance.x >= 0 && entrance.x <= HOME_WORLD_WIDTH
      && entrance.y >= 0 && entrance.y <= HOME_WORLD_HEIGHT
    ))).toBe(true);
  });

  it('maps natural destination phrases without coupling to the voice provider', () => {
    expect(resolveHomeVoiceCommand('Go to the restaurant, please.')).toMatchObject({
      type: 'navigate',
      entranceId: 'restaurant-door',
    });
    expect(resolveHomeVoiceCommand('带我去医院')).toMatchObject({
      type: 'navigate',
      entranceId: 'hospital-door',
    });
    expect(resolveHomeVoiceCommand('interact')).toMatchObject({ type: 'interact' });
    expect(resolveHomeVoiceCommand('sing a song')).toMatchObject({ type: 'unknown' });
  });
});
