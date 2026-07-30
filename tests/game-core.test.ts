import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_ORDER,
  CAMERA_ZOOM,
  CODEX_ACTIONS,
  DAILY_LESSON_LIMIT,
  ENEMY_SIZE_PIXELS,
  ENEMY_DEFINITIONS,
  ENEMY_WALL_ROWS,
  MAX_INK,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  REACH_TILES_X,
  REACH_TILES_Y,
  REQUIRED_STARTER_ACTIONS,
  STARTING_INK,
  SURFACE_Y,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WAVE_DEFINITIONS,
  canLearnCampaignAction,
  createWaveSchedule,
  decodeSave,
  effectiveInkCost,
  encodeSave,
  getWaveScaling,
  meleeHealthCost,
  rectsOverlap,
  recordDailyLesson,
  resolveVoiceIntent,
  resolveWallCollapse,
  wallBlocksEnemy,
  type LearningDayState,
  type SaveGameV2,
  type StructureState,
} from "../app/game/core.ts";
import { GameEngine } from "../app/game/engine.ts";
import {
  LEGACY_GROUND_Y,
  TERRAIN_MAX_RANGE,
  TERRAIN_MAX_STEP,
  createTerrainProfile,
  groundSpan,
  groundYAt,
  reanchorLegacyGroundY,
} from "../app/game/terrain.ts";

test("locks the 20-pixel one-line world and recommended camera scale", () => {
  assert.equal(TILE_SIZE, 20);
  assert.equal(CAMERA_ZOOM, 2);
  assert.equal(WORLD_WIDTH, 160);
  assert.equal(WORLD_HEIGHT, 30);
  assert.equal(SURFACE_Y, 23);
  assert.equal(PLAYER_WIDTH, 24);
  assert.equal(PLAYER_HEIGHT, 40);
  assert.equal(REACH_TILES_X, 6);
  assert.equal(REACH_TILES_Y, 8);
  assert.equal(1280 / CAMERA_ZOOM / TILE_SIZE, 32);
  assert.equal(720 / CAMERA_ZOOM / TILE_SIZE, 18);
});

test("defines the campaign actions, including the supplied defenders, across six tiers", () => {
  assert.equal(ACTION_ORDER.length, 34);
  assert.equal(new Set(ACTION_ORDER).size, 34);
  assert.deepEqual(ACTION_ORDER.slice(0, 5), [
    "tower",
    "archer",
    "swordsman",
    "spearman",
    "knight",
  ]);
  for (const id of ACTION_ORDER) {
    assert.equal(CODEX_ACTIONS[id].id, id);
    assert.ok(CODEX_ACTIONS[id].inkCost > 0);
  }
  assert.deepEqual(
    Array.from({ length: 6 }, (_, tier) =>
      ACTION_ORDER.filter((id) => CODEX_ACTIONS[id].tier === tier).length,
    ),
    [9, 12, 3, 3, 3, 4],
  );
});

test("campaign learning uses the first-three-days and day-four groups", () => {
  const early = ACTION_ORDER.filter(
    (id) => CODEX_ACTIONS[id].availableFromDay === 1,
  );
  const late = ACTION_ORDER.filter(
    (id) => CODEX_ACTIONS[id].availableFromDay === 4,
  );
  assert.equal(early.length, 24);
  assert.equal(late.length, 10);
  assert.ok(early.includes("knight"));
  assert.ok(late.includes("healing-ward"));
  for (const id of early) {
    assert.equal(canLearnCampaignAction(id, 0), true);
    assert.equal(canLearnCampaignAction(id, 5), true);
  }
  for (const id of late) {
    assert.equal(canLearnCampaignAction(id, 2), false);
    assert.equal(canLearnCampaignAction(id, 3), true);
  }
});

test("throwable supplies split into ally-healing foods and self-use drinks", () => {
  const apple = CODEX_ACTIONS.apple;
  const coffee = CODEX_ACTIONS.coffee;
  assert.equal(apple.kind, "food");
  assert.equal(coffee.kind, "food");
  assert.equal(apple.effect.type, "food");
  assert.equal(coffee.effect.type, "food");
  if (apple.effect.type === "food" && coffee.effect.type === "food") {
    assert.equal(apple.effect.emoji, "🍎");
    assert.equal(coffee.effect.emoji, "☕");
    assert.equal(apple.effect.supplyType, "food");
    assert.equal(coffee.effect.supplyType, "drink");
    if (
      apple.effect.supplyType === "food" &&
      coffee.effect.supplyType === "drink"
    ) {
      assert.equal(apple.effect.healing, 28);
      assert.equal(coffee.effect.nightInkRegen, 0.18);
      assert.equal(coffee.effect.duration, 45);
    }
  }
  assert.deepEqual(
    [
      "apple",
      "bread",
      "mushroom",
      "cheese",
      "fish",
      "meat",
    ].map((id) => CODEX_ACTIONS[id as keyof typeof CODEX_ACTIONS].effect.type),
    Array(6).fill("food"),
  );
  assert.deepEqual(
    ["coffee", "tea", "juice"].map((id) => {
      const effect = CODEX_ACTIONS[id as keyof typeof CODEX_ACTIONS].effect;
      return effect.type === "food" ? effect.supplyType : null;
    }),
    ["drink", "drink", "drink"],
  );
  const appleIntent = resolveVoiceIntent("Give an apple", 0);
  assert.equal(appleIntent.kind, "action");
  if (appleIntent.kind === "action") {
    assert.equal(appleIntent.intent.actionId, "apple");
  }
  const coffeeIntent = resolveVoiceIntent("Coffee", 0);
  assert.equal(coffeeIntent.kind, "action");
  if (coffeeIntent.kind === "action") {
    assert.equal(coffeeIntent.intent.actionId, "coffee");
  }
});

test("terrain is deterministic, block-stepped and flat around the core and edges", () => {
  const first = createTerrainProfile(731204);
  const second = createTerrainProfile(731204);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, createTerrainProfile(731205));
  assert.ok(
    Math.max(...first.heights) - Math.min(...first.heights) <=
      TERRAIN_MAX_RANGE,
  );
  for (let index = 1; index < first.heights.length; index += 1) {
    assert.ok(
      Math.abs(first.heights[index] - first.heights[index - 1]) <=
        TERRAIN_MAX_STEP,
    );
    assert.equal(
      Math.abs(first.heights[index] - LEGACY_GROUND_Y) % TILE_SIZE,
      0,
    );
  }
  assert.ok(first.heights.slice(75, 86).every((height) => height === LEGACY_GROUND_Y));
  assert.ok(first.heights.slice(0, 6).every((height) => height === LEGACY_GROUND_Y));
  assert.ok(first.heights.slice(-6).every((height) => height === LEGACY_GROUND_Y));
  assert.equal(groundYAt(first, WORLD_WIDTH * TILE_SIZE / 2), LEGACY_GROUND_Y);
  assert.ok(groundSpan(first, 0, TILE_SIZE * 2).variation <= TERRAIN_MAX_STEP);
  const slopedTile = first.heights.findIndex(
    (height) => height !== LEGACY_GROUND_Y,
  );
  assert.ok(slopedTile > 0);
  const worldX = slopedTile * TILE_SIZE;
  const migrated = reanchorLegacyGroundY(
    first,
    worldX,
    TILE_SIZE * 2,
    TILE_SIZE * 2,
    LEGACY_GROUND_Y - TILE_SIZE * 2,
  );
  assert.equal(
    migrated + TILE_SIZE * 2,
    groundSpan(first, worldX, TILE_SIZE * 2).supportY,
  );
  assert.equal(
    reanchorLegacyGroundY(first, worldX, 40, 40, 350),
    350,
  );
});

test("Tower is a passive garrison and Archer is the mobile ranged unit", () => {
  const tower = CODEX_ACTIONS.tower;
  const archer = CODEX_ACTIONS.archer;
  assert.equal(tower.effect.type, "structure");
  if (tower.effect.type === "structure") {
    assert.equal(tower.effect.role, "garrison");
    assert.equal(tower.effect.damage, 0);
    assert.equal(tower.effect.blocking, true);
    assert.deepEqual(tower.effect.footprint, { width: 2, height: 3 });
  }
  assert.equal(archer.effect.type, "unit");
  if (archer.effect.type === "unit") {
    assert.equal(archer.effect.role, "archer");
    assert.equal(archer.effect.target, "both");
    assert.ok(archer.effect.rangeTiles >= 10);
  }
});

test("the old warrior and lancer are distinct ground defenders", () => {
  const swordsman = CODEX_ACTIONS.swordsman;
  const spearman = CODEX_ACTIONS.spearman;
  assert.equal(swordsman.effect.type, "unit");
  assert.equal(spearman.effect.type, "unit");
  if (swordsman.effect.type === "unit" && spearman.effect.type === "unit") {
    assert.equal(swordsman.effect.role, "swordsman");
    assert.equal(spearman.effect.role, "spearman");
    assert.equal(swordsman.effect.target, "ground");
    assert.equal(spearman.effect.target, "ground");
    assert.ok(spearman.effect.rangeTiles > swordsman.effect.rangeTiles);
  }
});

test("Knight is the supplied armored tank with the agreed values", () => {
  const knight = CODEX_ACTIONS.knight;
  assert.equal(knight.inkCost, 9);
  assert.equal(knight.effect.type, "unit");
  if (knight.effect.type === "unit") {
    assert.equal(knight.effect.role, "knight");
    assert.equal(knight.effect.maxHealth, 280);
    assert.equal(knight.effect.damage, 14);
    assert.equal(knight.effect.attackInterval, 1.05);
    assert.equal(knight.effect.rangeTiles, 1.4);
  }
});

test("each daylight accepts eight new words, counts starter lessons and keeps review free", () => {
  let state: LearningDayState = {
    dayIndex: 0,
    learnedWordKeys: [],
    limit: DAILY_LESSON_LIMIT,
  };
  for (const word of [
    "Tower",
    "Archer",
    "Barricade",
    "Library Word 1",
    "Library Word 2",
    "Library Word 3",
    "Library Word 4",
    "Library Word 5",
  ]) {
    const result = recordDailyLesson(state, word, true);
    assert.equal(result.accepted, true);
    state = result.state;
  }
  assert.equal(DAILY_LESSON_LIMIT, 8);
  assert.equal(state.learnedWordKeys.length, 8);
  assert.equal(recordDailyLesson(state, "Ninth Word", true).accepted, false);
  const review = recordDailyLesson(state, "Tower", false);
  assert.equal(review.accepted, true);
  assert.equal(review.state.learnedWordKeys.length, 8);
});

test("wall segments stack and enemy size determines how many rows block it", () => {
  for (const id of ["barricade", "palisade", "stone-wall", "iron-gate"] as const) {
    const action = CODEX_ACTIONS[id];
    assert.equal(action.effect.type, "structure");
    if (action.effect.type === "structure") {
      assert.deepEqual(action.effect.footprint, { width: 1, height: 1 });
      assert.equal(action.effect.placement, "supported");
      assert.equal(action.effect.role, "wall");
    }
  }
  assert.equal(ENEMY_DEFINITIONS.walker.name, "蘑菇怪");
  assert.equal(ENEMY_DEFINITIONS.walker.wallJumpRows, 0);
  assert.equal(ENEMY_DEFINITIONS.brute.wallJumpRows, 1);
  assert.equal(wallBlocksEnemy(1, ENEMY_DEFINITIONS.walker.wallJumpRows), true);
  assert.equal(wallBlocksEnemy(1, ENEMY_DEFINITIONS.brute.wallJumpRows), false);
  assert.equal(wallBlocksEnemy(2, ENEMY_DEFINITIONS.brute.wallJumpRows), true);
  assert.equal(wallBlocksEnemy(2, 2), false);
  assert.equal(wallBlocksEnemy(3, 2), true);
  assert.deepEqual(REQUIRED_STARTER_ACTIONS, [
    "tower",
    "archer",
    "barricade",
  ]);
});

test("enemy size classes derive exact 20/40/60 pixel bodies and wall thresholds", () => {
  assert.deepEqual(ENEMY_SIZE_PIXELS, {
    small: 20,
    large: 40,
    huge: 60,
  });
  assert.deepEqual(ENEMY_WALL_ROWS, {
    small: 1,
    large: 2,
    huge: 3,
  });
  assert.equal(ENEMY_DEFINITIONS.walker.sizeClass, "small");
  assert.equal(ENEMY_DEFINITIONS.walker.width, 20);
  assert.equal(ENEMY_DEFINITIONS.walker.height, 20);
  for (const id of ["brute", "sapper", "spitter", "flyer", "diver"] as const) {
    assert.equal(ENEMY_DEFINITIONS[id].sizeClass, "large");
    assert.equal(ENEMY_DEFINITIONS[id].width, 40);
    assert.equal(ENEMY_DEFINITIONS[id].height, 40);
  }
  assert.equal(ENEMY_DEFINITIONS["sky-devourer"].sizeClass, "huge");
  assert.equal(ENEMY_DEFINITIONS["sky-devourer"].width, 60);
  assert.equal(ENEMY_DEFINITIONS["sky-devourer"].height, 60);
});

test("destroying a supporting wall layer collapses every continuous layer above it", () => {
  assert.deepEqual(resolveWallCollapse([10, 11, 12, 13], 10), {
    destroyedId: 10,
    collapsedIds: [11, 12, 13],
  });
  assert.deepEqual(resolveWallCollapse([10, 11, 12, 13], 11), {
    destroyedId: 11,
    collapsedIds: [12, 13],
  });
  assert.deepEqual(resolveWallCollapse([10, 11, 12, 13], 12), {
    destroyedId: 12,
    collapsedIds: [13],
  });
});

test("arrow tower retains its values while targeting ground and air", () => {
  const arrowTower = CODEX_ACTIONS["arrow-tower"];
  assert.equal(arrowTower.effect.type, "structure");
  if (arrowTower.effect.type === "structure") {
    assert.equal(arrowTower.effect.target, "both");
    assert.equal(arrowTower.effect.damage, 12);
    assert.equal(arrowTower.effect.attackInterval, 0.9);
    assert.equal(arrowTower.effect.rangeTiles, 10);
  }
});

test("wave schedules are deterministic, complete and never spawn underground", () => {
  for (let waveIndex = 0; waveIndex < WAVE_DEFINITIONS.length; waveIndex += 1) {
    const first = createWaveSchedule(waveIndex, 731204);
    const second = createWaveSchedule(waveIndex, 731204);
    assert.deepEqual(first, second);
    const expected = Object.values(WAVE_DEFINITIONS[waveIndex].counts).reduce(
      (sum, count) => sum + (count ?? 0),
      0,
    );
    assert.equal(first.length, expected);
    assert.ok(
      first.every((spawn) =>
        [
          "ground-left",
          "ground-right",
          "air-left",
          "air-right",
          "air-top",
        ].includes(spawn.direction),
      ),
    );
    assert.ok(first.every((spawn) => spawn.at >= 0));
  }
  assert.equal(
    createWaveSchedule(3, 731204).filter((spawn) =>
      spawn.direction.startsWith("air"),
    ).length,
    6,
  );
  assert.ok(
    createWaveSchedule(4, 731204).some(
      (spawn) => spawn.direction === "air-top",
    ),
  );
});

test("each cleared wave applies the agreed gradual enemy scaling", () => {
  assert.deepEqual(getWaveScaling(0), {
    healthMultiplier: 1,
    damageMultiplier: 1,
    speedMultiplier: 1,
    abilities: [],
  });
  assert.ok(Math.abs(getWaveScaling(1).healthMultiplier - 1.18) < 1e-9);
  assert.ok(Math.abs(getWaveScaling(2).damageMultiplier - 1.12 ** 2) < 1e-9);
  assert.equal(getWaveScaling(5).speedMultiplier, 1.15);
  assert.ok(getWaveScaling(5).healthMultiplier > 2.28);
});

test("voice resolver accepts words, rewards sentences and respects day groups", () => {
  const basic = resolveVoiceIntent("Barricade", 0);
  assert.equal(basic.kind, "action");
  if (basic.kind === "action") assert.equal(basic.intent.quality, "basic");

  const standard = resolveVoiceIntent("Build a barricade", 0);
  assert.equal(standard.kind, "action");
  if (standard.kind === "action") assert.equal(standard.intent.quality, "standard");

  const fluent = resolveVoiceIntent(
    "Build an arrow tower on the left",
    0,
  );
  assert.equal(fluent.kind, "action");
  if (fluent.kind === "action") {
    assert.equal(fluent.intent.actionId, "arrow-tower");
    assert.equal(fluent.intent.quality, "fluent");
  }

  assert.equal(resolveVoiceIntent("Meteor", 2).kind, "unknown");
  assert.equal(resolveVoiceIntent("Meteor", 3).kind, "action");
  assert.equal(resolveVoiceIntent("Begin the wave", 0).kind, "begin-wave");
});

test("voice resolver accepts joined names and only applies unique tolerant matches", () => {
  for (const phrase of ["stone wall", "stonewall", "stone-wall", "stone  wall"]) {
    const resolution = resolveVoiceIntent(phrase, 2);
    assert.equal(resolution.kind, "action");
    if (resolution.kind === "action") {
      assert.equal(resolution.intent.actionId, "stone-wall");
      assert.equal(
        resolution.intent.matchKind,
        phrase === "stonewall" ? "joined" : "exact",
      );
    }
  }

  const fluentJoined = resolveVoiceIntent(
    "Build a stonewall on the left",
    2,
  );
  assert.equal(fluentJoined.kind, "action");
  if (fluentJoined.kind === "action") {
    assert.equal(fluentJoined.intent.actionId, "stone-wall");
    assert.equal(fluentJoined.intent.quality, "fluent");
    assert.equal(fluentJoined.intent.matchKind, "joined");
    assert.equal(fluentJoined.intent.targetHint, "left");
  }

  const tolerant = resolveVoiceIntent("stone wool", 2);
  assert.equal(tolerant.kind, "action");
  if (tolerant.kind === "action") {
    assert.equal(tolerant.intent.actionId, "stone-wall");
    assert.equal(tolerant.intent.matchKind, "tolerant");
  }

  const ambiguous = resolveVoiceIntent("gate turret", 5);
  assert.equal(ambiguous.kind, "ambiguous");
});

test("voice execution can be restricted to words learned during daylight", () => {
  const learned = { tower: 3, archer: 2 } as const;
  const tower = resolveVoiceIntent("Build a tower", 0, learned);
  assert.equal(tower.kind, "action");
  if (tower.kind === "action") assert.equal(tower.intent.actionId, "tower");
  assert.equal(resolveVoiceIntent("Barricade", 0, learned).kind, "unknown");
  assert.equal(resolveVoiceIntent("Summon an archer", 0, learned).kind, "action");
});

test("ink costs reward spoken sentence quality but text stays at base cost", () => {
  assert.equal(STARTING_INK, 24);
  assert.equal(MAX_INK, 60);
  assert.equal(effectiveInkCost("arrow-tower", "basic", "voice"), 7);
  assert.equal(effectiveInkCost("arrow-tower", "standard", "voice"), 6);
  assert.equal(effectiveInkCost("arrow-tower", "fluent", "voice"), 6);
  assert.equal(effectiveInkCost("arrow-tower", "fluent", "text"), 7);
});

test("melee health cost is paid once only after a successful swing", () => {
  assert.equal(meleeHealthCost(0), 0);
  assert.equal(meleeHealthCost(1), 2);
  assert.equal(meleeHealthCost(5), 2);
});

test("overlap checks protect the player, core and existing structures", () => {
  assert.equal(
    rectsOverlap(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 19, y: 0, width: 20, height: 20 },
    ),
    true,
  );
  assert.equal(
    rectsOverlap(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 20, y: 0, width: 20, height: 20 },
    ),
    false,
  );
});

test("player movement ignores buildings and lands only on the grass surface", () => {
  const engine = new GameEngine({
    onHud() {},
    onSound() {},
    onWin() {},
    onLose() {},
    onBookUnlock() {},
  });
  engine.newGame(731204);
  const internal = engine as unknown as {
    structures: StructureState[];
    groundAt(x: number): number;
    movePlayerHorizontal(amount: number): void;
    movePlayerVertical(amount: number): void;
  };
  const ground = internal.groundAt(engine.player.x + PLAYER_WIDTH / 2);
  internal.structures = [
    {
      id: 900,
      actionId: "tower",
      x: engine.player.x + 8,
      y: ground - 60,
      health: 320,
      maxHealth: 320,
      nextActionAt: 0,
      shieldUntil: 0,
      power: 1,
      shotCount: 0,
    },
  ];
  const previousX = engine.player.x;
  internal.movePlayerHorizontal(28);
  assert.ok(engine.player.x > previousX + 20);

  engine.player.y = ground - 120;
  engine.player.vy = 180;
  engine.player.onGround = false;
  internal.movePlayerVertical(100);
  assert.equal(engine.player.y + PLAYER_HEIGHT, ground);
  assert.equal(engine.player.onGround, true);
});

test("V2 saves round-trip and corrupted or legacy values fail closed", () => {
  const save: SaveGameV2 = {
    version: 2,
    savedAt: Date.now(),
    seed: 731204,
    phase: "intermission",
    waveIndex: 2,
    phaseTimer: 21,
    waveElapsed: 0,
    spawnCursor: 0,
    player: {
      x: 1587,
      y: 406,
      health: 72,
      facing: 1,
      respawnTimer: 0,
      tool: "blade",
    },
    coreHealth: 510,
    ink: 17,
    unlockedTier: 2,
    structures: [],
    archers: [
      {
        id: 41,
        x: 1540,
        y: 353,
        health: 70,
        maxHealth: 70,
        towerId: null,
        nextAttackAt: 2,
        facing: 1,
        patrolDirection: -1,
        power: 1,
        shotCount: 0,
      },
    ],
    enemies: [],
    inkDrops: [],
    wordMastery: {
      barricade: { uses: 3, spokenUses: 2, fluentUses: 1 },
    },
    learnedActions: {
      tower: 3,
      archer: 2,
      barricade: 1,
    },
    learningDay: {
      dayIndex: 2,
      learnedWordKeys: ["tower", "archer", "barricade"],
      limit: 8,
    },
  };
  assert.deepEqual(decodeSave(encodeSave(save)), save);
  assert.equal(decodeSave("{broken"), null);
  assert.equal(decodeSave(JSON.stringify({ ...save, version: 1 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...save, enemies: null })), null);
});
