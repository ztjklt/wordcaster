import {
  ACTION_ORDER,
  CAMERA_ZOOM,
  CODEX_ACTIONS,
  CORE_MAX_HEALTH,
  DAILY_LESSON_LIMIT,
  ENEMY_WALL_ROWS,
  ENEMY_DEFINITIONS,
  FOOD_ACTION_IDS,
  LEARNING_REVISION,
  LEGACY_MIGRATION_MARKER,
  LEGACY_V2_SAVE_KEY,
  MAX_INK,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  REACH_TILES_X,
  REACH_TILES_Y,
  REQUIRED_STARTER_ACTIONS,
  SAVE_KEY,
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
  formatSeconds,
  getWaveScaling,
  phaseLabel,
  qualityPower,
  rectsOverlap,
  resolveWallCollapse,
  resolveVoiceIntent,
  wallBlocksEnemy,
  meleeHealthCost,
  recordDailyLesson,
  type ActionId,
  type ArcherState,
  type CodexActionDefinition,
  type EnemyKind,
  type EnemyResistance,
  type EnemyState,
  type FoodActionId,
  type FoodEffectDefinition,
  type FoodState,
  type HeldFoodState,
  type GamePhase,
  type InkDropState,
  type LearningDayState,
  type PlayerState,
  type SaveGameV2,
  type SpellActionId,
  type SpawnDirection,
  type SpawnInstruction,
  type SpellEffectDefinition,
  type StructureActionId,
  type StructureEffectDefinition,
  type StructureState,
  type ToolId,
  type VoiceQuality,
  type VoiceResolution,
  type VoiceSource,
  type WordMastery,
  type UnitActionId,
  type UnitEffectDefinition,
  type WallCollapseResult,
} from "./core.ts";
import {
  GROUND_ASSET_CROP_HEIGHT,
  GROUND_ASSET_CROP_Y,
  GROUND_ASSET_WIDTH,
  LEGACY_GROUND_Y,
  createTerrainProfile,
  groundAssetSourceX,
  groundAssetTopOffset,
  groundSpan,
  groundYAt,
  reanchorLegacyGroundY,
  type TerrainProfile,
} from "./terrain.ts";

const GRAVITY = 560;
const PLAYER_SPEED = 120;
const JUMP_SPEED = 240;
const GROUND_Y = LEGACY_GROUND_Y;
const WORLD_PIXEL_WIDTH = WORLD_WIDTH * TILE_SIZE;
const CORE_X = Math.floor(WORLD_WIDTH / 2) * TILE_SIZE;
const MAX_ACTIVE_ENEMIES = 28;
const PLAYER_MAX_HEALTH = 100;
const ARCHER_SIZE = 20;
const SOLDIER_WIDTH = 24;
const SOLDIER_HEIGHT = 40;
const SOLDIER_RENDER_WIDTH = 28;
const TOWER_ARCHER_VISIBLE_HEIGHT = 14;
const MAX_NIGHT_INK_REGEN_BONUS = 0.5;

export type SoundKind =
  | "swing"
  | "hit"
  | "hurt"
  | "place"
  | "break"
  | "pickup"
  | "cast"
  | "unlock"
  | "wave"
  | "boss"
  | "win"
  | "lose";

export interface HudSnapshot {
  started: boolean;
  phase: GamePhase;
  phaseLabel: string;
  phaseTime: string;
  waveIndex: number;
  waveTitle: string;
  enemiesActive: number;
  enemiesQueued: number;
  playerHealth: number;
  playerMaxHealth: number;
  playerDeadFor: number;
  coreHealth: number;
  coreMaxHealth: number;
  ink: number;
  maxInk: number;
  nightInkRegenBonus: number;
  nightInkRegenRemaining: number;
  unlockedTier: number;
  daylight: boolean;
  learnedActions: Partial<Record<ActionId, number>>;
  starterLessonsCompleted: number;
  starterLessonsTotal: number;
  prepTimerStarted: boolean;
  dailyLessonsLearned: number;
  dailyLessonLimit: number;
  dailyLearnedWordKeys: string[];
  archers: number;
  groundSoldiers: number;
  occupiedTowers: number;
  towerSlots: number;
  activeActionId: ActionId | null;
  activeActionCost: number | null;
  tool: ToolId;
  scaling: ReturnType<typeof getWaveScaling>;
  mastery: Partial<Record<ActionId, WordMastery>>;
  toast: string | null;
}

interface EngineCallbacks {
  onHud: (snapshot: HudSnapshot) => void;
  onSound: (kind: SoundKind) => void;
  onWin: () => void;
  onLose: () => void;
  onBookUnlock: (tier: number) => void;
  onCastEffect?: (effect: {
    actionId: ActionId;
    x: number;
    y: number;
    source: VoiceSource;
  }) => void;
}

export interface CastCommandResult {
  status: "blueprint-ready" | "executed" | "rejected";
  actionId?: ActionId;
  transcript: string;
  quality?: VoiceQuality;
  reason?: string;
  effectPosition?: { x: number; y: number };
  resolution: VoiceResolution;
}

export interface LearnBookWordResult {
  accepted: boolean;
  reason?: string;
  dailyLessonsLearned: number;
  dailyLessonLimit: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ProjectileVisual {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  life: number;
  maxLife: number;
  chained?: boolean;
  sprite?: "archer-arrow" | "fire";
}

interface WarningVisual {
  direction: SpawnDirection;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface EnemyDeathVisual {
  kind: EnemyKind;
  x: number;
  y: number;
  facing: -1 | 1;
  age: number;
  duration: number;
}

interface ExplosionVisual {
  x: number;
  y: number;
  size: number;
  age: number;
  duration: number;
}

type SceneryKind =
  | "tree"
  | "tent"
  | "crate"
  | "barrel"
  | "rocks"
  | "scarecrow"
  | "sheep";

interface SceneryObject {
  kind: SceneryKind;
  x: number;
  variant: number;
  mirrored: boolean;
}

interface PointerState {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  left: boolean;
  rightPressed: boolean;
}

interface PlacementPreview {
  ok: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  reason?: string;
}

interface DamageKind {
  resistance: Exclude<EnemyResistance, "none"> | "magic";
  color: string;
}

const DAMAGE_KINDS: Record<"physical" | "trap" | "frost" | "magic", DamageKind> = {
  physical: { resistance: "physical", color: "#f0d19c" },
  trap: { resistance: "trap", color: "#e8dda4" },
  frost: { resistance: "frost", color: "#86dcff" },
  magic: { resistance: "magic", color: "#e8a7ff" },
};

function cloneMastery(
  value: Partial<Record<ActionId, WordMastery>>,
): Partial<Record<ActionId, WordMastery>> {
  return Object.fromEntries(
    Object.entries(value).map(([id, mastery]) => [
      id,
      mastery ? { ...mastery } : mastery,
    ]),
  ) as Partial<Record<ActionId, WordMastery>>;
}

function cloneLearnedActions(
  value: Partial<Record<ActionId, number>>,
): Partial<Record<ActionId, number>> {
  return { ...value };
}

function isStructureAction(
  definition: CodexActionDefinition,
): definition is CodexActionDefinition & { effect: StructureEffectDefinition } {
  return definition.effect.type === "structure";
}

function isUnitAction(
  definition: CodexActionDefinition,
): definition is CodexActionDefinition & { effect: UnitEffectDefinition } {
  return definition.effect.type === "unit";
}

function isFoodAction(
  definition: CodexActionDefinition,
): definition is CodexActionDefinition & { effect: FoodEffectDefinition } {
  return definition.effect.type === "food";
}

function isFoodActionId(value: unknown): value is FoodActionId {
  return (
    typeof value === "string" &&
    (FOOD_ACTION_IDS as readonly string[]).includes(value)
  );
}

export class GameEngine {
  player: PlayerState;
  phase: GamePhase = "prep";
  waveIndex = 0;
  unlockedTier = 0;
  ink = STARTING_INK;
  coreHealth = CORE_MAX_HEALTH;
  started = false;
  paused = true;

  private readonly callbacks: EngineCallbacks;
  private seed = 731_204;
  private terrain: TerrainProfile = createTerrainProfile(this.seed);
  private backgroundImages: Array<HTMLImageElement | null> = Array(6).fill(
    null,
  );
  private cloudImages: Array<HTMLImageElement | null> = Array(6).fill(null);
  private sunImage: HTMLImageElement | null = null;
  private groundImage: HTMLImageElement | null = null;
  private towerImage: HTMLImageElement | null = null;
  private archerArrowImage: HTMLImageElement | null = null;
  private playerIdleImages: Array<HTMLImageElement | null> = Array(9).fill(null);
  private mushroomImages: Record<
    "idle" | "run" | "attack" | "hit" | "die",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(7).fill(null),
    run: Array(8).fill(null),
    attack: Array(10).fill(null),
    hit: Array(5).fill(null),
    die: Array(15).fill(null),
  };
  private wallImages: Partial<Record<StructureActionId, HTMLImageElement>> = {};
  private archerImages: Record<
    "idle" | "run" | "shoot",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(6).fill(null),
    run: Array(4).fill(null),
    shoot: Array(8).fill(null),
  };
  private swordsmanImages: Record<
    "idle" | "run" | "attack" | "hit",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(10).fill(null),
    run: Array(16).fill(null),
    attack: Array(7).fill(null),
    hit: Array(4).fill(null),
  };
  private spearmanImages: Record<
    "idle" | "run" | "attack",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(12).fill(null),
    run: Array(6).fill(null),
    attack: Array(3).fill(null),
  };
  private knightImages: Record<
    "idle" | "run" | "attack" | "guard",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(8).fill(null),
    run: Array(6).fill(null),
    attack: Array(4).fill(null),
    guard: Array(6).fill(null),
  };
  private monkImages: Record<
    "idle" | "heal" | "heal-effect",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(6).fill(null),
    heal: Array(11).fill(null),
    "heal-effect": Array(11).fill(null),
  };
  private flyingEyeImages: Record<
    "flight" | "attack" | "hit" | "die",
    Array<HTMLImageElement | null>
  > = {
    flight: Array(8).fill(null),
    attack: Array(8).fill(null),
    hit: Array(4).fill(null),
    die: Array(4).fill(null),
  };
  private explosionImages: Array<HTMLImageElement | null> = Array(9).fill(null);
  private dirtImages: Array<HTMLImageElement | null> = Array(2).fill(null);
  private treeImages: Array<HTMLImageElement | null> = Array(6).fill(null);
  private sheepImages: Record<
    "idle" | "bounce",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(8).fill(null),
    bounce: Array(6).fill(null),
  };
  private decorImage: HTMLImageElement | null = null;
  private tentImage: HTMLImageElement | null = null;
  private scarecrowImage: HTMLImageElement | null = null;
  private fireImages: Array<HTMLImageElement | null> = Array(7).fill(null);
  private bloodMonsterImages: Record<
    "idle" | "walk" | "attack01" | "attack02" | "hit" | "die",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(6).fill(null),
    walk: Array(8).fill(null),
    attack01: Array(8).fill(null),
    attack02: Array(8).fill(null),
    hit: Array(4).fill(null),
    die: Array(4).fill(null),
  };
  private demonImages: Record<
    "idle" | "walk" | "attack01" | "attack02" | "hit" | "die",
    Array<HTMLImageElement | null>
  > = {
    idle: Array(6).fill(null),
    walk: Array(8).fill(null),
    attack01: Array(7).fill(null),
    attack02: Array(7).fill(null),
    hit: Array(4).fill(null),
    die: Array(4).fill(null),
  };
  private phaseTimer = 150;
  private waveElapsed = 0;
  private waveSchedule: SpawnInstruction[] = [];
  private spawnCursor = 0;
  private enemies: EnemyState[] = [];
  private structures: StructureState[] = [];
  private archers: ArcherState[] = [];
  private inkDrops: InkDropState[] = [];
  private foods: FoodState[] = [];
  private heldFood: HeldFoodState | null = null;
  private nightInkRegenBonus = 0;
  private nightInkRegenRemaining = 0;
  private nightInkRegenAccumulator = 0;
  private particles: Particle[] = [];
  private projectiles: ProjectileVisual[] = [];
  private warnings: WarningVisual[] = [];
  private enemyDeaths: EnemyDeathVisual[] = [];
  private explosions: ExplosionVisual[] = [];
  private scenery: SceneryObject[] = [];
  private keys = new Set<string>();
  private pointer: PointerState = {
    screenX: 0,
    screenY: 0,
    worldX: CORE_X,
    worldY: GROUND_Y,
    left: false,
    rightPressed: false,
  };
  private cameraX = Math.max(0, CORE_X - 320);
  private cameraY = (SURFACE_Y - 12) * TILE_SIZE;
  private viewWidth = 640;
  private viewHeight = 360;
  private elapsed = 0;
  private autosaveTimer = 0;
  private hudTimer = 0;
  private nextEntityId = 1;
  private activeActionId: ActionId | null = null;
  private activeQuality: VoiceQuality = "basic";
  private activeSource: VoiceSource = "voice";
  private toast: string | null = null;
  private toastTimer = 0;
  private mastery: Partial<Record<ActionId, WordMastery>> = {};
  private learnedActions: Partial<Record<ActionId, number>> = {};
  private learningDay: LearningDayState = {
    dayIndex: 0,
    learnedWordKeys: [],
    limit: DAILY_LESSON_LIMIT,
  };
  private pendingLearningReset = false;
  private playerShieldUntil = 0;
  private coreShieldUntil = 0;
  private terminalEmitted = false;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.player = this.createPlayer();
    if (typeof window !== "undefined") {
      const loadImage = (
        path: string,
        onLoad: (image: HTMLImageElement) => void,
      ) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => onLoad(image);
        image.src = new URL(path, window.location.href).href;
      };
      const loadFrameSet = (
        basePath: string,
        sets: Record<string, Array<HTMLImageElement | null>>,
      ) => {
        for (const [state, frames] of Object.entries(sets)) {
          for (let index = 0; index < frames.length; index += 1) {
            loadImage(
              `${basePath}/${state}/frame-${String(index).padStart(2, "0")}.png`,
              (image) => {
                frames[index] = image;
              },
            );
          }
        }
      };
      const backgroundPaths = [
        "./game/background/normal/sky.png",
        "./game/background/normal/castle.png",
        "./game/background/normal/layer-4.png",
        "./game/background/normal/layer-3.png",
        "./game/background/normal/layer-2.png",
        "./game/background/normal/layer-1.png",
      ];
      for (let index = 0; index < backgroundPaths.length; index += 1) {
        loadImage(backgroundPaths[index], (image) => {
          this.backgroundImages[index] = image;
        });
      }
      for (let index = 0; index < this.cloudImages.length; index += 1) {
        loadImage(
          `./game/background/atmosphere/cloud-${index + 1}.png`,
          (image) => {
            this.cloudImages[index] = image;
          },
        );
      }
      loadImage("./game/background/atmosphere/sun.png", (image) => {
        this.sunImage = image;
      });
      loadImage("./game/terrain/grass.png", (image) => {
        this.groundImage = image;
      });
      loadImage("./game/structures/tower.png", (image) => {
        this.towerImage = image;
      });
      loadImage("./game/units/archer/arrow.png", (image) => {
        this.archerArrowImage = image;
      });
      for (let index = 0; index < this.playerIdleImages.length; index += 1) {
        loadImage(`./game/player/idle/idle-${String(index).padStart(2, "0")}.png`, (image) => {
          this.playerIdleImages[index] = image;
        });
      }
      loadFrameSet("./game/enemies/mushroom", this.mushroomImages);
      loadFrameSet("./game/units/archer", this.archerImages);
      loadFrameSet("./game/units/swordsman", this.swordsmanImages);
      loadFrameSet("./game/units/spearman", this.spearmanImages);
      loadFrameSet("./game/units/knight", this.knightImages);
      loadFrameSet("./game/units/monk", this.monkImages);
      loadFrameSet("./game/enemies/flying-eye", this.flyingEyeImages);
      loadFrameSet("./game/scenery/sheep", this.sheepImages);
      for (let index = 0; index < this.explosionImages.length; index += 1) {
        loadImage(
          `./game/effects/explosion/explode/frame-${String(index).padStart(2, "0")}.png`,
          (image) => {
            this.explosionImages[index] = image;
          },
        );
      }
      for (let index = 0; index < this.dirtImages.length; index += 1) {
        loadImage(`./game/terrain/dirt-${index + 1}.png`, (image) => {
          this.dirtImages[index] = image;
        });
      }
      for (let index = 0; index < this.treeImages.length; index += 1) {
        loadImage(
          `./game/scenery/trees/tree-${String(index).padStart(2, "0")}.png`,
          (image) => {
            this.treeImages[index] = image;
          },
        );
      }
      loadImage("./game/scenery/decor-sheet.png", (image) => {
        this.decorImage = image;
      });
      loadImage("./game/scenery/tent.png", (image) => {
        this.tentImage = image;
      });
      loadImage("./game/scenery/scarecrow.png", (image) => {
        this.scarecrowImage = image;
      });
      for (let index = 0; index < this.fireImages.length; index += 1) {
        loadImage(
          `./game/effects/fire/burn/frame-${String(index).padStart(2, "0")}.png`,
          (image) => {
            this.fireImages[index] = image;
          },
        );
      }
      loadFrameSet("./game/enemies/blood-monster", this.bloodMonsterImages);
      loadFrameSet("./game/enemies/demon", this.demonImages);
      const wallAssets: Array<[StructureActionId, string]> = [
        ["barricade", "./game/structures/wood-wall.png"],
        ["palisade", "./game/structures/wood-wall.png"],
        ["stone-wall", "./game/structures/stone-wall.png"],
        ["iron-gate", "./game/structures/iron-wall.png"],
        ["fortress-ward", "./game/structures/crystal-wall.png"],
      ];
      for (const [actionId, path] of wallAssets) {
        loadImage(path, (image) => {
          this.wallImages[actionId] = image;
        });
      }
    }
    this.refreshScenery();
  }

  private refreshTerrain(): void {
    this.terrain = createTerrainProfile(this.seed);
    this.pointer.worldY = this.groundAt(this.pointer.worldX);
    this.refreshScenery();
  }

  private refreshScenery(): void {
    let value = (Math.floor(this.seed) ^ 0x51f15e) >>> 0;
    const random = () => {
      value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
      return value / 4_294_967_296;
    };
    const scenery: SceneryObject[] = [];
    const add = (kind: SceneryKind, count: number) => {
      let attempts = 0;
      while (count > 0 && attempts < 200) {
        attempts += 1;
        const x = TILE_SIZE * 7 + random() * (WORLD_PIXEL_WIDTH - TILE_SIZE * 14);
        if (Math.abs(x - CORE_X) < TILE_SIZE * 7) continue;
        scenery.push({
          kind,
          x: Math.round(x),
          variant: Math.floor(random() * 6),
          mirrored: random() > 0.5,
        });
        count -= 1;
      }
    };
    add("tree", 12);
    add("rocks", 7);
    add("crate", 5);
    add("barrel", 4);
    add("tent", 2);
    add("scarecrow", 2);
    add("sheep", 3);
    this.scenery = scenery.sort((left, right) => left.x - right.x);
  }

  private groundAt(worldX: number): number {
    return groundYAt(this.terrain, worldX);
  }

  private groundForFootprint(worldX: number, width: number) {
    return groundSpan(this.terrain, worldX, width);
  }

  private coreGround(): number {
    return this.groundAt(CORE_X);
  }

  private unitAction(unit: ArcherState): UnitActionId {
    return unit.actionId ?? "archer";
  }

  private unitWidth(unit: ArcherState): number {
    return this.unitAction(unit) === "archer" ? ARCHER_SIZE : SOLDIER_WIDTH;
  }

  private unitHeight(unit: ArcherState): number {
    return this.unitAction(unit) === "archer" ? ARCHER_SIZE : SOLDIER_HEIGHT;
  }

  private positionArcherInTower(
    unit: ArcherState,
    tower: StructureState,
  ): void {
    const rect = this.structureRect(tower);
    unit.x = rect.x + rect.width / 2 - ARCHER_SIZE / 2;
    unit.y = rect.y + 3;
  }

  private starterLessonCount(): number {
    return REQUIRED_STARTER_ACTIONS.filter(
      (actionId) => (this.learnedActions[actionId] ?? 0) > 0,
    ).length;
  }

  private normalizeWordKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private dailyLessonCount(): number {
    return this.learningDay.learnedWordKeys.length;
  }

  hasRequiredStarterLessons(): boolean {
    return this.starterLessonCount() === REQUIRED_STARTER_ACTIONS.length;
  }

  needsStarterLessons(): boolean {
    return (
      this.started &&
      this.waveIndex === 0 &&
      this.phase === "prep" &&
      !this.hasRequiredStarterLessons()
    );
  }

  private createPlayer(): PlayerState {
    const ground = this.groundAt(CORE_X);
    return {
      x: CORE_X - PLAYER_WIDTH / 2,
      y: ground - PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      facing: 1,
      onGround: true,
      invulnerability: 0,
      attackCooldown: 0,
      attackAnimation: 0,
      respawnTimer: 0,
      tool: "blade",
    };
  }

  newGame(seed = Math.floor(100_000 + Math.random() * 899_999)): void {
    this.seed = seed;
    this.refreshTerrain();
    this.phase = "prep";
    this.waveIndex = 0;
    this.unlockedTier = 0;
    this.ink = STARTING_INK;
    this.coreHealth = CORE_MAX_HEALTH;
    this.phaseTimer = 150;
    this.waveElapsed = 0;
    this.waveSchedule = [];
    this.spawnCursor = 0;
    this.enemies = [];
    this.structures = [];
    this.archers = [];
    this.inkDrops = [];
    this.foods = [];
    this.heldFood = null;
    this.nightInkRegenBonus = 0;
    this.nightInkRegenRemaining = 0;
    this.nightInkRegenAccumulator = 0;
    this.particles = [];
    this.projectiles = [];
    this.warnings = [];
    this.enemyDeaths = [];
    this.explosions = [];
    this.player = this.createPlayer();
    this.mastery = {};
    this.learnedActions = {};
    this.learningDay = {
      dayIndex: 0,
      learnedWordKeys: [],
      limit: DAILY_LESSON_LIMIT,
    };
    this.pendingLearningReset = false;
    this.activeActionId = null;
    this.elapsed = 0;
    this.nextEntityId = 1;
    this.autosaveTimer = 0;
    this.terminalEmitted = false;
    this.started = true;
    this.paused = false;
    this.snapCamera();
    this.setToast("白昼已经开始 · 先在施法魔典学习 Tower、Archer 与 Barricade。", 6);
    this.emitHud(true);
    this.save();
  }

  /**
   * Deterministic, non-persistent scenes used for visual QA and the shipped
   * gameplay screenshots. Every object still runs through the real renderer
   * and combat simulation; the query is intentionally absent from normal play.
   */
  loadShowcase(scene: "prep" | "wave4" | "wave6"): void {
    this.seed = 741_923;
    this.refreshTerrain();
    this.phase = scene === "prep" ? "prep" : "wave";
    this.waveIndex = scene === "prep" ? 0 : scene === "wave4" ? 3 : 5;
    this.unlockedTier = scene === "prep" ? 0 : scene === "wave4" ? 3 : 5;
    this.ink = scene === "prep" ? 13 : scene === "wave4" ? 31 : 9;
    this.coreHealth = scene === "wave6" ? 318 : 600;
    this.phaseTimer = scene === "prep" ? 96 : 0;
    this.waveElapsed = scene === "prep" ? 0 : scene === "wave4" ? 44 : 72;
    this.waveSchedule = createWaveSchedule(this.waveIndex, this.seed);
    this.spawnCursor = this.waveSchedule.length;
    this.enemies = [];
    this.structures = [];
    this.archers = [];
    this.inkDrops = [];
    this.foods = [];
    this.heldFood = null;
    this.nightInkRegenBonus = 0;
    this.nightInkRegenRemaining = 0;
    this.nightInkRegenAccumulator = 0;
    this.particles = [];
    this.projectiles = [];
    this.warnings = [];
    this.enemyDeaths = [];
    this.explosions = [];
    this.player = this.createPlayer();
    this.player.x = CORE_X - 72;
    this.player.health = scene === "wave6" ? 46 : 92;
    this.player.facing = 1;
    this.mastery = {
      tower: { uses: 2, spokenUses: 2, fluentUses: 1 },
      archer: { uses: 3, spokenUses: 3, fluentUses: 2 },
      barricade: { uses: 3, spokenUses: 2, fluentUses: 1 },
      "arrow-tower": { uses: 4, spokenUses: 3, fluentUses: 2 },
      "frost-ward": { uses: 2, spokenUses: 2, fluentUses: 1 },
      "chain-lightning": { uses: 3, spokenUses: 3, fluentUses: 2 },
    };
    this.learnedActions = Object.fromEntries(
      ACTION_ORDER.filter(
        (id) => canLearnCampaignAction(id, this.waveIndex),
      ).map((id) => [id, 3]),
    ) as Partial<Record<ActionId, number>>;
    this.learningDay = {
      dayIndex: this.waveIndex,
      learnedWordKeys: ACTION_ORDER.filter(
        (id) => canLearnCampaignAction(id, this.waveIndex),
      )
        .slice(0, DAILY_LESSON_LIMIT)
        .map((id) => CODEX_ACTIONS[id].english.toLowerCase()),
      limit: DAILY_LESSON_LIMIT,
    };
    this.pendingLearningReset = false;
    this.activeActionId = null;
    this.elapsed = 23;
    this.nextEntityId = 1;
    this.autosaveTimer = 0;
    this.terminalEmitted = false;
    this.started = true;
    this.paused = false;

    const place = (actionId: StructureActionId, x: number) => {
      const definition = CODEX_ACTIONS[actionId];
      if (!isStructureAction(definition)) return undefined;
      const width = definition.effect.footprint.width * TILE_SIZE;
      const placed: StructureState = {
        id: this.nextEntityId++,
        actionId,
        x,
        y:
          this.groundForFootprint(x, width).supportY -
          definition.effect.footprint.height * TILE_SIZE,
        health: definition.effect.maxHealth,
        maxHealth: definition.effect.maxHealth,
        nextActionAt: this.elapsed + 0.25,
        shieldUntil: 0,
        power: 1,
        shotCount: 0,
      };
      this.structures.push(placed);
      return placed;
    };
    const addEnemy = (
      kind: EnemyKind,
      direction: SpawnDirection,
      x: number,
      y?: number,
      resistance: EnemyResistance = "none",
    ) => {
      this.spawnEnemy({ at: 0, kind, direction, resistance });
      const enemy = this.enemies[this.enemies.length - 1];
      enemy.x = x;
      if (typeof y === "number") enemy.y = y;
      enemy.nextAttackAt = this.elapsed + 0.9;
    };

    place("barricade", CORE_X - 155);
    const showcaseTower = place("tower", CORE_X + 95);
    if (showcaseTower) {
      const rect = this.structureRect(showcaseTower);
      this.archers.push({
        id: this.nextEntityId++,
        actionId: "archer",
        x: rect.x + rect.width / 2 - ARCHER_SIZE / 2,
        y: rect.y + 3,
        health: 70,
        maxHealth: 70,
        towerId: showcaseTower.id,
        nextAttackAt: this.elapsed + 0.2,
        facing: -1,
        patrolDirection: -1,
        power: 1,
        shotCount: 0,
        animationTimer: 0,
        hurtTimer: 0,
      });
    }
    if (scene !== "prep") {
      (["swordsman", "spearman"] as const).forEach((actionId, index) => {
        const definition = CODEX_ACTIONS[actionId];
        if (!isUnitAction(definition)) return;
        const x = CORE_X - 72 + index * 44;
        this.archers.push({
          id: this.nextEntityId++,
          actionId,
          x,
          y: this.groundAt(x + SOLDIER_WIDTH / 2) - SOLDIER_HEIGHT,
          health: definition.effect.maxHealth,
          maxHealth: definition.effect.maxHealth,
          towerId: null,
          nextAttackAt: this.elapsed + 0.25 + index * 0.1,
          facing: index === 0 ? -1 : 1,
          patrolDirection: index === 0 ? -1 : 1,
          power: 1,
          shotCount: 0,
          animationTimer: 0,
          hurtTimer: 0,
        });
      });
    }
    place("arrow-tower", CORE_X + 150);
    if (scene !== "prep") {
      place("stone-wall", CORE_X + 170);
      place("spike-trap", CORE_X - 225);
      place("frost-ward", CORE_X - 88);
      addEnemy("walker", "ground-left", CORE_X - 255);
      addEnemy("sapper", "ground-right", CORE_X + 275, undefined, "physical");
      addEnemy("spitter", "ground-left", CORE_X - 335);
      addEnemy(
        "flyer",
        "air-left",
        CORE_X - 185,
        this.groundAt(CORE_X - 185) - 145,
      );
      addEnemy(
        "flyer",
        "air-right",
        CORE_X + 220,
        this.groundAt(CORE_X + 220) - 178,
        "frost",
      );
    }
    if (scene === "wave6") {
      place("iron-gate", CORE_X + 238);
      place("freeze-cannon", CORE_X - 285);
      place("fortress-ward", CORE_X + 35);
      place("homing-turret", CORE_X + 305);
      addEnemy(
        "diver",
        "air-top",
        CORE_X - 95,
        this.groundAt(CORE_X - 95) - 245,
        "trap",
      );
      addEnemy("brute", "ground-right", CORE_X + 360, undefined, "physical");
      addEnemy(
        "sky-devourer",
        "air-top",
        CORE_X + 95,
        this.groundAt(CORE_X + 95) - 165,
      );
      this.warnings.push({
        direction: "air-top",
        x: CORE_X - 95,
        y: this.groundAt(CORE_X - 95) - 6,
        life: 1.15,
        maxLife: 1.2,
      });
    }
    this.snapCamera();
    this.setToast(
      scene === "prep"
        ? "言灵已经落地 · 按住 M 继续构筑"
        : scene === "wave4"
          ? "召唤门放出飞行怪 · 魔典打开时战斗仍在继续"
          : "邪恶法师的最终召唤已经开始 · 守住言灵封印！",
      20,
    );
    this.emitHud(true);
  }

  loadFromStorage(): boolean {
    if (typeof window === "undefined") return false;
    let save = decodeSave(window.localStorage.getItem(SAVE_KEY));
    if (
      !save &&
      window.localStorage.getItem(LEGACY_MIGRATION_MARKER) !== "true"
    ) {
      const legacy = decodeSave(
        window.localStorage.getItem(LEGACY_V2_SAVE_KEY),
      );
      if (legacy) {
        save = legacy;
        try {
          window.localStorage.setItem(SAVE_KEY, encodeSave(legacy));
          window.localStorage.setItem(LEGACY_MIGRATION_MARKER, "true");
        } catch {
          // Loading remains possible even if the copy cannot be persisted.
        }
      }
    }
    if (!save) return false;
    this.seed = save.seed;
    this.refreshTerrain();
    this.phase = save.phase;
    this.waveIndex = Math.max(0, Math.min(5, save.waveIndex));
    this.unlockedTier = Math.max(0, Math.min(5, save.unlockedTier));
    this.ink = Math.max(0, Math.min(MAX_INK, save.ink));
    this.nightInkRegenBonus = Math.max(
      0,
      Math.min(
        MAX_NIGHT_INK_REGEN_BONUS,
        Number.isFinite(save.nightInkRegenBonus)
          ? (save.nightInkRegenBonus ?? 0)
          : 0,
      ),
    );
    this.nightInkRegenRemaining = Math.max(
      0,
      Number.isFinite(save.nightInkRegenRemaining)
        ? (save.nightInkRegenRemaining ?? 0)
        : 0,
    );
    this.nightInkRegenAccumulator = Math.max(
      0,
      Math.min(
        0.999,
        Number.isFinite(save.nightInkRegenAccumulator)
          ? (save.nightInkRegenAccumulator ?? 0)
          : 0,
      ),
    );
    this.coreHealth = Math.max(0, Math.min(CORE_MAX_HEALTH, save.coreHealth));
    this.phaseTimer = Math.max(0, save.phaseTimer);
    this.waveElapsed = Math.max(0, save.waveElapsed);
    this.waveSchedule = createWaveSchedule(this.waveIndex, this.seed);
    this.spawnCursor = Math.max(
      0,
      Math.min(this.waveSchedule.length, save.spawnCursor),
    );
    this.player = {
      ...this.createPlayer(),
      ...save.player,
      vx: 0,
      vy: 0,
      onGround: false,
      invulnerability: 1,
      attackCooldown: 0,
      attackAnimation: 0,
    };
    if ((save.learningRevision ?? 0) < LEARNING_REVISION) {
      this.player.y =
        this.groundAt(this.player.x + PLAYER_WIDTH / 2) - PLAYER_HEIGHT;
      this.player.onGround = true;
    }
    const playerGround = this.groundAt(this.player.x + PLAYER_WIDTH / 2);
    const migratedPlayerY = reanchorLegacyGroundY(
      this.terrain,
      this.player.x,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      save.player.y,
    );
    if (migratedPlayerY !== save.player.y) {
      this.player.y = migratedPlayerY;
      this.player.onGround = true;
    } else if (this.player.y + PLAYER_HEIGHT > playerGround) {
      this.player.y = playerGround - PLAYER_HEIGHT;
      this.player.onGround = true;
    }
    this.structures = save.structures.map((entry) => {
      const structure = { ...entry };
      const definition = CODEX_ACTIONS[structure.actionId];
      if (!isStructureAction(definition)) return structure;
      const width = definition.effect.footprint.width * TILE_SIZE;
      const height = definition.effect.footprint.height * TILE_SIZE;
      structure.y = reanchorLegacyGroundY(
        this.terrain,
        structure.x,
        width,
        height,
        structure.y,
      );
      return structure;
    });
    if ((save.learningRevision ?? 0) < LEARNING_REVISION) {
      const towerColumns = new Map<number, StructureState[]>();
      for (const structure of this.structures) {
        if (structure.actionId !== "tower") continue;
        const key = Math.round(structure.x / TILE_SIZE) * TILE_SIZE;
        const column = towerColumns.get(key) ?? [];
        column.push(structure);
        towerColumns.set(key, column);
      }
      for (const [columnX, towers] of towerColumns) {
        const supportY = this.groundForFootprint(
          columnX,
          TILE_SIZE * 2,
        ).supportY;
        towers
          .sort((left, right) => right.y - left.y)
          .forEach((tower, index) => {
            tower.y = supportY - (index + 1) * TILE_SIZE * 3;
          });
      }
    }
    this.archers = (save.archers ?? []).map((entry) => {
      const archer: ArcherState = {
        ...entry,
        actionId: entry.actionId ?? "archer",
        animationTimer: entry.animationTimer ?? 0,
        hurtTimer: entry.hurtTimer ?? 0,
      };
      if (this.unitAction(archer) !== "archer") {
        archer.towerId = null;
      }
      if (
        archer.towerId !== null &&
        !this.structures.some(
          (structure) =>
            structure.id === archer.towerId &&
            structure.actionId === "tower",
        )
      ) {
        archer.towerId = null;
      }
      const tower =
        archer.towerId === null
          ? undefined
          : this.structures.find(
              (structure) => structure.id === archer.towerId,
            );
      if (tower) {
        this.positionArcherInTower(archer, tower);
      } else {
        const width = this.unitWidth(archer);
        archer.y =
          this.groundAt(archer.x + width / 2) - this.unitHeight(archer);
      }
      return archer;
    });
    this.enemies = save.enemies.map((entry) => {
      const enemy: EnemyState = {
        ...entry,
        animationState: entry.animationState ?? "idle",
        animationTimer: entry.animationTimer ?? 0,
        siegeColumnX: entry.siegeColumnX ?? null,
        siegeLayer: entry.siegeLayer ?? null,
      };
      const definition = ENEMY_DEFINITIONS[enemy.kind];
      if (
        definition.movement === "walker" ||
        definition.movement === "jumper"
      ) {
        enemy.y =
          this.groundAt(enemy.x + definition.width / 2) - definition.height;
      }
      return enemy;
    });
    this.inkDrops = save.inkDrops.map((entry) => {
      const drop = { ...entry };
      const ground = this.groundAt(drop.x) - 7;
      if (drop.y >= GROUND_Y - 10 || drop.y > ground) drop.y = ground;
      return drop;
    });
    this.foods = (save.foods ?? [])
      .filter(
        (entry): entry is FoodState =>
          isFoodActionId(entry.actionId),
      )
      .map((entry) => ({
        ...entry,
        x: Math.max(10, Math.min(WORLD_WIDTH * TILE_SIZE - 10, entry.x)),
        y: this.groundAt(entry.x) - 12,
        power: Math.max(1, Number.isFinite(entry.power) ? entry.power : 1),
      }));
    this.heldFood =
      save.heldFood && isFoodActionId(save.heldFood.actionId)
        ? {
            actionId: save.heldFood.actionId,
            power: Math.max(
              1,
              Number.isFinite(save.heldFood.power)
                ? save.heldFood.power
                : 1,
            ),
          }
        : null;
    this.mastery = cloneMastery(save.wordMastery);
    const savedLearnedActions = save.learnedActions
      ? cloneLearnedActions(save.learnedActions)
      : (Object.fromEntries(
          ACTION_ORDER.filter(
            (id) => canLearnCampaignAction(id, this.waveIndex),
          ).map((id) => [id, 1]),
        ) as Partial<Record<ActionId, number>>);
    this.learnedActions = savedLearnedActions;
    const savedLearningDay = save.learningDay;
    this.learningDay = {
      dayIndex: this.waveIndex,
      learnedWordKeys:
        savedLearningDay?.dayIndex === this.waveIndex &&
        Array.isArray(savedLearningDay.learnedWordKeys)
          ? [...new Set(
              savedLearningDay.learnedWordKeys
                .filter((key): key is string => typeof key === "string")
                .map((key) => this.normalizeWordKey(key))
                .filter(Boolean),
            )].slice(0, DAILY_LESSON_LIMIT)
          : [],
      limit: DAILY_LESSON_LIMIT,
    };
    this.pendingLearningReset = false;
    const missingStarterLessons = !this.hasRequiredStarterLessons();
    const rescuedNight =
      missingStarterLessons && this.phase === "wave";
    if (rescuedNight) {
      this.phase = "prep";
      this.waveElapsed = 0;
      this.phaseTimer = 150;
      this.spawnCursor = 0;
      this.waveSchedule = [];
      this.enemies = [];
      this.player = this.createPlayer();
      this.coreHealth = CORE_MAX_HEALTH;
    }
    const ids = [
      ...this.structures.map((entry) => entry.id),
      ...this.archers.map((entry) => entry.id),
      ...this.enemies.map((entry) => entry.id),
      ...this.inkDrops.map((entry) => entry.id),
      ...this.foods.map((entry) => entry.id),
    ];
    this.nextEntityId = Math.max(1, ...ids) + 1;
    this.activeActionId = null;
    this.particles = [];
    this.projectiles = [];
    this.warnings = [];
    this.enemyDeaths = [];
    this.explosions = [];
    this.elapsed = 0;
    this.autosaveTimer = 0;
    this.terminalEmitted = false;
    this.started = true;
    this.paused = false;
    this.snapCamera();
    this.setToast(
      rescuedNight
        ? "旧版第一夜已退回白昼 · 完成三项必修后再迎敌。"
        : save.learningRevision === LEARNING_REVISION
          ? "Word Caster 战役已从本地存档恢复。"
          : "存档已适配新版学习与城墙规则。",
      4,
    );
    this.emitHud(true);
    return true;
  }

  static hasValidSave(): boolean {
    if (typeof window === "undefined") return false;
    if (decodeSave(window.localStorage.getItem(SAVE_KEY))) return true;
    return (
      window.localStorage.getItem(LEGACY_MIGRATION_MARKER) !== "true" &&
      decodeSave(window.localStorage.getItem(LEGACY_V2_SAVE_KEY)) !== null
    );
  }

  clearSave(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SAVE_KEY);
      // The legacy data stays untouched, but must not be imported again after
      // the player explicitly starts a fresh Word Caster campaign.
      window.localStorage.setItem(LEGACY_MIGRATION_MARKER, "true");
    }
  }

  save(): boolean {
    if (!this.started || typeof window === "undefined") return false;
    const save: SaveGameV2 = {
      version: 2,
      savedAt: Date.now(),
      seed: this.seed,
      phase: this.phase,
      waveIndex: this.waveIndex,
      phaseTimer: this.phaseTimer,
      waveElapsed: this.waveElapsed,
      spawnCursor: this.spawnCursor,
      player: {
        x: this.player.x,
        y: this.player.y,
        health: this.player.health,
        facing: this.player.facing,
        respawnTimer: this.player.respawnTimer,
        tool: this.player.tool,
      },
      coreHealth: this.coreHealth,
      ink: this.ink,
      unlockedTier: this.unlockedTier,
      structures: this.structures.map((entry) => ({ ...entry })),
      archers: this.archers.map((entry) => ({ ...entry })),
      enemies: this.enemies.map((entry) => ({ ...entry })),
      inkDrops: this.inkDrops.map((entry) => ({ ...entry })),
      foods: this.foods.map((entry) => ({ ...entry })),
      heldFood: this.heldFood ? { ...this.heldFood } : null,
      nightInkRegenBonus: this.nightInkRegenBonus,
      nightInkRegenRemaining: this.nightInkRegenRemaining,
      nightInkRegenAccumulator: this.nightInkRegenAccumulator,
      wordMastery: cloneMastery(this.mastery),
      learnedActions: cloneLearnedActions(this.learnedActions),
      learningRevision: LEARNING_REVISION,
      learningDay: {
        dayIndex: this.learningDay.dayIndex,
        learnedWordKeys: [...this.learningDay.learnedWordKeys],
        limit: DAILY_LESSON_LIMIT,
      },
    };
    try {
      window.localStorage.setItem(SAVE_KEY, encodeSave(save));
      return true;
    } catch {
      this.setToast("本地存档空间不足，本次进度暂未保存。", 4);
      return false;
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.keys.clear();
      this.pointer.left = false;
    }
    this.emitHud(true);
  }

  keyDown(code: string): void {
    this.keys.add(code);
    if (code === "Digit1") this.selectTool("blade");
    if (code === "Digit2") this.selectTool("hammer");
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  selectTool(tool: ToolId): void {
    this.player.tool = tool;
    this.activeActionId = null;
    this.setToast(tool === "blade" ? "旧短刀 · 命中会消耗2点生命" : "工匠锤 · 拆除己方建筑", 2);
    this.emitHud(true);
  }

  cancelPlacement(): boolean {
    if (this.activeActionId) {
      this.activeActionId = null;
      this.setToast("已取消当前言灵蓝图。", 2);
      this.emitHud(true);
      return true;
    }
    if (!this.heldFood) return false;
    this.placeHeldFoodOnGround();
    this.setToast("食物已经放在地上。", 2);
    this.save();
    this.emitHud(true);
    return true;
  }

  pointerMove(screenX: number, screenY: number): void {
    this.pointer.screenX = screenX;
    this.pointer.screenY = screenY;
    this.pointer.worldX = this.cameraX + screenX / CAMERA_ZOOM;
    this.pointer.worldY = this.cameraY + screenY / CAMERA_ZOOM;
  }

  canInteractWithFood(): boolean {
    return this.heldFood !== null || this.foodAtPointer() !== undefined;
  }

  pointerDown(button: number): void {
    if (!this.started || this.paused || this.player.respawnTimer > 0) return;
    if (button === 0) {
      this.pointer.left = true;
      if (this.heldFood) return;
      if (this.pickUpFood()) return;
      if (this.player.tool === "blade") this.tryMeleeAttack();
      else this.tryDismantle();
    }
    if (button === 2) {
      this.pointer.rightPressed = true;
      this.tryCommitActiveAction();
    }
  }

  pointerUp(button: number): void {
    if (button === 0) {
      if (this.pointer.left && this.heldFood) this.releaseHeldFood();
      this.pointer.left = false;
    }
    if (button === 2) this.pointer.rightPressed = false;
  }

  handleTranscript(
    transcript: string,
    source: VoiceSource = "voice",
  ): CastCommandResult {
    const resolution = resolveVoiceIntent(
      transcript,
      this.waveIndex,
      this.learnedActions,
    );
    if (resolution.kind === "begin-wave") {
      if (this.startWaveEarly()) {
        this.setToast("言灵成立 · 提前迎敌！", 3);
        return {
          status: "executed",
          transcript,
          resolution,
          effectPosition: { x: CORE_X, y: this.coreGround() - 70 },
        };
      } else if (!this.needsStarterLessons()) {
        this.setToast("当前不是准备阶段。", 2);
      }
      return {
        status: "rejected",
        transcript,
        resolution,
        reason: this.needsStarterLessons()
          ? "请先完成首日三项必修"
          : "当前不是准备阶段",
      };
    }
    if (resolution.kind === "ambiguous") {
      const names = resolution.candidates
        .map((id) => CODEX_ACTIONS[id].english)
        .join(" / ");
      this.setToast(`词义不够明确：${names}`, 4);
      return {
        status: "rejected",
        transcript,
        resolution,
        reason: `词条有歧义：${names}`,
      };
    }
    if (resolution.kind === "unknown") {
      this.setToast("施法魔典没有回应这句话，墨水没有消耗。", 3);
      return {
        status: "rejected",
        transcript,
        resolution,
        reason: "施法魔典没有找到对应词条",
      };
    }
    const { actionId, quality } = resolution.intent;
    const definition = CODEX_ACTIONS[actionId];
    const cost = effectiveInkCost(actionId, quality, source);
    if (this.ink < cost) {
      this.setToast(`${definition.chinese}需要${cost}点墨水，瓶中不够。`, 3);
      return {
        status: "rejected",
        actionId,
        transcript,
        quality,
        resolution,
        reason: `墨水不足，需要${cost}点`,
      };
    }
    if (isStructureAction(definition)) {
      this.activeActionId = actionId;
      this.activeQuality = source === "text" ? "basic" : quality;
      this.activeSource = source;
      this.player.tool = "blade";
      this.setToast(
        `${definition.english} 已写入蓝图 · 右键选择位置`,
        4,
      );
      this.emitHud(true);
      return {
        status: "blueprint-ready",
        actionId,
        transcript,
        quality,
        resolution,
      };
    }
    if (isFoodAction(definition)) {
      const position = this.summonFood(
        actionId as FoodActionId,
        quality,
        source,
      );
      return {
        status: "executed",
        actionId,
        transcript,
        quality,
        resolution,
        effectPosition: position,
      };
    }
    if (isUnitAction(definition)) {
      const position = this.summonUnit(
        actionId as UnitActionId,
        quality,
        source,
      );
      return {
        status: "executed",
        actionId,
        transcript,
        quality,
        resolution,
        effectPosition: position,
      };
    }
    const position = this.castSpell(
      actionId as SpellActionId,
      quality,
      source,
    );
    if (!position) {
      return {
        status: "rejected",
        actionId,
        transcript,
        quality,
        resolution,
        reason: "没有合法目标，墨水没有消耗",
      };
    }
    return {
      status: "executed",
      actionId,
      transcript,
      quality,
      resolution,
      effectPosition: position,
    };
  }

  learnAction(actionId: ActionId, stars: number, silent = false): boolean {
    if (!this.started || !["prep", "intermission"].includes(this.phase)) {
      if (!silent) this.setToast("夜晚无法学习新言灵 · 等到黎明再打开施法魔典", 4);
      return false;
    }
    const definition = CODEX_ACTIONS[actionId];
    if (!canLearnCampaignAction(actionId, this.waveIndex)) {
      if (!silent) {
        this.setToast(
          `${definition.english} 要到第${definition.availableFromDay}个白昼才能学习`,
          4,
        );
      }
      return false;
    }
    const previous = this.learnedActions[actionId] ?? 0;
    const next = Math.max(
      previous,
      Math.max(1, Math.min(3, Math.round(stars))),
    );
    if (next === previous) return true;
    this.learnedActions[actionId] = next;
    const requiredComplete = this.hasRequiredStarterLessons();
    if (!silent && previous === 0) {
      this.callbacks.onSound("unlock");
      this.setToast(
        requiredComplete && REQUIRED_STARTER_ACTIONS.includes(
          actionId as (typeof REQUIRED_STARTER_ACTIONS)[number],
        )
          ? "首日必修 3/3 完成 · 150秒准备计时现在开始"
          : `${definition.english} 已学会 · 夜晚可用英语召唤`,
        4,
      );
    }
    this.save();
    this.emitHud(true);
    return true;
  }

  learnBookWord(
    english: string,
    stars: number,
    options: {
      actionId?: ActionId;
      sync?: boolean;
      newlyLearned?: boolean;
    } = {},
  ): boolean {
    return this.learnBookWordWithResult(english, stars, options).accepted;
  }

  learnBookWordWithResult(
    english: string,
    stars: number,
    options: {
      actionId?: ActionId;
      sync?: boolean;
      newlyLearned?: boolean;
    } = {},
  ): LearnBookWordResult {
    const silent = Boolean(options.sync);
    if (!this.started || !["prep", "intermission"].includes(this.phase)) {
      if (!silent) this.setToast("夜晚无法学习新言灵 · 等到黎明再打开施法魔典", 4);
      return {
        accepted: false,
        reason: "夜晚只能浏览，黎明后才能学习",
        dailyLessonsLearned: this.dailyLessonCount(),
        dailyLessonLimit: DAILY_LESSON_LIMIT,
      };
    }
    const actionId = options.actionId;
    if (
      actionId &&
      !canLearnCampaignAction(actionId, this.waveIndex)
    ) {
      if (!silent) {
        this.setToast(
          `${CODEX_ACTIONS[actionId].english} 要到第${CODEX_ACTIONS[actionId].availableFromDay}个白昼才能学习`,
          4,
        );
      }
      return {
        accepted: false,
        reason: `第${CODEX_ACTIONS[actionId].availableFromDay}个白昼开放`,
        dailyLessonsLearned: this.dailyLessonCount(),
        dailyLessonLimit: DAILY_LESSON_LIMIT,
      };
    }
    const dailyResult = recordDailyLesson(
      this.learningDay,
      english,
      !silent && Boolean(options.newlyLearned),
    );
    if (!dailyResult.accepted) {
      this.setToast("今日8个新词已经学满 · 下一次黎明继续", 4);
      this.emitHud(true);
      return {
        accepted: false,
        reason: "今日8个新词已经学满，下一次黎明继续",
        dailyLessonsLearned: this.dailyLessonCount(),
        dailyLessonLimit: DAILY_LESSON_LIMIT,
      };
    }
    if (actionId && !this.learnAction(actionId, stars, silent)) {
      return {
        accepted: false,
        reason: "这条战役言灵暂时无法学习",
        dailyLessonsLearned: this.dailyLessonCount(),
        dailyLessonLimit: DAILY_LESSON_LIMIT,
      };
    }
    const countsAsNew =
      dailyResult.state.learnedWordKeys.length >
      this.learningDay.learnedWordKeys.length;
    this.learningDay = dailyResult.state;
    if (countsAsNew) {
      if (!actionId) {
        this.callbacks.onSound("unlock");
        this.setToast(
          `${english} 已学会 · 今日学习 ${this.dailyLessonCount()}/${DAILY_LESSON_LIMIT}`,
          4,
        );
      }
    }
    if (dailyResult.state !== this.learningDay) {
      this.save();
      this.emitHud(true);
    }
    return {
      accepted: true,
      dailyLessonsLearned: this.dailyLessonCount(),
      dailyLessonLimit: DAILY_LESSON_LIMIT,
    };
  }

  resetLearnedActions(): void {
    if (!["prep", "intermission"].includes(this.phase)) return;
    this.learnedActions = {};
    this.learningDay = {
      dayIndex: this.waveIndex,
      learnedWordKeys: [],
      limit: DAILY_LESSON_LIMIT,
    };
    this.activeActionId = null;
    this.setToast("本轮战役的学习记录已重置。", 3);
    this.save();
    this.emitHud(true);
  }

  private summonFood(
    actionId: FoodActionId,
    quality: VoiceQuality,
    source: VoiceSource,
  ): { x: number; y: number } {
    const definition = CODEX_ACTIONS[actionId];
    if (!isFoodAction(definition)) {
      return { x: this.pointer.worldX, y: this.pointer.worldY };
    }
    if (this.heldFood) this.placeHeldFoodOnGround();
    const cost = effectiveInkCost(actionId, quality, source);
    this.heldFood = {
      actionId,
      power: qualityPower(quality, source),
    };
    this.ink -= cost;
    this.recordMastery(actionId, quality, source);
    this.callbacks.onSound("cast");
    this.setToast(
      `${definition.effect.emoji} ${definition.english} 已召唤 · 移动后点击或触碰屏幕投放`,
      4,
    );
    this.callbacks.onCastEffect?.({
      actionId,
      x: this.pointer.worldX,
      y: this.pointer.worldY,
      source,
    });
    this.save();
    this.emitHud(true);
    return { x: this.pointer.worldX, y: this.pointer.worldY };
  }

  private foodAtPointer(): FoodState | undefined {
    let closest: FoodState | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const food of this.foods) {
      const dx = food.x - this.pointer.worldX;
      const dy = food.y - this.pointer.worldY;
      const distance = dx * dx + dy * dy;
      if (distance > 18 * 18 || distance >= closestDistance) continue;
      closest = food;
      closestDistance = distance;
    }
    return closest;
  }

  private pickUpFood(): boolean {
    const food = this.foodAtPointer();
    if (!food) return false;
    this.foods = this.foods.filter((entry) => entry.id !== food.id);
    this.heldFood = {
      actionId: food.actionId,
      power: food.power,
    };
    const definition = CODEX_ACTIONS[food.actionId];
    this.setToast(
      `${definition.chinese}已拿起 · ${
        isFoodAction(definition) && definition.effect.supplyType === "drink"
          ? "移到玩家身上后松开"
          : "移到受伤单位上方后松开"
      }`,
      3,
    );
    this.save();
    this.emitHud(true);
    return true;
  }

  private placeHeldFoodOnGround(): void {
    if (!this.heldFood) return;
    const x = Math.max(
      10,
      Math.min(WORLD_WIDTH * TILE_SIZE - 10, this.pointer.worldX),
    );
    this.foods.push({
      id: this.nextEntityId++,
      actionId: this.heldFood.actionId,
      x,
      y: this.groundAt(x) - 11,
      power: this.heldFood.power,
    });
    this.heldFood = null;
  }

  private releaseHeldFood(): void {
    if (!this.heldFood) return;
    const held = this.heldFood;
    const foodRect = {
      x: this.pointer.worldX - 12,
      y: this.pointer.worldY - 12,
      width: 24,
      height: 24,
    };
    const target = this.archers
      .filter((unit) =>
        rectsOverlap(foodRect, {
          x: unit.x - 4,
          y: unit.y - 4,
          width: this.unitWidth(unit) + 8,
          height: this.unitHeight(unit) + 8,
        }),
      )
      .sort(
        (left, right) =>
          left.health / left.maxHealth - right.health / right.maxHealth,
      )[0];
    const definition = CODEX_ACTIONS[held.actionId];
    const playerTargeted = rectsOverlap(foodRect, {
      x: this.player.x - 6,
      y: this.player.y - 6,
      width: PLAYER_WIDTH + 12,
      height: PLAYER_HEIGHT + 12,
    });
    if (
      isFoodAction(definition) &&
      definition.effect.supplyType === "drink" &&
      playerTargeted
    ) {
      const addedBonus = Math.min(
        MAX_NIGHT_INK_REGEN_BONUS - this.nightInkRegenBonus,
        definition.effect.nightInkRegen * held.power,
      );
      this.nightInkRegenBonus = Math.min(
        MAX_NIGHT_INK_REGEN_BONUS,
        this.nightInkRegenBonus +
          definition.effect.nightInkRegen * held.power,
      );
      this.nightInkRegenRemaining = Math.max(
        this.nightInkRegenRemaining,
        definition.effect.duration,
      );
      this.heldFood = null;
      const centerX = this.player.x + PLAYER_WIDTH / 2;
      const centerY = this.player.y + PLAYER_HEIGHT / 2;
      this.callbacks.onSound("pickup");
      this.burst(centerX, centerY, "#c9a7ff", 16);
      this.setToast(
        addedBonus > 0.005
          ? `${definition.effect.emoji} 夜晚回墨 +${addedBonus.toFixed(2)}/秒 · ${Math.ceil(this.nightInkRegenRemaining)}秒`
          : `${definition.effect.emoji} 夜晚回墨已达上限 · 持续时间已刷新`,
        4,
      );
    } else if (
      target &&
      target.health < target.maxHealth &&
      isFoodAction(definition) &&
      definition.effect.supplyType === "food"
    ) {
      const healing = Math.min(
        target.maxHealth - target.health,
        Math.round(definition.effect.healing * held.power),
      );
      target.health += healing;
      this.heldFood = null;
      const centerX = target.x + this.unitWidth(target) / 2;
      const centerY = target.y + this.unitHeight(target) / 2;
      this.callbacks.onSound("pickup");
      this.burst(centerX, centerY, "#8ff0ad", 12);
      this.setToast(
        `${definition.effect.emoji} ${CODEX_ACTIONS[this.unitAction(target)].chinese}恢复 ${healing} 点生命`,
        3,
      );
    } else {
      this.placeHeldFoodOnGround();
      this.setToast(
        isFoodAction(definition) && definition.effect.supplyType === "drink"
          ? "饮品需投给玩家自身 · 已放在地上，可再次拿起"
          : target
            ? "这个单位生命已满 · 食物已经放在地上"
            : "食物已经放在地上 · 点击可再次拿起",
        3,
      );
    }
    this.save();
    this.emitHud(true);
  }

  private summonUnit(
    actionId: UnitActionId,
    quality: VoiceQuality,
    source: VoiceSource,
  ): { x: number; y: number } {
    const definition = CODEX_ACTIONS[actionId];
    if (!isUnitAction(definition)) {
      return { x: this.player.x, y: this.player.y };
    }
    const cost = effectiveInkCost(actionId, quality, source);
    const isArcher = actionId === "archer";
    const occupiedTowerIds = new Set(
      this.archers
        .filter((unit) => this.unitAction(unit) === "archer")
        .map((archer) => archer.towerId)
        .filter((id): id is number => id !== null),
    );
    const tower = isArcher
      ? this.structures
          .filter(
            (structure) =>
              structure.actionId === "tower" &&
              !occupiedTowerIds.has(structure.id),
          )
          .sort(
            (left, right) =>
              Math.abs(left.x - CORE_X) - Math.abs(right.x - CORE_X),
          )[0]
      : undefined;
    const power = qualityPower(quality, source);
    const id = this.nextEntityId++;
    const towerRect = tower ? this.structureRect(tower) : null;
    const width = isArcher ? ARCHER_SIZE : SOLDIER_WIDTH;
    const height = isArcher ? ARCHER_SIZE : SOLDIER_HEIGHT;
    const x = towerRect
      ? towerRect.x + towerRect.width / 2 - ARCHER_SIZE / 2
      : CORE_X + (id % 2 === 0 ? -1 : 1) * (42 + (id % 4) * 18);
    const maxHealth = Math.round(definition.effect.maxHealth * power);
    const unit: ArcherState = {
      id,
      actionId,
      x,
      y: towerRect
        ? towerRect.y + 3
        : this.groundAt(x + width / 2) - height,
      health: maxHealth,
      maxHealth,
      towerId: tower?.id ?? null,
      nextAttackAt: this.elapsed + 0.3,
      facing: 1,
      patrolDirection: id % 2 === 0 ? -1 : 1,
      power,
      shotCount: 0,
      animationTimer: 0,
      hurtTimer: 0,
    };
    this.archers.push(unit);
    this.ink -= cost;
    this.recordMastery(actionId, quality, source);
    this.callbacks.onSound("cast");
    this.burst(
      x + width / 2,
      this.groundAt(x + width / 2) - height / 2,
      definition.color,
      14,
    );
    this.setToast(
      isArcher
        ? tower
          ? `弓箭手已进入塔楼射击位 · 消耗${cost}点墨水`
          : `塔位已满 · 弓箭手开始在书台外巡逻 · 消耗${cost}点墨水`
        : `${definition.chinese}已抵达草地防线 · 消耗${cost}点墨水`,
      4,
    );
    this.save();
    this.emitHud(true);
    const effectPosition = {
      x: x + width / 2,
      y: unit.y + height / 2,
    };
    this.callbacks.onCastEffect?.({
      actionId,
      ...effectPosition,
      source,
    });
    return effectPosition;
  }

  startWaveEarly(): boolean {
    if (!this.started || !["prep", "intermission"].includes(this.phase)) {
      return false;
    }
    if (this.needsStarterLessons()) {
      this.setToast(
        `第一夜尚未开放 · 先完成首日必修 ${this.starterLessonCount()}/${REQUIRED_STARTER_ACTIONS.length}`,
        4,
      );
      return false;
    }
    this.beginWave();
    return true;
  }

  update(dt: number): void {
    if (!this.started || this.paused) return;
    this.elapsed += dt;
    this.autosaveTimer += dt;
    this.hudTimer += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.toastTimer === 0) this.toast = null;

    if (
      (this.phase === "prep" || this.phase === "intermission") &&
      !this.needsStarterLessons()
    ) {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      if (this.phaseTimer <= 0) this.beginWave();
    } else if (this.phase === "wave") {
      this.waveElapsed += dt;
      this.spawnDueEnemies();
    }

    this.updateNightInkRegeneration(dt);
    this.updatePlayer(dt);
    this.updateStructures(dt);
    this.updateArchers(dt);
    this.updateEnemies(dt);
    this.updateInkDrops(dt);
    this.updateVisuals(dt);
    this.updateCamera(dt);

    if (
      this.phase === "wave" &&
      this.spawnCursor >= this.waveSchedule.length &&
      this.enemies.length === 0
    ) {
      this.completeWave();
    }

    if (this.coreHealth <= 0 && this.phase !== "defeat") {
      this.phase = "defeat";
      this.paused = true;
      this.activeActionId = null;
      this.callbacks.onSound("lose");
      this.save();
    }

    if (this.autosaveTimer >= 5) {
      this.autosaveTimer = 0;
      this.save();
    }
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.emitHud();
    }

    if (!this.terminalEmitted && this.phase === "victory") {
      this.terminalEmitted = true;
      this.callbacks.onWin();
    }
    if (!this.terminalEmitted && this.phase === "defeat") {
      this.terminalEmitted = true;
      this.callbacks.onLose();
    }
  }

  private updateNightInkRegeneration(dt: number): void {
    if (
      this.phase !== "wave" ||
      this.nightInkRegenBonus <= 0 ||
      this.nightInkRegenRemaining <= 0
    ) {
      return;
    }
    const activeSeconds = Math.min(dt, this.nightInkRegenRemaining);
    this.nightInkRegenRemaining = Math.max(
      0,
      this.nightInkRegenRemaining - activeSeconds,
    );
    if (this.ink < MAX_INK) {
      this.nightInkRegenAccumulator +=
        this.nightInkRegenBonus * activeSeconds;
      const restored = Math.floor(this.nightInkRegenAccumulator);
      if (restored > 0) {
        this.ink = Math.min(MAX_INK, this.ink + restored);
        this.nightInkRegenAccumulator -= restored;
      }
    } else {
      this.nightInkRegenAccumulator = 0;
    }
    if (this.nightInkRegenRemaining <= 0) {
      this.nightInkRegenBonus = 0;
      this.nightInkRegenAccumulator = 0;
    }
  }

  private beginWave(): void {
    if (this.waveIndex < 0 || this.waveIndex >= WAVE_DEFINITIONS.length) return;
    if (this.needsStarterLessons()) return;
    this.phase = "wave";
    this.phaseTimer = 0;
    this.waveElapsed = 0;
    this.waveSchedule = createWaveSchedule(this.waveIndex, this.seed);
    this.spawnCursor = 0;
    this.callbacks.onSound(this.waveIndex === 5 ? "boss" : "wave");
    this.setToast(
      `夜幕降临 · ${WAVE_DEFINITIONS[this.waveIndex].title} · 召唤门已经开启，施法魔典停止新课`,
      5,
    );
    this.emitHud(true);
    this.save();
  }

  private completeWave(): void {
    const recovered = Math.floor(
      this.inkDrops.reduce((sum, drop) => sum + drop.amount, 0) * 0.7,
    );
    if (recovered > 0) this.ink = Math.min(MAX_INK, this.ink + recovered);
    this.inkDrops = [];
    if (this.waveIndex >= WAVE_DEFINITIONS.length - 1) {
      this.phase = "victory";
      this.activeActionId = null;
      this.callbacks.onSound("win");
      this.setToast("最终恶魔倒下，邪恶法师的召唤门正在关闭。", 6);
      this.emitHud(true);
      this.save();
      return;
    }
    this.waveIndex += 1;
    this.unlockedTier = Math.min(5, this.waveIndex);
    this.learningDay = {
      dayIndex: this.waveIndex,
      learnedWordKeys: [],
      limit: DAILY_LESSON_LIMIT,
    };
    this.phase = "intermission";
    this.phaseTimer = 90;
    this.waveElapsed = 0;
    this.spawnCursor = 0;
    this.waveSchedule = [];
    this.callbacks.onSound("unlock");
    this.callbacks.onBookUnlock(this.unlockedTier);
    this.setToast(
      `黎明到来 · 第${this.waveIndex + 1}个白昼可学习新词 · 下一夜怪物继续增强`,
      5,
    );
    this.emitHud(true);
    this.save();
  }

  private spawnDueEnemies(): void {
    while (
      this.spawnCursor < this.waveSchedule.length &&
      this.waveSchedule[this.spawnCursor].at <= this.waveElapsed &&
      this.enemies.filter((enemy) => enemy.kind !== "sky-devourer").length <
        MAX_ACTIVE_ENEMIES
    ) {
      const instruction = this.waveSchedule[this.spawnCursor];
      this.spawnCursor += 1;
      this.spawnEnemy(instruction);
    }
  }

  private spawnEnemy(instruction: SpawnInstruction): void {
    const definition = ENEMY_DEFINITIONS[instruction.kind];
    const scaling = getWaveScaling(this.waveIndex);
    const id = this.nextEntityId++;
    const isLeft = instruction.direction.endsWith("left");
    const topSpawn =
      instruction.direction === "air-top" ||
      instruction.kind === "sky-devourer";
    const x = topSpawn
      ? CORE_X + ((id * 83) % 520) - 260
      : isLeft
        ? 35
        : WORLD_PIXEL_WIDTH - 35;
    const localGround = this.groundAt(x + definition.width / 2);
    const y =
      definition.movement === "walker" || definition.movement === "jumper"
        ? localGround - definition.height
        : topSpawn
          ? localGround - (instruction.kind === "sky-devourer" ? 230 : 250)
          : localGround - 130 - (id % 3) * 22;
    const enemy: EnemyState = {
      id,
      kind: instruction.kind,
      direction: instruction.direction,
      resistance: instruction.resistance,
      x,
      y,
      vx: 0,
      vy: 0,
      health: Math.round(definition.health * scaling.healthMultiplier),
      maxHealth: Math.round(definition.health * scaling.healthMultiplier),
      damage: definition.damage * scaling.damageMultiplier,
      speed: definition.speed * scaling.speedMultiplier,
      nextAttackAt: this.elapsed + 0.8,
      slowedUntil: 0,
      frozenUntil: 0,
      hurtTimer: 0,
      animationState: "idle",
      animationTimer: 0,
      diveState: "approach",
      diveTimer: instruction.kind === "diver" ? 1.6 : 0,
      siegeColumnX: null,
      siegeLayer: null,
    };
    this.enemies.push(enemy);
    this.warnings.push({
      direction: instruction.direction,
      x,
      y,
      life: 1.2,
      maxLife: 1.2,
    });
  }

  private updatePlayer(dt: number): void {
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.attackAnimation = Math.max(0, this.player.attackAnimation - dt);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    if (this.player.respawnTimer > 0) {
      this.player.respawnTimer = Math.max(0, this.player.respawnTimer - dt);
      if (this.player.respawnTimer === 0) this.respawnPlayer();
      return;
    }
    if (this.phase === "victory" || this.phase === "defeat") return;

    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const direction = Number(right) - Number(left);
    this.player.vx += (direction * PLAYER_SPEED - this.player.vx) * Math.min(1, dt * 12);
    if (direction !== 0) this.player.facing = direction < 0 ? -1 : 1;
    if (
      (this.keys.has("Space") || this.keys.has("KeyW") || this.keys.has("ArrowUp")) &&
      this.player.onGround
    ) {
      this.player.vy = -JUMP_SPEED;
      this.player.onGround = false;
    }

    this.movePlayerHorizontal(this.player.vx * dt);
    this.player.vy = Math.min(360, this.player.vy + GRAVITY * dt);
    this.movePlayerVertical(this.player.vy * dt);
  }

  private movePlayerHorizontal(amount: number): void {
    const followsTerrain =
      this.player.onGround &&
      Math.abs(
        this.player.y +
          PLAYER_HEIGHT -
          this.groundAt(this.player.x + PLAYER_WIDTH / 2),
      ) <= 3;
    this.player.x = Math.max(
      TILE_SIZE,
      Math.min(WORLD_PIXEL_WIDTH - TILE_SIZE - PLAYER_WIDTH, this.player.x + amount),
    );
    if (followsTerrain) {
      this.player.y =
        this.groundAt(this.player.x + PLAYER_WIDTH / 2) - PLAYER_HEIGHT;
    }
  }

  private movePlayerVertical(amount: number): void {
    this.player.y += amount;
    this.player.onGround = false;
    const localGround = this.groundAt(this.player.x + PLAYER_WIDTH / 2);
    if (this.player.y + PLAYER_HEIGHT >= localGround) {
      this.player.y = localGround - PLAYER_HEIGHT;
      this.player.vy = 0;
      this.player.onGround = true;
    }
  }

  private tryMeleeAttack(): void {
    if (this.player.attackCooldown > 0 || this.player.respawnTimer > 0) return;
    this.player.attackCooldown = 0.45;
    this.player.attackAnimation = 0.18;
    this.callbacks.onSound("swing");
    const centerX = this.player.x + PLAYER_WIDTH / 2;
    const centerY = this.player.y + PLAYER_HEIGHT * 0.48;
    const pointerDirection = this.pointer.worldX < centerX ? -1 : 1;
    this.player.facing = pointerDirection;
    const hit: EnemyState[] = [];
    for (const enemy of this.enemies) {
      const definition = ENEMY_DEFINITIONS[enemy.kind];
      const dx = enemy.x + definition.width / 2 - centerX;
      const dy = enemy.y + definition.height / 2 - centerY;
      if (
        dx * pointerDirection >= -5 &&
        dx * pointerDirection <= TILE_SIZE * 2.4 &&
        Math.abs(dy) <= 38
      ) {
        hit.push(enemy);
      }
    }
    if (hit.length === 0) return;
    for (const enemy of hit) {
      this.damageEnemy(enemy, 16, "physical");
      const resist = this.waveIndex >= 3 ? 0.85 : 1;
      enemy.x += pointerDirection * 18 * resist;
      enemy.hurtTimer = 0.18;
    }
    this.player.health = Math.max(
      0,
      this.player.health - meleeHealthCost(hit.length),
    );
    this.callbacks.onSound("hit");
    this.burst(centerX + pointerDirection * 30, centerY, "#f5dfb1", 8);
    if (this.player.health <= 0) this.killPlayer();
    this.emitHud(true);
  }

  private tryDismantle(): void {
    const target = this.structureAt(this.pointer.worldX, this.pointer.worldY);
    if (!target || !this.withinReach(this.pointer.worldX, this.pointer.worldY)) {
      this.setToast("工匠锤没有碰到建造范围内的建筑。", 2);
      return;
    }
    const cost = CODEX_ACTIONS[target.actionId].inkCost;
    const refund =
      this.phase === "prep" || this.phase === "intermission"
        ? Math.floor(cost * 0.5)
        : 0;
    target.shieldUntil = 0;
    this.damageStructure(target, Number.MAX_SAFE_INTEGER);
    this.ink = Math.min(MAX_INK, this.ink + refund);
    this.setToast(
      refund > 0 ? `已拆除 · 回收${refund}点墨水` : "战斗中拆除，没有回收墨水",
      3,
    );
    this.save();
    this.emitHud(true);
  }

  private tryCommitActiveAction(): void {
    if (!this.activeActionId) return;
    const definition = CODEX_ACTIONS[this.activeActionId];
    if (!isStructureAction(definition)) return;
    const preview = this.getPlacementPreview(definition);
    if (!preview.ok) {
      this.setToast(preview.reason ?? "这里无法放置。", 2.5);
      return;
    }
    const cost = effectiveInkCost(
      definition.id,
      this.activeQuality,
      this.activeSource,
    );
    if (this.ink < cost) {
      this.setToast(`墨水不足，需要${cost}点。`, 2.5);
      this.activeActionId = null;
      return;
    }
    const power = qualityPower(this.activeQuality, this.activeSource);
    const maxHealth = Math.round(definition.effect.maxHealth * power);
    const placed: StructureState = {
      id: this.nextEntityId++,
      actionId: definition.id as StructureActionId,
      x: preview.x,
      y: preview.y,
      health: maxHealth,
      maxHealth,
      nextActionAt: this.elapsed + 0.3,
      shieldUntil: 0,
      power,
      shotCount: 0,
    };
    this.structures.push(placed);
    this.ink -= cost;
    this.recordMastery(definition.id, this.activeQuality, this.activeSource);
    this.activeActionId = null;
    this.callbacks.onSound("place");
    this.burst(
      preview.x + preview.width / 2,
      preview.y + preview.height / 2,
      definition.color,
      16,
    );
    this.setToast(`${definition.chinese}已落成 · 消耗${cost}点墨水`, 3);
    this.callbacks.onCastEffect?.({
      actionId: definition.id,
      x: preview.x + preview.width / 2,
      y: preview.y + preview.height / 2,
      source: this.activeSource,
    });
    this.save();
    this.emitHud(true);
  }

  private getPlacementPreview(
    definition: CodexActionDefinition & { effect: StructureEffectDefinition },
  ): PlacementPreview {
    const width = definition.effect.footprint.width * TILE_SIZE;
    const height = definition.effect.footprint.height * TILE_SIZE;
    const x = Math.round((this.pointer.worldX - width / 2) / TILE_SIZE) * TILE_SIZE;
    const terrainSupport = this.groundForFootprint(x, width);
    let y = terrainSupport.supportY - height;
    if (definition.effect.placement !== "ground") {
      const support = this.structures
        .map((structure) => this.structureRect(structure))
        .filter((candidate) => {
          const overlap =
            Math.min(x + width, candidate.x + candidate.width) -
            Math.max(x, candidate.x);
          return definition.effect.placement === "flat-surface"
            ? candidate.x <= x + 1 &&
                candidate.x + candidate.width >= x + width - 1
            : overlap >= Math.min(TILE_SIZE, width) - 1;
        })
        .sort(
          (left, right) =>
            Math.abs(left.y - this.pointer.worldY) -
            Math.abs(right.y - this.pointer.worldY),
        )[0];
      if (
        support &&
        this.pointer.worldY < terrainSupport.minimum - 5 &&
        Math.abs(support.y - this.pointer.worldY) <=
          Math.max(height, TILE_SIZE * 3)
      ) {
        y = support.y - height;
      } else if (
        this.pointer.worldY < terrainSupport.minimum - height - 5
      ) {
        y =
          Math.round((this.pointer.worldY - height / 2) / TILE_SIZE) *
          TILE_SIZE;
      }
    }
    y = Math.max(
      TILE_SIZE * 6,
      Math.min(terrainSupport.supportY - height, y),
    );
    const preview: PlacementPreview = { ok: false, x, y, width, height };
    if (!this.withinReach(x + width / 2, y + height / 2)) {
      return { ...preview, reason: "超出建造范围 · 先走近一些" };
    }
    if (x < TILE_SIZE || x + width > WORLD_PIXEL_WIDTH - TILE_SIZE) {
      return { ...preview, reason: "世界边缘无法建造" };
    }
    const rect = { x, y, width, height };
    const coreGround = this.coreGround();
    const coreRect = {
      x: CORE_X - 28,
      y: coreGround - 84,
      width: 56,
      height: 84,
    };
    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    };
    if (rectsOverlap(rect, coreRect)) {
      return { ...preview, reason: "不能覆盖中央言灵封印" };
    }
    if (this.player.respawnTimer <= 0 && rectsOverlap(rect, playerRect)) {
      return { ...preview, reason: "不能把建筑放在玩家身上" };
    }
    if (
      this.structures.some((structure) =>
        rectsOverlap(rect, this.structureRect(structure)),
      )
    ) {
      return { ...preview, reason: "这里已有其他建筑" };
    }
    if (
      this.enemies.some((enemy) => {
        const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
        return rectsOverlap(rect, {
          x: enemy.x,
          y: enemy.y,
          width: enemyDefinition.width,
          height: enemyDefinition.height,
        });
      })
    ) {
      return { ...preview, reason: "敌人占据了这个位置" };
    }
    if (
      this.archers.some((archer) =>
        rectsOverlap(rect, {
          x: archer.x,
          y: archer.y,
          width: 12,
          height: 27,
        }),
      )
    ) {
      return { ...preview, reason: "弓箭手占据了这个位置" };
    }
    const elevated = y + height < terrainSupport.minimum - 1;
    if (!elevated) {
      const variationLimit =
        definition.effect.role === "tower" ||
        definition.effect.role === "trap" ||
        definition.effect.placement === "flat-surface"
          ? 4
          : 8;
      if (terrainSupport.variation > variationLimit) {
        return {
          ...preview,
          reason:
            variationLimit === 4
              ? "炮台和陷阱需要更平整的地面"
              : "这里的坡度太大，建筑无法站稳",
        };
      }
    }
    if (elevated) {
      const supports = this.structures
        .map((structure) => this.structureRect(structure))
        .filter((support) => Math.abs(support.y - (y + height)) <= 1);
      const supported =
        definition.effect.placement === "flat-surface"
          ? supports.some(
              (support) =>
                support.x <= x + 1 &&
                support.x + support.width >= x + width - 1,
            )
          : supports.some(
              (support) =>
                Math.min(x + width, support.x + support.width) -
                  Math.max(x, support.x) >=
                TILE_SIZE - 1,
            );
      if (!supported) {
        return {
          ...preview,
          reason:
            definition.effect.placement === "flat-surface"
              ? "炮台需要足够宽的水平支撑"
              : "建筑下方缺少支撑",
        };
      }
    }
    return { ...preview, ok: true };
  }

  private castSpell(
    actionId: Exclude<ActionId, StructureActionId>,
    quality: VoiceQuality,
    source: VoiceSource,
  ): { x: number; y: number } | null {
    const definition = CODEX_ACTIONS[actionId];
    const effect = definition.effect as SpellEffectDefinition;
    const cost = effectiveInkCost(actionId, quality, source);
    const power = qualityPower(quality, source);
    let applied = false;
    if (effect.role === "heal-player") {
      if (this.player.respawnTimer <= 0 && this.player.health < this.player.maxHealth) {
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + effect.power * power,
        );
        applied = true;
      } else {
        this.setToast("当前不需要生命药水。", 2.5);
      }
    } else if (effect.role === "shield") {
      const target = this.nearestStructureToPointer(TILE_SIZE * 3);
      if (target) {
        target.shieldUntil = Math.max(
          target.shieldUntil,
          this.elapsed + effect.duration * power,
        );
      } else {
        this.playerShieldUntil = Math.max(
          this.playerShieldUntil,
          this.elapsed + effect.duration * power,
        );
      }
      applied = true;
    } else if (effect.role === "sanctuary") {
      this.coreHealth = Math.min(
        CORE_MAX_HEALTH,
        this.coreHealth + effect.power * power,
      );
      this.coreShieldUntil = this.elapsed + effect.duration * power;
      for (const structure of this.structures) {
        if (Math.abs(structure.x - CORE_X) <= effect.radiusTiles * TILE_SIZE) {
          structure.shieldUntil = this.elapsed + effect.duration * power;
        }
      }
      applied = true;
      this.burst(CORE_X, this.coreGround() - 70, definition.color, 36);
    } else {
      const target = this.nearestEnemyToPointer(
        effect.role === "meteor" ? TILE_SIZE * 8 : TILE_SIZE * 5,
      );
      if (!target) {
        this.setToast("鼠标附近没有可以承受这句言灵的敌人。", 3);
        return null;
      }
      if (effect.role === "fireball" || effect.role === "meteor") {
        const radius = effect.radiusTiles * TILE_SIZE;
        for (const enemy of this.enemies) {
          if (
            Math.hypot(enemy.x - target.x, enemy.y - target.y) <= radius
          ) {
            this.damageEnemy(enemy, effect.power * power, "magic");
          }
        }
        if (effect.role === "fireball") {
          const targetDefinition = ENEMY_DEFINITIONS[target.kind];
          this.projectiles.push({
            x: this.player.x + PLAYER_WIDTH / 2,
            y: this.player.y + PLAYER_HEIGHT * 0.35,
            targetX: target.x + targetDefinition.width / 2,
            targetY: target.y + targetDefinition.height / 2,
            color: definition.color,
            life: 0.42,
            maxLife: 0.42,
            sprite: "fire",
          });
        }
        this.spawnExplosion(
          target.x + ENEMY_DEFINITIONS[target.kind].width / 2,
          target.y + ENEMY_DEFINITIONS[target.kind].height / 2,
          effect.role === "meteor" ? 60 : 40,
        );
        this.burst(target.x, target.y, definition.color, effect.role === "meteor" ? 42 : 22);
      } else if (effect.role === "lightning") {
        this.damageEnemy(target, effect.power * power, "magic");
        this.projectiles.push({
          x: this.player.x + PLAYER_WIDTH / 2,
          y: this.player.y + 10,
          targetX: target.x,
          targetY: target.y,
          color: definition.color,
          life: 0.22,
          maxLife: 0.22,
          chained: true,
        });
      } else if (effect.role === "chain-lightning") {
        let current: EnemyState | undefined = target;
        const hit = new Set<number>();
        for (let jump = 0; jump < 5 && current; jump += 1) {
          hit.add(current.id);
          this.damageEnemy(current, effect.power * power * (1 - jump * 0.1), "magic");
          const next: EnemyState | undefined = this.enemies
            .filter(
              (enemy) =>
                !hit.has(enemy.id) &&
                Math.hypot(enemy.x - current!.x, enemy.y - current!.y) <=
                  effect.radiusTiles * TILE_SIZE,
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - current!.x, a.y - current!.y) -
                Math.hypot(b.x - current!.x, b.y - current!.y),
            )[0];
          if (next) {
            this.projectiles.push({
              x: current.x,
              y: current.y,
              targetX: next.x,
              targetY: next.y,
              color: definition.color,
              life: 0.25,
              maxLife: 0.25,
              chained: true,
            });
          }
          current = next;
        }
      }
      applied = true;
    }
    if (!applied) return null;
    this.ink -= cost;
    this.recordMastery(actionId, quality, source);
    this.callbacks.onSound("cast");
    this.setToast(`${definition.chinese}生效 · 消耗${cost}点墨水`, 3);
    this.save();
    this.emitHud(true);
    const effectPosition =
      effect.role === "sanctuary"
        ? { x: CORE_X, y: this.coreGround() - 70 }
        : effect.role === "heal-player"
          ? {
              x: this.player.x + PLAYER_WIDTH / 2,
              y: this.player.y + PLAYER_HEIGHT / 2,
            }
          : effect.role === "shield"
            ? {
                x: this.pointer.worldX,
                y: this.pointer.worldY,
              }
            : {
                x: this.pointer.worldX,
                y: this.pointer.worldY,
              };
    this.callbacks.onCastEffect?.({
      actionId,
      ...effectPosition,
      source,
    });
    return effectPosition;
  }

  private recordMastery(
    actionId: ActionId,
    quality: VoiceQuality,
    source: VoiceSource,
  ): void {
    const current = this.mastery[actionId] ?? {
      uses: 0,
      spokenUses: 0,
      fluentUses: 0,
    };
    current.uses += 1;
    if (source === "voice") current.spokenUses += 1;
    if (source === "voice" && quality === "fluent") current.fluentUses += 1;
    this.mastery[actionId] = current;
  }

  private updateStructures(_dt: number): void {
    for (const structure of [...this.structures]) {
      const definition = CODEX_ACTIONS[structure.actionId];
      if (!isStructureAction(definition)) continue;
      const effect = definition.effect;
      if (effect.role === "slow-aura") {
        for (const enemy of this.enemies) {
          if (
            Math.hypot(enemy.x - structure.x, enemy.y - structure.y) <=
            effect.rangeTiles * TILE_SIZE
          ) {
            enemy.slowedUntil = Math.max(enemy.slowedUntil, this.elapsed + 0.15);
          }
        }
        continue;
      }
      if (effect.role === "healing-aura") {
        if (structure.nextActionAt <= this.elapsed) {
          structure.nextActionAt = this.elapsed + effect.attackInterval;
          for (const other of this.structures) {
            if (
              Math.hypot(other.x - structure.x, other.y - structure.y) <=
              effect.rangeTiles * TILE_SIZE
            ) {
              other.health = Math.min(
                other.maxHealth,
                other.health + effect.damage * structure.power,
              );
            }
          }
          if (
            this.player.respawnTimer <= 0 &&
            Math.abs(this.player.x - structure.x) <= effect.rangeTiles * TILE_SIZE
          ) {
            this.player.health = Math.min(
              this.player.maxHealth,
              this.player.health + 1,
            );
          }
        }
        continue;
      }
      if (effect.role === "fortress-aura" || effect.damage <= 0) continue;
      if (structure.nextActionAt > this.elapsed) continue;
      const centerX = structure.x + effect.footprint.width * TILE_SIZE / 2;
      const centerY = structure.y + effect.footprint.height * TILE_SIZE / 2;
      const targets = this.enemies
        .filter((enemy) => {
          const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
          const isAir =
            enemyDefinition.movement === "flyer" ||
            enemyDefinition.movement === "diver";
          const classMatches =
            effect.target === "both" ||
            (effect.target === "air" && isAir) ||
            (effect.target === "ground" && !isAir);
          return (
            classMatches &&
            Math.hypot(enemy.x - centerX, enemy.y - centerY) <=
              effect.rangeTiles * TILE_SIZE
          );
        })
        .sort(
          (a, b) => Math.abs(a.x - CORE_X) - Math.abs(b.x - CORE_X),
        );
      if (targets.length === 0) continue;
      const count = structure.actionId === "ballista" ? Math.min(2, targets.length) : 1;
      for (let index = 0; index < count; index += 1) {
        const target = targets[index];
        const damageType =
          structure.actionId === "freeze-cannon" ? "frost" : effect.role === "trap" ? "trap" : "physical";
        this.damageEnemy(target, effect.damage * structure.power, damageType);
        this.projectiles.push({
          x: centerX,
          y: centerY - 8,
          targetX: target.x,
          targetY: target.y,
          color: definition.color,
          life: 0.28,
          maxLife: 0.28,
        });
        if (structure.actionId === "freeze-cannon") {
          structure.shotCount += 1;
          if (structure.shotCount % 4 === 0) {
            target.frozenUntil = Math.max(target.frozenUntil, this.elapsed + 1.2);
          }
        }
      }
      structure.nextActionAt = this.elapsed + effect.attackInterval;
    }

    for (const structure of this.structures) {
      const definition = CODEX_ACTIONS[structure.actionId];
      if (!isStructureAction(definition) || definition.effect.role !== "trap") continue;
      if (structure.nextActionAt > this.elapsed) continue;
      const rect = this.structureRect(structure);
      const target = this.enemies.find((enemy) => {
        const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
        if (
          enemyDefinition.movement === "flyer" ||
          enemyDefinition.movement === "diver"
        ) {
          return false;
        }
        return (
          enemy.x + enemyDefinition.width > rect.x &&
          enemy.x < rect.x + rect.width
        );
      });
      if (!target) continue;
      if (structure.actionId === "web-trap") {
        target.slowedUntil = Math.max(target.slowedUntil, this.elapsed + 3);
      }
      this.damageEnemy(target, definition.effect.damage * structure.power, "trap");
      structure.nextActionAt = this.elapsed + definition.effect.attackInterval;
    }
  }

  private updateArchers(dt: number): void {
    for (const archer of [...this.archers]) {
      const actionId = this.unitAction(archer);
      const definition = CODEX_ACTIONS[actionId];
      if (!isUnitAction(definition)) continue;
      archer.animationTimer = Math.max(0, (archer.animationTimer ?? 0) - dt);
      archer.hurtTimer = Math.max(0, (archer.hurtTimer ?? 0) - dt);
      let tower =
        archer.towerId === null
          ? undefined
          : this.structures.find(
              (structure) =>
                structure.id === archer.towerId &&
                structure.actionId === "tower",
            );
      if (actionId !== "archer") {
        archer.towerId = null;
        tower = undefined;
      }
      if (archer.towerId !== null && !tower) {
        archer.towerId = null;
        const width = this.unitWidth(archer);
        archer.y =
          this.groundAt(archer.x + width / 2) - this.unitHeight(archer);
        this.setToast("一座塔倒塌，弓箭手转为地面巡逻。", 3);
      }
      if (actionId === "archer" && archer.towerId === null) {
        const occupiedTowerIds = new Set(
          this.archers
            .filter((candidate) => candidate.id !== archer.id)
            .filter((candidate) => this.unitAction(candidate) === "archer")
            .map((candidate) => candidate.towerId)
            .filter((id): id is number => id !== null),
        );
        const availableTower = this.structures
          .filter(
            (structure) =>
              structure.actionId === "tower" &&
              !occupiedTowerIds.has(structure.id),
          )
          .sort(
            (left, right) =>
              Math.abs(left.x - archer.x) - Math.abs(right.x - archer.x),
          )[0];
        if (availableTower) {
          archer.towerId = availableTower.id;
          tower = availableTower;
          this.burst(
            availableTower.x + TILE_SIZE,
            availableTower.y - TILE_SIZE,
            definition.color,
            8,
          );
          this.setToast("发现空塔，巡逻弓箭手已自动登塔。", 2.5);
        }
      }
      if (tower) {
        this.positionArcherInTower(archer, tower);
      }

      const range =
        definition.effect.rangeTiles * TILE_SIZE *
        (actionId === "archer" && archer.towerId === null ? 0.72 : 1);
      const unitWidth = this.unitWidth(archer);
      const unitHeight = this.unitHeight(archer);
      const centerX = archer.x + unitWidth / 2;
      const centerY = archer.y + unitHeight / 2;
      const eligibleEnemies = this.enemies
        .filter((enemy) => {
          const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
          const isAir =
            enemyDefinition.movement === "flyer" ||
            enemyDefinition.movement === "diver";
          if (definition.effect.target === "ground" && isAir) return false;
          if (definition.effect.target === "air" && !isAir) return false;
          return (
            Math.hypot(
              enemy.x + enemyDefinition.width / 2 - centerX,
              enemy.y + enemyDefinition.height / 2 - centerY,
            ) <= (actionId === "archer" ? range : TILE_SIZE * 13)
          );
        });
      const target = eligibleEnemies
        .filter((enemy) => {
          const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
          return (
            Math.hypot(
              enemy.x + enemyDefinition.width / 2 - centerX,
              enemy.y + enemyDefinition.height / 2 - centerY,
            ) <= range
          );
        })
        .sort((left, right) => {
          const leftDefinition = ENEMY_DEFINITIONS[left.kind];
          const rightDefinition = ENEMY_DEFINITIONS[right.kind];
          const leftAir =
            leftDefinition.movement === "flyer" ||
            leftDefinition.movement === "diver";
          const rightAir =
            rightDefinition.movement === "flyer" ||
            rightDefinition.movement === "diver";
          if (actionId === "archer" && leftAir !== rightAir) {
            return leftAir ? -1 : 1;
          }
          if (actionId !== "archer") {
            return (
              Math.abs(left.x - centerX) - Math.abs(right.x - centerX)
            );
          }
          return Math.abs(left.x - CORE_X) - Math.abs(right.x - CORE_X);
        })[0];

      if (target) {
        archer.facing = target.x < centerX ? -1 : 1;
        if (archer.nextAttackAt <= this.elapsed) {
          archer.nextAttackAt =
            this.elapsed +
            definition.effect.attackInterval *
              (archer.towerId === null ? 1.18 : 1);
          this.damageEnemy(
            target,
            definition.effect.damage * archer.power,
            "physical",
          );
          if (actionId === "archer") {
            this.projectiles.push({
              x: centerX + archer.facing * 7,
              y: centerY - 2,
              targetX: target.x,
              targetY: target.y,
              color: definition.color,
              life: 0.3,
              maxLife: 0.3,
              sprite: "archer-arrow",
            });
          } else {
            this.burst(
              target.x + ENEMY_DEFINITIONS[target.kind].width / 2,
              target.y + ENEMY_DEFINITIONS[target.kind].height / 2,
              definition.color,
              actionId === "spearman" ? 8 : 6,
            );
          }
          archer.shotCount += 1;
          archer.animationTimer =
            actionId === "archer"
              ? 0.34
              : actionId === "swordsman"
                ? 0.38
                : actionId === "knight"
                  ? 0.42
                  : 0.46;
        }
        continue;
      }

      if (archer.towerId !== null) continue;
      const approachTarget = eligibleEnemies
        .sort(
          (left, right) =>
            Math.abs(left.x - centerX) - Math.abs(right.x - centerX),
        )[0];
      if (actionId !== "archer" && approachTarget) {
        const targetCenter =
          approachTarget.x + ENEMY_DEFINITIONS[approachTarget.kind].width / 2;
        archer.patrolDirection = targetCenter < centerX ? -1 : 1;
        archer.facing = archer.patrolDirection;
        archer.x +=
          archer.patrolDirection *
          (actionId === "swordsman"
            ? 28
            : actionId === "knight"
              ? 18
              : 23) *
          dt;
        archer.y =
          this.groundAt(archer.x + unitWidth / 2) - unitHeight;
        continue;
      }
      const patrolRadius = 185;
      const leftBound = CORE_X - patrolRadius;
      const rightBound = CORE_X + patrolRadius;
      if (archer.x <= leftBound) archer.patrolDirection = 1;
      if (archer.x >= rightBound) archer.patrolDirection = -1;
      archer.facing = archer.patrolDirection;
      archer.x +=
        archer.patrolDirection *
        (actionId === "archer"
          ? 21
          : actionId === "swordsman"
            ? 24
            : actionId === "knight"
              ? 17
              : 20) *
        dt;
      archer.y =
        this.groundAt(archer.x + unitWidth / 2) - unitHeight;
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of [...this.enemies]) {
      if (!this.enemies.includes(enemy)) continue;
      enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
      enemy.animationTimer = Math.max(0, (enemy.animationTimer ?? 0) - dt);
      if (enemy.hurtTimer > 0) enemy.animationState = "hit";
      else if ((enemy.animationTimer ?? 0) <= 0 && enemy.animationState === "attack") {
        enemy.animationState = Math.abs(enemy.vx) > 3 ? "run" : "idle";
      }
      if (enemy.frozenUntil > this.elapsed) continue;
      const definition = ENEMY_DEFINITIONS[enemy.kind];
      if (
        definition.movement !== "flyer" &&
        definition.movement !== "diver"
      ) {
        const tauntingKnight = this.archers
          .filter(
            (unit) =>
              this.unitAction(unit) === "knight" &&
              unit.towerId === null &&
              Math.abs(
                unit.x + this.unitWidth(unit) / 2 -
                  (enemy.x + definition.width / 2),
              ) <=
                TILE_SIZE * 3,
          )
          .sort(
            (left, right) =>
              Math.abs(left.x - enemy.x) - Math.abs(right.x - enemy.x),
          )[0];
        if (tauntingKnight) {
          const knightCenter =
            tauntingKnight.x + this.unitWidth(tauntingKnight) / 2;
          const enemyCenter = enemy.x + definition.width / 2;
          const contactDistance =
            definition.width / 2 + this.unitWidth(tauntingKnight) / 2;
          if (Math.abs(knightCenter - enemyCenter) > contactDistance) {
            const direction = knightCenter < enemyCenter ? -1 : 1;
            enemy.animationState = "run";
            enemy.vx +=
              (direction * enemy.speed - enemy.vx) * Math.min(1, dt * 8);
            enemy.x += enemy.vx * dt;
            enemy.y =
              this.groundAt(enemy.x + definition.width / 2) -
              definition.height;
            continue;
          }
        }
        const patrolTarget = tauntingKnight ?? this.archers.find(
          (archer) => {
            const unitWidth = this.unitWidth(archer);
            const unitHeight = this.unitHeight(archer);
            return (
              archer.towerId === null &&
              Math.abs(
                archer.x + unitWidth / 2 -
                  (enemy.x + definition.width / 2),
              ) <=
                definition.width / 2 + unitWidth / 2 &&
              Math.abs(
                archer.y + unitHeight / 2 -
                  (enemy.y + definition.height / 2),
              ) <
                Math.max(28, unitHeight / 2 + definition.height / 2)
            );
          },
        );
        if (patrolTarget) {
          enemy.vx *= 0.4;
          if (enemy.nextAttackAt <= this.elapsed) {
            enemy.nextAttackAt = this.elapsed + definition.attackInterval;
            this.damageArcher(patrolTarget, enemy.damage * 0.7);
          }
          continue;
        }
      }
      let speed = enemy.speed;
      if (enemy.slowedUntil > this.elapsed) speed *= 0.4;
      if (
        this.waveIndex >= 2 &&
        definition.movement !== "flyer" &&
        definition.movement !== "diver" &&
        enemy.health / enemy.maxHealth < 0.4
      ) {
        speed *= 1.15;
      }
      if (definition.movement === "flyer") {
        this.updateFlyingEnemy(enemy, speed, dt);
      } else if (definition.movement === "diver") {
        this.updateDiver(enemy, speed, dt);
      } else {
        this.updateGroundEnemy(enemy, speed, dt);
      }
      if (this.player.respawnTimer <= 0 && this.player.invulnerability <= 0) {
        const playerCenterX = this.player.x + PLAYER_WIDTH / 2;
        const playerCenterY = this.player.y + PLAYER_HEIGHT / 2;
        if (
          Math.abs(enemy.x + definition.width / 2 - playerCenterX) <
            (definition.width + PLAYER_WIDTH) / 2 &&
          Math.abs(enemy.y + definition.height / 2 - playerCenterY) <
            (definition.height + PLAYER_HEIGHT) / 2 &&
          enemy.nextAttackAt <= this.elapsed
        ) {
          this.damagePlayer(enemy.damage * 0.55, enemy.x < playerCenterX ? 1 : -1);
          enemy.nextAttackAt = this.elapsed + definition.attackInterval;
        }
      }
    }
  }

  private updateGroundEnemy(enemy: EnemyState, speed: number, dt: number): void {
    const definition = ENEMY_DEFINITIONS[enemy.kind];
    const side = enemy.x < CORE_X ? -1 : 1;
    const targetStructure = this.blockingStructureFor(enemy, side);
    const targetX = targetStructure
      ? targetStructure.x + (side < 0 ? 0 : this.structureRect(targetStructure).width)
      : CORE_X;
    const distance = Math.abs(enemy.x + definition.width / 2 - targetX);
    const ranged = enemy.kind === "spitter";
    const attackRange = ranged ? 145 : definition.width / 2 + 10;
    if (distance <= attackRange) {
      enemy.vx *= 0.5;
      enemy.animationState = "idle";
      if (enemy.nextAttackAt <= this.elapsed) {
        const frenzy =
          this.waveIndex >= 5 && Math.abs(enemy.x - CORE_X) <= 12 * TILE_SIZE
            ? 0.9
            : 1;
        enemy.nextAttackAt =
          this.elapsed + definition.attackInterval * frenzy;
        if (targetStructure) {
          const siege = enemy.kind === "sapper" ? 1.2 : 1;
          this.damageStructure(targetStructure, enemy.damage * siege);
        } else {
          this.damageCore(enemy.damage);
        }
        enemy.animationState = "attack";
        enemy.animationTimer = 0.36;
        if (ranged) {
          this.projectiles.push({
            x: enemy.x,
            y: enemy.y + 8,
            targetX,
            targetY: targetStructure?.y ?? this.coreGround() - 55,
            color: definition.color,
            life: 0.38,
            maxLife: 0.38,
          });
        }
      }
      return;
    }
    const direction = targetX > enemy.x ? 1 : -1;
    enemy.animationState = "run";
    enemy.vx += (direction * speed - enemy.vx) * Math.min(1, dt * 8);
    enemy.x += enemy.vx * dt;
    let vaultHeight = 0;
    const jumpable = this.jumpableStructureFor(enemy, side);
    if (jumpable) {
      const rect = this.structureRect(jumpable);
      const enemyCenter = enemy.x + definition.width / 2;
      const wallCenter = rect.x + rect.width / 2;
      const vaultWindow =
        rect.width / 2 + definition.width / 2 + TILE_SIZE * 0.8;
      const distanceFromWall = Math.abs(enemyCenter - wallCenter);
      if (distanceFromWall < vaultWindow) {
        const progress = 1 - distanceFromWall / vaultWindow;
        vaultHeight =
          Math.sin(progress * Math.PI * 0.5) *
          (this.blockingRows(jumpable) * TILE_SIZE + 7);
      }
    }
    enemy.y =
      this.groundAt(enemy.x + definition.width / 2) -
      definition.height -
      vaultHeight;
  }

  private updateFlyingEnemy(enemy: EnemyState, speed: number, dt: number): void {
    const definition = ENEMY_DEFINITIONS[enemy.kind];
    const offensive = this.structures
      .filter((structure) => {
        const action = CODEX_ACTIONS[structure.actionId];
        return isStructureAction(action) && action.effect.role === "tower";
      })
      .sort(
        (a, b) =>
          Math.hypot(enemy.x - a.x, enemy.y - a.y) -
          Math.hypot(enemy.x - b.x, enemy.y - b.y),
      )[0];
    const target =
      offensive &&
      Math.hypot(enemy.x - offensive.x, enemy.y - offensive.y) < 360
        ? { x: offensive.x, y: offensive.y, structure: offensive }
        : { x: CORE_X, y: this.coreGround() - 78, structure: undefined };
    if (enemy.kind === "sky-devourer") {
      const phase = enemy.health / enemy.maxHealth;
      target.x = CORE_X + Math.sin(this.elapsed * (phase < 0.4 ? 1.2 : 0.7)) * 185;
      target.y = this.coreGround() - (phase < 0.4 ? 105 : 165);
      if (phase < 0.7) speed *= 1.16;
      if (phase < 0.35 && Math.floor(this.elapsed) % 9 === 0 && this.enemies.length < MAX_ACTIVE_ENEMIES) {
        const hasRecent = this.enemies.some(
          (other) =>
            other.kind === "flyer" &&
            Math.abs(other.x - enemy.x) < 35 &&
            Math.abs(other.y - enemy.y) < 35,
        );
        if (!hasRecent) {
          enemy.animationState = "attack";
          enemy.animationTimer = 0.55;
          this.spawnEnemy({
            at: this.waveElapsed,
            kind: "flyer",
            direction: enemy.x < CORE_X ? "air-left" : "air-right",
            resistance: "none",
          });
        }
      }
    }
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (distance > 44) {
      enemy.x += (dx / distance) * speed * dt;
      enemy.y += (dy / distance) * speed * dt;
    } else if (enemy.nextAttackAt <= this.elapsed) {
      enemy.nextAttackAt = this.elapsed + definition.attackInterval;
      enemy.animationState = "attack";
      enemy.animationTimer = enemy.kind === "sky-devourer" ? 0.55 : 0.36;
      if (target.structure) this.damageStructure(target.structure, enemy.damage);
      else this.damageCore(enemy.damage);
      this.burst(target.x, target.y, definition.color, 8);
    }
  }

  private updateDiver(enemy: EnemyState, speed: number, dt: number): void {
    const definition = ENEMY_DEFINITIONS[enemy.kind];
    enemy.diveTimer -= dt;
    if (enemy.diveState === "approach") {
      const targetX = CORE_X + ((enemy.id * 47) % 360) - 180;
      enemy.x += Math.sign(targetX - enemy.x) * speed * 0.45 * dt;
      if (enemy.diveTimer <= 0) {
        enemy.diveState = "warning";
        enemy.diveTimer = 1.1;
        this.warnings.push({
          direction: "air-top",
          x: enemy.x,
          y: this.groundAt(enemy.x) - 10,
          life: 1.1,
          maxLife: 1.1,
        });
      }
      return;
    }
    if (enemy.diveState === "warning") {
      if (enemy.diveTimer <= 0) {
        enemy.diveState = "dive";
        enemy.vy = speed * 4.2;
      }
      return;
    }
    if (enemy.diveState === "dive") {
      enemy.y += enemy.vy * dt;
      const impactGround = this.groundAt(enemy.x + definition.width / 2);
      if (enemy.y + definition.height >= impactGround - 8) {
        const target = this.nearestStructure(enemy.x, impactGround, 70);
        if (target) this.damageStructure(target, enemy.damage * 1.2);
        else if (Math.abs(enemy.x - CORE_X) < 100) this.damageCore(enemy.damage);
        else if (this.player.respawnTimer <= 0 && Math.abs(enemy.x - this.player.x) < 75) {
          this.damagePlayer(enemy.damage, enemy.x < this.player.x ? 1 : -1);
        }
        this.burst(enemy.x, impactGround - 10, definition.color, 18);
        enemy.diveState = "recover";
        enemy.diveTimer = 1.2;
        enemy.vy = -speed * 2.2;
      }
      return;
    }
    enemy.y += enemy.vy * dt;
    enemy.vy += 80 * dt;
    if (enemy.diveTimer <= 0) {
      enemy.diveState = "approach";
      enemy.diveTimer = 2.2;
      enemy.y = Math.min(enemy.y, this.groundAt(enemy.x) - 190);
      enemy.vy = 0;
    }
  }

  private blockingStructureFor(
    enemy: EnemyState,
    side: number,
  ): StructureState | undefined {
    const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
    if (enemy.siegeColumnX !== null && enemy.siegeColumnX !== undefined) {
      const committedColumn = this.wallColumnAt(enemy.siegeColumnX);
      if (committedColumn.length > 0) {
        const requestedLayer = Math.max(
          1,
          Math.min(
            committedColumn.length,
            enemy.siegeLayer ?? ENEMY_WALL_ROWS[enemyDefinition.sizeClass],
          ),
        );
        enemy.siegeLayer = requestedLayer as 1 | 2 | 3;
        return committedColumn[requestedLayer - 1];
      }
      enemy.siegeColumnX = null;
      enemy.siegeLayer = null;
    }

    const candidates = this.structures.flatMap((structure) => {
      const definition = CODEX_ACTIONS[structure.actionId];
      if (!isStructureAction(definition) || !definition.effect.blocking) return [];
      const inPath = side < 0
        ? structure.x >= enemy.x && structure.x < CORE_X
        : structure.x <= enemy.x && structure.x > CORE_X;
      if (!inPath) return [];
      if (definition.effect.role !== "wall") return [structure];
      const column = this.wallStackFor(structure);
      if (column[0]?.id !== structure.id) return [];
      const requiredLayer = ENEMY_WALL_ROWS[enemyDefinition.sizeClass];
      if (column.length < requiredLayer) return [];
      return [column[requiredLayer - 1]];
    });
    const target = candidates.sort(
      (a, b) => Math.abs(enemy.x - a.x) - Math.abs(enemy.x - b.x),
    )[0];
    if (target) {
      const definition = CODEX_ACTIONS[target.actionId];
      if (
        isStructureAction(definition) &&
        definition.effect.role === "wall"
      ) {
        enemy.siegeColumnX = this.wallColumnX(target);
        enemy.siegeLayer = ENEMY_WALL_ROWS[
          enemyDefinition.sizeClass
        ] as 1 | 2 | 3;
      }
    }
    return target;
  }

  private jumpableStructureFor(
    enemy: EnemyState,
    side: number,
  ): StructureState | undefined {
    const enemyDefinition = ENEMY_DEFINITIONS[enemy.kind];
    if (enemy.siegeColumnX !== null && enemy.siegeColumnX !== undefined) {
      return undefined;
    }
    if (enemyDefinition.wallJumpRows <= 0) return undefined;
    return this.structures
      .filter((structure) => {
        const definition = CODEX_ACTIONS[structure.actionId];
        if (
          !isStructureAction(definition) ||
          !definition.effect.blocking ||
          definition.effect.role !== "wall"
        ) {
          return false;
        }
        const rows = this.blockingRows(structure);
        if (wallBlocksEnemy(rows, enemyDefinition.wallJumpRows)) return false;
        const rect = this.structureRect(structure);
        const margin = definition.effect.footprint.width * TILE_SIZE * 2;
        return side < 0
          ? rect.x + rect.width >= enemy.x - margin && rect.x < CORE_X
          : rect.x <= enemy.x + enemyDefinition.width + margin &&
              rect.x > CORE_X;
      })
      .sort((left, right) => {
        const leftRect = this.structureRect(left);
        const rightRect = this.structureRect(right);
        const center = enemy.x + enemyDefinition.width / 2;
        return (
          Math.abs(leftRect.x + leftRect.width / 2 - center) -
          Math.abs(rightRect.x + rightRect.width / 2 - center)
        );
      })[0];
  }

  private blockingRows(structure: StructureState): number {
    const definition = CODEX_ACTIONS[structure.actionId];
    if (!isStructureAction(definition)) return 0;
    const rect = this.structureRect(structure);
    if (definition.effect.role !== "wall") {
      return Math.max(1, Math.ceil(rect.height / TILE_SIZE));
    }
    return this.wallStackFor(structure).length;
  }

  private wallColumnX(structure: StructureState): number {
    return Math.round(structure.x / TILE_SIZE) * TILE_SIZE;
  }

  /** Returns the contiguous wall group containing the supplied segment, ground-up. */
  private wallStackFor(structure: StructureState): StructureState[] {
    const columnX = this.wallColumnX(structure);
    const wallSegments = this.wallColumnAt(columnX);
    const structureIndex = wallSegments.findIndex(
      (candidate) => candidate.id === structure.id,
    );
    if (structureIndex < 0) return [];
    let first = structureIndex;
    let last = structureIndex;
    while (
      first > 0 &&
      Math.abs(
        this.structureRect(wallSegments[first - 1]).y -
          (this.structureRect(wallSegments[first]).y + TILE_SIZE),
      ) <= 1
    ) {
      first -= 1;
    }
    while (
      last < wallSegments.length - 1 &&
      Math.abs(
        this.structureRect(wallSegments[last]).y -
          (this.structureRect(wallSegments[last + 1]).y + TILE_SIZE),
      ) <= 1
    ) {
      last += 1;
    }
    return wallSegments.slice(first, last + 1);
  }

  /** All wall segments in one grid column, sorted from ground toward the sky. */
  private wallColumnAt(columnX: number): StructureState[] {
    return this.structures
      .filter((structure) => {
        const definition = CODEX_ACTIONS[structure.actionId];
        return (
          isStructureAction(definition) &&
          definition.effect.role === "wall" &&
          Math.abs(this.wallColumnX(structure) - columnX) <= 1
        );
      })
      .sort((left, right) => right.y - left.y);
  }

  private damageEnemy(
    enemy: EnemyState,
    amount: number,
    kind: "physical" | "trap" | "frost" | "magic",
  ): void {
    if (!this.enemies.includes(enemy)) return;
    const resistance = enemy.resistance === kind ? 0.8 : 1;
    enemy.health -= amount * resistance;
    enemy.hurtTimer = 0.16;
    enemy.animationState = "hit";
    const color = DAMAGE_KINDS[kind].color;
    this.burst(enemy.x, enemy.y, color, 5);
    if (enemy.health <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: EnemyState): void {
    const definition = ENEMY_DEFINITIONS[enemy.kind];
    this.enemies = this.enemies.filter((entry) => entry.id !== enemy.id);
    if (
      enemy.kind === "walker" ||
      enemy.kind === "brute" ||
      enemy.kind === "sapper" ||
      enemy.kind === "spitter" ||
      enemy.kind === "flyer" ||
      enemy.kind === "diver" ||
      enemy.kind === "sky-devourer"
    ) {
      this.enemyDeaths.push({
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
        facing: enemy.x < CORE_X ? 1 : -1,
        age: 0,
        duration:
          enemy.kind === "sky-devourer"
            ? 1.05
            : enemy.kind === "walker"
              ? 0.72
              : enemy.kind === "flyer" || enemy.kind === "diver"
                ? 0.58
                : 0.82,
      });
    }
    this.inkDrops.push({
      id: this.nextEntityId++,
      x: enemy.x + definition.width / 2,
      y: enemy.y + definition.height / 2,
      vx: (enemy.id % 2 === 0 ? -1 : 1) * (22 + (enemy.id % 5) * 4),
      vy: -95,
      amount: definition.inkDrop,
      age: 0,
    });
    this.burst(enemy.x, enemy.y, definition.color, enemy.kind === "sky-devourer" ? 45 : 16);
    this.callbacks.onSound("hit");
  }

  private damageStructure(
    structure: StructureState,
    amount: number,
  ): WallCollapseResult | null {
    if (structure.shieldUntil > this.elapsed) return null;
    let damage = amount;
    const fortified = this.structures.some((candidate) => {
      if (candidate.actionId !== "fortress-ward") return false;
      const definition = CODEX_ACTIONS[candidate.actionId];
      if (!isStructureAction(definition)) return false;
      return (
        Math.hypot(candidate.x - structure.x, candidate.y - structure.y) <=
        definition.effect.rangeTiles * TILE_SIZE
      );
    });
    if (fortified) damage *= 0.65;
    structure.health -= damage;
    this.burst(structure.x, structure.y, "#d78a6d", 5);
    if (structure.health <= 0) {
      const definition = CODEX_ACTIONS[structure.actionId];
      const wallStack =
        isStructureAction(definition) && definition.effect.role === "wall"
          ? this.wallStackFor(structure)
          : [];
      const destroyedLayer = wallStack.findIndex(
        (candidate) => candidate.id === structure.id,
      );
      const collapseResult = resolveWallCollapse(
        wallStack.map((candidate) => candidate.id),
        structure.id,
      );
      const collapsed = collapseResult.collapsedIds
        .map((id) => wallStack.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is StructureState => Boolean(candidate));
      const removedIds = new Set([
        structure.id,
        ...collapsed.map((candidate) => candidate.id),
      ]);
      this.structures = this.structures.filter(
        (entry) => !removedIds.has(entry.id),
      );
      if (wallStack.length > 0) {
        const columnX = this.wallColumnX(structure);
        for (const enemy of this.enemies) {
          if (enemy.siegeColumnX !== columnX) continue;
          if (destroyedLayer <= 0) {
            enemy.siegeColumnX = null;
            enemy.siegeLayer = null;
          } else {
            enemy.siegeLayer = destroyedLayer as 1 | 2 | 3;
          }
        }
      }
      this.callbacks.onSound("break");
      this.spawnExplosion(
        structure.x + this.structureRect(structure).width / 2,
        structure.y + this.structureRect(structure).height / 2,
        wallStack.length > 0 ? 40 : 60,
      );
      this.burst(
        structure.x,
        structure.y,
        CODEX_ACTIONS[structure.actionId].color,
        18 + collapsed.length * 7,
      );
      for (const fallen of collapsed) {
        this.burst(
          fallen.x,
          fallen.y,
          CODEX_ACTIONS[fallen.actionId].color,
          8,
        );
      }
      return collapseResult;
    }
    return null;
  }

  private damageArcher(archer: ArcherState, amount: number): void {
    const actionId = this.unitAction(archer);
    const definition = CODEX_ACTIONS[actionId];
    const width = this.unitWidth(archer);
    const height = this.unitHeight(archer);
    archer.health -= amount;
    archer.hurtTimer = 0.25;
    this.burst(
      archer.x + width / 2,
      archer.y + height / 2,
      definition.color,
      5,
    );
    if (archer.health > 0) return;
    this.archers = this.archers.filter((entry) => entry.id !== archer.id);
    this.callbacks.onSound("hurt");
    this.burst(
      archer.x + width / 2,
      archer.y + height / 2,
      definition.color,
      14,
    );
    this.setToast(`一名${definition.chinese}倒下了。`, 3);
  }

  private damageCore(amount: number): void {
    if (this.coreShieldUntil > this.elapsed) return;
    this.coreHealth = Math.max(0, this.coreHealth - amount);
    this.callbacks.onSound("hurt");
    this.burst(CORE_X, this.coreGround() - 50, "#f08383", 10);
  }

  private damagePlayer(amount: number, direction: number): void {
    if (
      this.player.respawnTimer > 0 ||
      this.player.invulnerability > 0 ||
      this.playerShieldUntil > this.elapsed
    ) {
      return;
    }
    this.player.health = Math.max(0, this.player.health - amount);
    this.player.invulnerability = 0.8;
    this.player.vx = direction * 125;
    this.player.vy = -75;
    this.callbacks.onSound("hurt");
    if (this.player.health <= 0) this.killPlayer();
  }

  private killPlayer(): void {
    if (this.player.respawnTimer > 0) return;
    const lostInk = Math.min(4, this.ink);
    this.ink -= lostInk;
    if (lostInk > 0) {
      this.inkDrops.push({
        id: this.nextEntityId++,
        x: this.player.x + PLAYER_WIDTH / 2,
        y: this.player.y + PLAYER_HEIGHT / 2,
        vx: this.player.facing * -35,
        vy: -110,
        amount: lostInk,
        age: 0,
      });
    }
    this.player.health = 0;
    this.player.respawnTimer = 4;
    this.player.vx = 0;
    this.player.vy = 0;
    this.activeActionId = null;
    this.setToast("言灵法师倒下了 · 4秒后在言灵封印旁复活", 4);
  }

  private respawnPlayer(): void {
    this.player.x = CORE_X - PLAYER_WIDTH / 2;
    this.player.y = this.coreGround() - PLAYER_HEIGHT;
    this.player.health = PLAYER_MAX_HEALTH;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invulnerability = 2;
    this.player.onGround = true;
    this.setToast("重新站起来，防线还没有倒。", 3);
  }

  private updateInkDrops(dt: number): void {
    const playerCenterX = this.player.x + PLAYER_WIDTH / 2;
    const playerCenterY = this.player.y + PLAYER_HEIGHT / 2;
    for (const drop of [...this.inkDrops]) {
      drop.age += dt;
      const distance = Math.hypot(drop.x - playerCenterX, drop.y - playerCenterY);
      if (this.player.respawnTimer <= 0 && distance <= REACH_TILES_X * TILE_SIZE) {
        const strength = distance < 18 ? 1 : Math.min(1, dt * 8);
        drop.x += (playerCenterX - drop.x) * strength;
        drop.y += (playerCenterY - drop.y) * strength;
        drop.vx *= 0.75;
        drop.vy *= 0.75;
      } else {
        drop.vy = Math.min(220, drop.vy + GRAVITY * 0.55 * dt);
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        const dropGround = this.groundAt(drop.x) - 7;
        if (drop.y >= dropGround) {
          drop.y = dropGround;
          drop.vy *= -0.3;
          drop.vx *= 0.7;
        }
      }
      if (distance < 16 && this.ink < MAX_INK) {
        const accepted = Math.min(drop.amount, MAX_INK - this.ink);
        this.ink += accepted;
        drop.amount -= accepted;
        this.callbacks.onSound("pickup");
        this.burst(drop.x, drop.y, "#bba4ff", 8);
        if (drop.amount <= 0) {
          this.inkDrops = this.inkDrops.filter((entry) => entry.id !== drop.id);
        }
      } else if (drop.age >= 18) {
        this.inkDrops = this.inkDrops.filter((entry) => entry.id !== drop.id);
      }
    }
  }

  private updateVisuals(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 90 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const projectile of this.projectiles) projectile.life -= dt;
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0);
    for (const warning of this.warnings) warning.life -= dt;
    this.warnings = this.warnings.filter((warning) => warning.life > 0);
    for (const death of this.enemyDeaths) death.age += dt;
    this.enemyDeaths = this.enemyDeaths.filter(
      (death) => death.age < death.duration,
    );
    for (const explosion of this.explosions) explosion.age += dt;
    this.explosions = this.explosions.filter(
      (explosion) => explosion.age < explosion.duration,
    );
  }

  private spawnExplosion(x: number, y: number, size: number): void {
    this.explosions.push({
      x,
      y,
      size,
      age: 0,
      duration: size >= 60 ? 0.58 : 0.44,
    });
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      const speed = 18 + (index % 5) * 9;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        life: 0.35 + (index % 4) * 0.08,
        maxLife: 0.6,
        color,
        size: 2 + (index % 3),
      });
    }
  }

  private structureRect(structure: StructureState): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const definition = CODEX_ACTIONS[structure.actionId];
    const effect = definition.effect as StructureEffectDefinition;
    return {
      x: structure.x,
      y: structure.y,
      width: effect.footprint.width * TILE_SIZE,
      height: effect.footprint.height * TILE_SIZE,
    };
  }

  private structureAt(x: number, y: number): StructureState | undefined {
    return [...this.structures].reverse().find((structure) => {
      const rect = this.structureRect(structure);
      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    });
  }

  private nearestStructure(
    x: number,
    y: number,
    distance: number,
  ): StructureState | undefined {
    return this.structures
      .filter((structure) => Math.hypot(structure.x - x, structure.y - y) <= distance)
      .sort(
        (a, b) =>
          Math.hypot(a.x - x, a.y - y) -
          Math.hypot(b.x - x, b.y - y),
      )[0];
  }

  private nearestStructureToPointer(distance: number): StructureState | undefined {
    return this.nearestStructure(this.pointer.worldX, this.pointer.worldY, distance);
  }

  private nearestEnemyToPointer(distance: number): EnemyState | undefined {
    return this.enemies
      .filter(
        (enemy) =>
          Math.hypot(enemy.x - this.pointer.worldX, enemy.y - this.pointer.worldY) <=
          distance,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.pointer.worldX, a.y - this.pointer.worldY) -
          Math.hypot(b.x - this.pointer.worldX, b.y - this.pointer.worldY),
      )[0];
  }

  private withinReach(x: number, y: number): boolean {
    const centerX = this.player.x + PLAYER_WIDTH / 2;
    const centerY = this.player.y + PLAYER_HEIGHT / 2;
    return (
      Math.abs(x - centerX) <= REACH_TILES_X * TILE_SIZE &&
      Math.abs(y - centerY) <= REACH_TILES_Y * TILE_SIZE
    );
  }

  private setToast(message: string, seconds: number): void {
    this.toast = message;
    this.toastTimer = seconds;
    this.emitHud(true);
  }

  emitHud(force = false): void {
    if (!force && this.hudTimer < 0.09) return;
    const wave = WAVE_DEFINITIONS[this.waveIndex] ?? WAVE_DEFINITIONS[5];
    const phaseTime =
      this.phase === "wave"
        ? this.spawnCursor >= this.waveSchedule.length
          ? "清理残敌"
          : formatSeconds(Math.max(0, wave.durationTarget - this.waveElapsed))
        : this.needsStarterLessons()
          ? "等待学习"
        : formatSeconds(this.phaseTimer);
    this.callbacks.onHud({
      started: this.started,
      phase: this.phase,
      phaseLabel: phaseLabel(this.phase),
      phaseTime,
      waveIndex: this.waveIndex,
      waveTitle: wave.title,
      enemiesActive: this.enemies.length,
      enemiesQueued: Math.max(0, this.waveSchedule.length - this.spawnCursor),
      playerHealth: Math.max(0, Math.round(this.player.health)),
      playerMaxHealth: this.player.maxHealth,
      playerDeadFor: this.player.respawnTimer,
      coreHealth: Math.max(0, Math.round(this.coreHealth)),
      coreMaxHealth: CORE_MAX_HEALTH,
      ink: Math.round(this.ink),
      maxInk: MAX_INK,
      nightInkRegenBonus: this.nightInkRegenBonus,
      nightInkRegenRemaining: this.nightInkRegenRemaining,
      unlockedTier: this.unlockedTier,
      daylight: this.phase === "prep" || this.phase === "intermission",
      learnedActions: cloneLearnedActions(this.learnedActions),
      starterLessonsCompleted: this.starterLessonCount(),
      starterLessonsTotal: REQUIRED_STARTER_ACTIONS.length,
      prepTimerStarted: !this.needsStarterLessons(),
      dailyLessonsLearned: this.dailyLessonCount(),
      dailyLessonLimit: DAILY_LESSON_LIMIT,
      dailyLearnedWordKeys: [...this.learningDay.learnedWordKeys],
      archers: this.archers.filter(
        (unit) => this.unitAction(unit) === "archer",
      ).length,
      groundSoldiers: this.archers.filter(
        (unit) => this.unitAction(unit) !== "archer",
      ).length,
      occupiedTowers: this.archers.filter(
        (archer) =>
          this.unitAction(archer) === "archer" &&
          archer.towerId !== null,
      ).length,
      towerSlots: this.structures.filter(
        (structure) => structure.actionId === "tower",
      ).length,
      activeActionId: this.activeActionId,
      activeActionCost: this.activeActionId
        ? effectiveInkCost(
            this.activeActionId,
            this.activeQuality,
            this.activeSource,
          )
        : null,
      tool: this.player.tool,
      scaling: getWaveScaling(this.waveIndex),
      mastery: cloneMastery(this.mastery),
      toast: this.toast,
    });
  }

  private updateCamera(dt: number): void {
    const target =
      this.player.respawnTimer > 0 ? CORE_X : this.player.x + PLAYER_WIDTH / 2;
    const desired = Math.max(
      0,
      Math.min(WORLD_PIXEL_WIDTH - this.viewWidth, target - this.viewWidth / 2),
    );
    this.cameraX += (desired - this.cameraX) * Math.min(1, dt * 7);
    this.pointer.worldX = this.cameraX + this.pointer.screenX / CAMERA_ZOOM;
    this.pointer.worldY = this.cameraY + this.pointer.screenY / CAMERA_ZOOM;
  }

  private snapCamera(): void {
    this.cameraX = Math.max(
      0,
      Math.min(
        WORLD_PIXEL_WIDTH - this.viewWidth,
        this.player.x + PLAYER_WIDTH / 2 - this.viewWidth / 2,
      ),
    );
    this.cameraY = (SURFACE_Y - 12) * TILE_SIZE;
  }

  render(canvas: HTMLCanvasElement): void {
    const cssWidth = Math.max(1, canvas.clientWidth);
    const cssHeight = Math.max(1, canvas.clientHeight);
    const width = Math.max(320, Math.floor(cssWidth / CAMERA_ZOOM));
    const height = Math.max(180, Math.floor(cssHeight / CAMERA_ZOOM));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    this.viewWidth = width;
    this.viewHeight = height;
    this.cameraY = Math.max(
      0,
      Math.min(
        WORLD_HEIGHT * TILE_SIZE - height,
        (SURFACE_Y - 12) * TILE_SIZE,
      ),
    );
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    this.drawBackground(context, width, height);
    context.save();
    context.translate(-Math.round(this.cameraX), -Math.round(this.cameraY));
    this.drawWorld(context);
    this.drawScenery(context);
    this.drawWarnings(context);
    this.drawCore(context);
    this.drawStructures(context);
    this.drawArchers(context);
    this.drawFoods(context);
    this.drawInkDrops(context);
    this.drawEnemyDeaths(context);
    this.drawEnemies(context);
    this.drawPlayer(context);
    this.drawProjectiles(context);
    this.drawExplosions(context);
    this.drawParticles(context);
    this.drawPlacement(context);
    context.restore();
    this.drawCursor(context);
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const isNight = this.phase === "wave";
    const danger = isNight
      ? Math.min(1, 0.52 + this.waveIndex * 0.09)
      : Math.min(0.18, 0.04 + this.waveIndex * 0.018);
    const horizon = Math.round(this.coreGround() - this.cameraY);
    const top = this.mixColor("#73b6c7", "#201936", danger);
    const bottom = this.mixColor("#d9d79d", "#5a3651", danger);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const sceneScale = Math.max(
      width / 1024,
      (Math.max(160, horizon) + 20) / 346,
    );
    const sceneWidth = 1024 * sceneScale;
    const sceneHeight = 346 * sceneScale;
    const sceneY = horizon + 20 - sceneHeight;
    const drawRepeatedLayer = (
      image: HTMLImageElement | null,
      parallax: number,
    ) => {
      if (!image) return;
      const offset =
        -(((this.cameraX * parallax) % sceneWidth) + sceneWidth) %
        sceneWidth;
      for (let x = offset - sceneWidth; x < width + sceneWidth; x += sceneWidth) {
        context.drawImage(
          image,
          Math.round(x),
          Math.round(sceneY),
          Math.ceil(sceneWidth),
          Math.ceil(sceneHeight),
        );
      }
    };

    drawRepeatedLayer(this.backgroundImages[0], 0.01);

    if (!isNight && this.sunImage) {
      const sunSize = Math.max(26, Math.round(34 * sceneScale));
      context.save();
      context.globalAlpha = 0.94;
      context.drawImage(
        this.sunImage,
        Math.round(width * 0.78 - sunSize / 2),
        Math.max(18, Math.round(sceneY + sceneHeight * 0.14)),
        sunSize,
        sunSize,
      );
      context.restore();
    }

    context.save();
    context.globalAlpha = isNight ? 0.18 : 0.66;
    for (let index = 0; index < this.cloudImages.length; index += 1) {
      const image = this.cloudImages[index];
      if (!image) continue;
      const cloudScale = (0.72 + (index % 3) * 0.16) * sceneScale;
      const cloudWidth = image.width * cloudScale;
      const cloudHeight = image.height * cloudScale;
      const travelWidth = width + cloudWidth + 100;
      const drift =
        index % 2 === 0 ? this.elapsed * (1.2 + index * 0.12) : -this.elapsed;
      const rawX =
        index * 181 + drift - this.cameraX * (0.018 + index * 0.002);
      const x =
        ((rawX % travelWidth) + travelWidth) % travelWidth -
        cloudWidth -
        50;
      const y = Math.max(
        12,
        sceneY + 22 + ((index * 29) % Math.max(44, sceneHeight * 0.31)),
      );
      context.drawImage(
        image,
        Math.round(x),
        Math.round(y),
        Math.max(1, Math.round(cloudWidth)),
        Math.max(1, Math.round(cloudHeight)),
      );
    }
    context.restore();

    const castle = this.backgroundImages[1];
    if (castle) {
      const castleFocus =
        width / 2 +
        (CORE_X - (this.cameraX + width / 2)) * 0.12;
      context.drawImage(
        castle,
        Math.round(castleFocus - 319 * sceneScale),
        Math.round(sceneY),
        Math.ceil(sceneWidth),
        Math.ceil(sceneHeight),
      );
    }

    drawRepeatedLayer(this.backgroundImages[2], 0.045);
    drawRepeatedLayer(this.backgroundImages[3], 0.08);
    drawRepeatedLayer(this.backgroundImages[4], 0.14);
    drawRepeatedLayer(this.backgroundImages[5], 0.22);

    if (this.backgroundImages.slice(2).every((image) => image === null)) {
      context.fillStyle = this.mixColor("#527a63", "#27263e", danger);
      context.beginPath();
      context.moveTo(0, horizon);
      for (let x = 0; x <= width + 40; x += 40) {
        const worldX = x + this.cameraX * 0.18;
        context.lineTo(x, horizon - 40 - Math.sin(worldX / 95) * 18);
      }
      context.lineTo(width, horizon);
      context.closePath();
      context.fill();
    }

    if (isNight) {
      context.fillStyle = `rgba(20, 14, 46, ${0.5 + danger * 0.18})`;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(222,225,245,0.84)";
      context.fillRect(width - 88, 30, 28, 28);
      context.fillStyle = "rgba(28, 23, 52, 0.96)";
      context.fillRect(width - 79, 26, 23, 23);
      context.fillStyle = "rgba(255,255,230,0.72)";
      for (let index = 0; index < 22; index += 1) {
        const x = (index * 97 + this.waveIndex * 31) % width;
        const y = 18 + ((index * 47) % Math.max(40, height * 0.55));
        context.fillRect(x, y, index % 4 === 0 ? 2 : 1, 1);
      }
    }

    if (isNight) {
      this.drawEnemyPortalBackdrop(context, width, horizon);
    }
  }

  private drawEnemyPortalBackdrop(
    context: CanvasRenderingContext2D,
    width: number,
    horizon: number,
  ): void {
    const pulse = 0.5 + Math.sin(this.elapsed * 3.2) * 0.18;
    const portalY = horizon - 28;
    for (const portalX of [18, width - 18]) {
      context.save();
      context.globalAlpha = 0.46 + pulse * 0.28;
      context.strokeStyle = "#b75cff";
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(portalX, portalY, 11, 27, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "#6f39ae";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(portalX, portalY, 6, 20, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(30, 11, 48, 0.76)";
      context.fillRect(portalX - 3, portalY - 18, 6, 37);
      for (let mote = 0; mote < 5; mote += 1) {
        const phase = this.elapsed * (9 + mote) + mote * 1.7;
        const moteX = portalX + Math.sin(phase) * (7 + (mote % 2) * 4);
        const moteY = portalY + 24 - ((phase * 5) % 48);
        context.fillStyle = mote % 2 === 0 ? "#d992ff" : "#7650d4";
        context.fillRect(Math.round(moteX), Math.round(moteY), 2, 2);
      }
      context.restore();
    }

    const mageX = width - 52;
    const mageY = horizon - 68;
    context.save();
    context.globalAlpha = 0.34;
    context.fillStyle = "#120d22";
    context.beginPath();
    context.moveTo(mageX, mageY);
    context.lineTo(mageX - 10, mageY + 16);
    context.lineTo(mageX + 10, mageY + 16);
    context.closePath();
    context.fill();
    context.fillRect(mageX - 7, mageY + 14, 14, 31);
    context.fillStyle = "#a66cff";
    context.fillRect(mageX - 5, mageY + 9, 2, 2);
    context.fillRect(mageX + 3, mageY + 9, 2, 2);
    context.restore();
  }

  private drawWorld(context: CanvasRenderingContext2D): void {
    const startX = Math.max(0, Math.floor(this.cameraX / TILE_SIZE) - 1);
    const endX = Math.min(
      WORLD_WIDTH - 1,
      Math.ceil((this.cameraX + this.viewWidth) / TILE_SIZE) + 1,
    );
    for (let x = startX; x <= endX; x += 1) {
      const px = x * TILE_SIZE;
      const surface = Math.round(this.groundAt(px + TILE_SIZE / 2));
      const worldBottom = WORLD_HEIGHT * TILE_SIZE;
      for (
        let row = 0;
        surface + row * TILE_SIZE < worldBottom;
        row += 1
      ) {
        const y = surface + row * TILE_SIZE;
        context.fillStyle =
          row <= 2 ? "#44352b" : row <= 5 ? "#352721" : "#291d1b";
        context.fillRect(px, y, TILE_SIZE, TILE_SIZE);
        const dirtImage = this.dirtImages[(x + row) % this.dirtImages.length];
        if (dirtImage) {
          const sourceX = (x * 17 + row * 23) % 172;
          const sourceY = (row * 19 + x * 7) % 108;
          context.save();
          context.globalAlpha = row <= 3 ? 0.72 : 0.52;
          context.drawImage(
            dirtImage,
            sourceX,
            sourceY,
            TILE_SIZE,
            TILE_SIZE,
            px,
            y,
            TILE_SIZE,
            TILE_SIZE,
          );
          context.restore();
        } else {
          context.fillStyle =
            row <= 2
              ? (x + row) % 3 === 0
                ? "#4a3025"
                : "#3d281f"
              : row <= 5
                ? "#2d1d1b"
                : "#1b1315";
          context.fillRect(px, y, TILE_SIZE, TILE_SIZE);
        }
        const depthShade = Math.min(0.26, 0.025 + row * 0.025);
        context.fillStyle = `rgba(31, 15, 12, ${depthShade})`;
        context.fillRect(px, y, TILE_SIZE, TILE_SIZE);
        context.fillStyle = "rgba(65,39,29,0.22)";
        context.fillRect(px, y + TILE_SIZE - 1, TILE_SIZE, 1);
        context.fillRect(px + TILE_SIZE - 1, y, 1, TILE_SIZE);
        if ((x * 7 + row * 5) % 11 === 0) {
          context.fillStyle = row < 4 ? "#79513b" : "#4b3430";
          context.fillRect(px + 5 + ((x + row) % 3) * 3, y + 8, 3, 2);
        }
      }

      const sourceX = groundAssetSourceX(this.terrain, x);
      const sourceTop = groundAssetTopOffset(this.terrain, x);
      const destinationY = Math.round(surface - sourceTop);
      if (this.groundImage) {
        const firstWidth = Math.min(TILE_SIZE, GROUND_ASSET_WIDTH - sourceX);
        context.drawImage(
          this.groundImage,
          sourceX,
          GROUND_ASSET_CROP_Y,
          firstWidth,
          GROUND_ASSET_CROP_HEIGHT,
          px,
          destinationY,
          firstWidth,
          GROUND_ASSET_CROP_HEIGHT,
        );
        if (firstWidth < TILE_SIZE) {
          context.drawImage(
            this.groundImage,
            0,
            GROUND_ASSET_CROP_Y,
            TILE_SIZE - firstWidth,
            GROUND_ASSET_CROP_HEIGHT,
            px + firstWidth,
            destinationY,
            TILE_SIZE - firstWidth,
            GROUND_ASSET_CROP_HEIGHT,
          );
        }
      } else {
        context.fillStyle = "#3d281f";
        context.fillRect(px, surface, TILE_SIZE, 62);
      }
    }
  }

  private drawScenery(context: CanvasRenderingContext2D): void {
    const drawMirrored = (
      image: HTMLImageElement,
      x: number,
      y: number,
      width: number,
      height: number,
      mirrored: boolean,
      source?: { x: number; y: number; width: number; height: number },
    ) => {
      context.save();
      if (mirrored) {
        context.translate(x + width, 0);
        context.scale(-1, 1);
        x = 0;
      }
      if (source) {
        context.drawImage(
          image,
          source.x,
          source.y,
          source.width,
          source.height,
          x,
          y,
          width,
          height,
        );
      } else {
        context.drawImage(image, x, y, width, height);
      }
      context.restore();
    };

    for (const object of this.scenery) {
      if (
        object.x < this.cameraX - 100 ||
        object.x > this.cameraX + this.viewWidth + 100
      ) {
        continue;
      }
      if (object.kind === "sheep" && this.phase === "wave") continue;
      const ground = this.groundAt(object.x);
      context.globalAlpha = object.kind === "tree" ? 0.72 : 0.88;
      if (object.kind === "tree") {
        const image = this.treeImages[object.variant % this.treeImages.length];
        if (image) {
          drawMirrored(
            image,
            object.x - 28,
            ground - 72,
            56,
            72,
            object.mirrored,
          );
        }
      } else if (object.kind === "tent" && this.tentImage) {
        drawMirrored(
          this.tentImage,
          object.x - 24,
          ground - 40,
          48,
          40,
          object.mirrored,
        );
      } else if (object.kind === "scarecrow" && this.scarecrowImage) {
        drawMirrored(
          this.scarecrowImage,
          object.x - 16,
          ground - 40,
          32,
          40,
          object.mirrored,
        );
      } else if (object.kind === "sheep") {
        const state = Math.floor(this.elapsed + object.variant) % 5 === 0
          ? "bounce"
          : "idle";
        const frames = this.sheepImages[state].filter(
          (frame): frame is HTMLImageElement => frame !== null,
        );
        const frame =
          frames[Math.floor(this.elapsed * 6 + object.variant) % Math.max(1, frames.length)];
        if (frame) {
          drawMirrored(
            frame,
            object.x - 10,
            ground - 20,
            20,
            20,
            object.mirrored,
          );
        }
      } else if (this.decorImage) {
        const decor =
          object.kind === "crate"
            ? {
                source: { x: 0, y: 0, width: 64, height: 40 },
                width: 32,
                height: 20,
              }
            : object.kind === "barrel"
              ? {
                  source: { x: 80, y: 0, width: 48, height: 48 },
                  width: 24,
                  height: 24,
                }
              : {
                  source: { x: 0, y: 192, width: 96, height: 56 },
                  width: 42,
                  height: 25,
                };
        drawMirrored(
          this.decorImage,
          object.x - decor.width / 2,
          ground - decor.height,
          decor.width,
          decor.height,
          object.mirrored,
          decor.source,
        );
      }
      context.globalAlpha = 1;
    }
  }

  private drawCore(context: CanvasRenderingContext2D): void {
    const ground = this.coreGround();
    const shielded = this.coreShieldUntil > this.elapsed;
    if (shielded) {
      context.fillStyle = "rgba(153,230,246,0.2)";
      context.fillRect(CORE_X - 38, ground - 98, 76, 98);
      context.strokeStyle = "#a8f2ff";
      context.strokeRect(CORE_X - 38.5, ground - 98.5, 77, 99);
    }
    context.fillStyle = "#372a31";
    context.fillRect(CORE_X - 28, ground - 24, 56, 24);
    context.fillStyle = "#7a523b";
    context.fillRect(CORE_X - 6, ground - 72, 12, 48);
    context.fillStyle = "#d9c796";
    context.fillRect(CORE_X - 27, ground - 82, 25, 36);
    context.fillRect(CORE_X + 2, ground - 82, 25, 36);
    context.fillStyle = "#7e5f8e";
    context.fillRect(CORE_X - 2, ground - 82, 4, 40);
    context.fillStyle = "#9d75ba";
    context.fillRect(CORE_X - 14, ground - 70, 6, 6);
    context.fillRect(CORE_X + 9, ground - 64, 6, 6);
    const ratio = this.coreHealth / CORE_MAX_HEALTH;
    context.fillStyle = "#1c2225";
    context.fillRect(CORE_X - 30, ground - 94, 60, 5);
    context.fillStyle = ratio < 0.3 ? "#ec6f6f" : "#86c985";
    context.fillRect(CORE_X - 29, ground - 93, 58 * ratio, 3);
  }

  private drawStructures(context: CanvasRenderingContext2D): void {
    for (const structure of this.structures) {
      const definition = CODEX_ACTIONS[structure.actionId];
      const rect = this.structureRect(structure);
      const hurt = structure.health / structure.maxHealth < 0.35;
      const wallImage = this.wallImages[structure.actionId];
      const structureImage =
        structure.actionId === "tower" ? this.towerImage : wallImage;
      context.fillStyle = hurt ? "#8e5f57" : definition.color;
      context.globalAlpha = hurt ? 0.7 : 0.94;
      if (structureImage) {
        context.drawImage(
          structureImage,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
      } else {
        context.fillRect(
          rect.x + 2,
          rect.y + 2,
          rect.width - 4,
          rect.height - 2,
        );
      }
      context.globalAlpha = 1;
      if (!structureImage) {
        context.fillStyle = "rgba(31,31,36,0.32)";
        for (let y = rect.y + 8; y < rect.y + rect.height; y += 10) {
          context.fillRect(rect.x + 3, y, rect.width - 6, 2);
        }
      } else {
        context.strokeStyle = hurt ? "#e08478" : "rgba(240,220,180,0.2)";
        context.strokeRect(
          rect.x + 0.5,
          rect.y + 0.5,
          rect.width - 1,
          rect.height - 1,
        );
      }
      if (structure.actionId === "palisade") {
        context.fillStyle = "#d5b170";
        for (let x = rect.x + 2; x < rect.x + rect.width; x += 5) {
          context.beginPath();
          context.moveTo(x, rect.y + 4);
          context.lineTo(x + 2, rect.y - 4);
          context.lineTo(x + 4, rect.y + 4);
          context.fill();
        }
      }
      if (
        ["arrow-tower", "freeze-cannon", "homing-turret"].includes(
          structure.actionId,
        )
      ) {
        context.fillStyle = "#29333c";
        context.fillRect(rect.x - 4, rect.y + 5, rect.width + 8, 8);
        context.fillStyle = definition.color;
        context.fillRect(rect.x + rect.width / 2 - 3, rect.y - 4, rect.width / 2 + 8, 5);
      }
      if (structure.actionId === "tower" && !this.towerImage) {
        context.fillStyle = "#4a3429";
        context.fillRect(rect.x + 4, rect.y + 8, 6, rect.height - 8);
        context.fillRect(rect.x + rect.width - 10, rect.y + 8, 6, rect.height - 8);
        context.fillStyle = "#d0a568";
        context.fillRect(rect.x - 3, rect.y + 3, rect.width + 6, 7);
        context.fillRect(rect.x + 8, rect.y + 18, rect.width - 16, 4);
        context.fillStyle = "#72513a";
        for (let y = rect.y + 28; y < rect.y + rect.height - 4; y += 10) {
          context.fillRect(rect.x + rect.width / 2 - 6, y, 12, 2);
        }
      }
      if (structure.actionId === "ballista") {
        context.strokeStyle = "#49362d";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(rect.x + 5, rect.y + 7);
        context.lineTo(rect.x + rect.width - 5, rect.y + 7);
        context.stroke();
      }
      if (structure.actionId === "spike-trap") {
        context.fillStyle = "#e5e1ae";
        for (let x = rect.x + 3; x < rect.x + rect.width; x += 7) {
          context.beginPath();
          context.moveTo(x, rect.y + rect.height);
          context.lineTo(x + 3, rect.y + 2);
          context.lineTo(x + 6, rect.y + rect.height);
          context.fill();
        }
      }
      if (structure.actionId === "web-trap") {
        context.strokeStyle = "#f0f1dd";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(rect.x + 2, rect.y + rect.height - 2);
        context.lineTo(rect.x + rect.width / 2, rect.y + 2);
        context.lineTo(rect.x + rect.width - 2, rect.y + rect.height - 2);
        context.stroke();
      }
      if (
        ["frost-ward", "healing-ward", "fortress-ward"].includes(
          structure.actionId,
        )
      ) {
        context.fillStyle = "#f7efd0";
        context.fillRect(
          rect.x + rect.width / 2 - 3,
          rect.y + rect.height / 2 - 3,
          6,
          6,
        );
      }
      if (structure.actionId === "healing-ward") {
        const state = this.phase === "wave" ? "heal" : "idle";
        const frames = this.monkImages[state].filter(
          (frame): frame is HTMLImageElement => frame !== null,
        );
        const frame =
          frames[
            Math.floor(this.elapsed * (state === "heal" ? 9 : 5) + structure.id) %
              Math.max(1, frames.length)
          ];
        if (frame) {
          context.drawImage(
            frame,
            rect.x + rect.width / 2 - 14,
            rect.y + rect.height - 32,
            28,
            32,
          );
        }
        const effectFrames = this.monkImages["heal-effect"].filter(
          (effectFrame): effectFrame is HTMLImageElement => effectFrame !== null,
        );
        const effectFrame =
          effectFrames[
            Math.floor(this.elapsed * 9 + structure.id) %
              Math.max(1, effectFrames.length)
          ];
        if (effectFrame && state === "heal") {
          context.globalAlpha = 0.62;
          context.drawImage(
            effectFrame,
            rect.x + rect.width / 2 - 14,
            rect.y + rect.height - 32,
            28,
            32,
          );
          context.globalAlpha = 1;
        }
      }
      if (structure.shieldUntil > this.elapsed) {
        context.strokeStyle = "#a5eff8";
        context.strokeRect(rect.x - 2.5, rect.y - 2.5, rect.width + 5, rect.height + 5);
      }
      const ratio = Math.max(0, structure.health / structure.maxHealth);
      context.fillStyle = "#172023";
      context.fillRect(rect.x, rect.y - 5, rect.width, 3);
      context.fillStyle = ratio < 0.35 ? "#ec7474" : "#82d192";
      context.fillRect(rect.x, rect.y - 5, rect.width * ratio, 3);
    }
  }

  private drawArchers(context: CanvasRenderingContext2D): void {
    for (const archer of this.archers) {
      const actionId = this.unitAction(archer);
      const definition = CODEX_ACTIONS[actionId];
      const x = Math.round(archer.x);
      const y = Math.round(archer.y);
      const isArcher = actionId === "archer";
      const isSwordsman = actionId === "swordsman";
      const isKnight = actionId === "knight";
      const state = isArcher
        ? (archer.animationTimer ?? 0) > 0
          ? "shoot"
          : archer.towerId === null
            ? "run"
            : "idle"
        : (archer.hurtTimer ?? 0) > 0
          ? isSwordsman
            ? "hit"
            : isKnight
              ? "guard"
              : "run"
          : (archer.animationTimer ?? 0) > 0
            ? "attack"
            : "run";
      const sourceFrames = isArcher
        ? this.archerImages[state as "idle" | "run" | "shoot"]
        : isSwordsman
          ? this.swordsmanImages[state as "idle" | "run" | "attack" | "hit"]
          : isKnight
            ? this.knightImages[state as "idle" | "run" | "attack" | "guard"]
            : this.spearmanImages[state as "idle" | "run" | "attack"];
      const frames = sourceFrames.filter(
        (frame): frame is HTMLImageElement => frame !== null,
      );
      const timedAnimation =
        state === "shoot" ||
        state === "attack" ||
        state === "hit" ||
        state === "guard";
      const animationDuration =
        state === "shoot"
          ? 0.34
          : state === "hit" || state === "guard"
            ? 0.25
            : actionId === "swordsman"
              ? 0.38
              : 0.46;
      const timer =
        state === "hit" || state === "guard"
          ? archer.hurtTimer ?? 0
          : archer.animationTimer ?? 0;
      const animationProgress = timedAnimation
        ? 1 - Math.min(1, timer / animationDuration)
        : this.elapsed * (state === "run" ? 9 : 5) + archer.id * 0.37;
      const frame =
        frames[
          Math.max(
            0,
            Math.floor(
              animationProgress * (timedAnimation ? frames.length : 1),
            ),
          ) % Math.max(1, frames.length)
      ];
      if (frame) {
        const drawWidth = isArcher
          ? ARCHER_SIZE
          : actionId === "spearman" && state === "attack"
            ? 40
            : SOLDIER_RENDER_WIDTH;
        const drawHeight = isArcher ? ARCHER_SIZE : SOLDIER_HEIGHT;
        const drawX = x - Math.round((drawWidth - this.unitWidth(archer)) / 2);
        if (isArcher && archer.towerId !== null) {
          context.save();
          context.beginPath();
          context.rect(
            x,
            y,
            ARCHER_SIZE,
            TOWER_ARCHER_VISIBLE_HEIGHT,
          );
          context.clip();
        }
        if (archer.facing < 0) {
          context.save();
          context.translate(drawX + drawWidth, 0);
          context.scale(-1, 1);
          context.drawImage(frame, 0, y, drawWidth, drawHeight);
          context.restore();
        } else {
          context.drawImage(frame, drawX, y, drawWidth, drawHeight);
        }
        if (isArcher && archer.towerId !== null) {
          context.restore();
        }
      }
      const ratio = Math.max(0, archer.health / archer.maxHealth);
      const unitWidth = this.unitWidth(archer);
      context.fillStyle = "#1c2225";
      context.fillRect(x, y - 5, unitWidth, 3);
      context.fillStyle = ratio < 0.35 ? "#ec7474" : definition.color;
      context.fillRect(x, y - 5, unitWidth * ratio, 3);
    }
  }

  private drawFoods(context: CanvasRenderingContext2D): void {
    const drawFood = (
      actionId: FoodActionId,
      x: number,
      y: number,
      held = false,
    ) => {
      const definition = CODEX_ACTIONS[actionId];
      if (!isFoodAction(definition)) return;
      context.save();
      context.globalAlpha = held ? 0.92 : 1;
      context.font =
        `${held ? 24 : 20}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(definition.effect.emoji, Math.round(x), Math.round(y));
      context.restore();
    };
    for (const food of this.foods) {
      drawFood(food.actionId, food.x, food.y);
    }
    if (this.heldFood) {
      drawFood(
        this.heldFood.actionId,
        this.pointer.worldX,
        this.pointer.worldY - 18,
        true,
      );
    }
  }

  private drawEnemyBody(
    context: CanvasRenderingContext2D,
    enemy: EnemyState,
  ): void {
    const definition = ENEMY_DEFINITIONS[enemy.kind];
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);
    context.save();
    if (enemy.hurtTimer > 0) context.globalAlpha = 0.55;
    if (enemy.frozenUntil > this.elapsed) context.globalAlpha = 0.7;
    const facing = enemy.x < CORE_X ? 1 : -1;
    const drawFrames = (
      frames: Array<HTMLImageElement | null>,
      frameIndex: number,
    ): boolean => {
      const availableFrames = frames.filter(
        (frame): frame is HTMLImageElement => frame !== null,
      );
      const frame =
        availableFrames[
          Math.max(0, frameIndex) % Math.max(1, availableFrames.length)
        ];
      if (!frame) return false;
      if (facing < 0) {
        context.save();
        context.translate(x + definition.width, 0);
        context.scale(-1, 1);
        context.drawImage(
          frame,
          0,
          y,
          definition.width,
          definition.height,
        );
        context.restore();
      } else {
        context.drawImage(
          frame,
          x,
          y,
          definition.width,
          definition.height,
        );
      }
      return true;
    };
    if (enemy.kind === "walker") {
      const state =
        enemy.hurtTimer > 0
          ? "hit"
          : enemy.animationState === "attack"
            ? "attack"
            : Math.abs(enemy.vx) > 3
              ? "run"
              : "idle";
      const frames = this.mushroomImages[state];
      let frameIndex = 0;
      if (state === "attack") {
        frameIndex = Math.floor(
          (1 - Math.min(1, (enemy.animationTimer ?? 0) / 0.36)) *
            frames.length,
        );
      } else if (state === "hit") {
        frameIndex = Math.floor(
          (1 - Math.min(1, enemy.hurtTimer / 0.16)) * frames.length,
        );
      } else {
        frameIndex = Math.floor(this.elapsed * (state === "run" ? 10 : 6) + enemy.id * 0.7);
      }
      if (!drawFrames(frames, frameIndex)) {
        context.fillStyle = definition.color;
        context.fillRect(x, y, definition.width, definition.height);
      }
    } else if (
      enemy.kind === "brute" ||
      enemy.kind === "sapper" ||
      enemy.kind === "spitter"
    ) {
      const state =
        enemy.hurtTimer > 0
          ? "hit"
          : enemy.animationState === "attack"
            ? enemy.kind === "brute"
              ? "attack01"
              : "attack02"
            : Math.abs(enemy.vx) > 3
              ? "walk"
              : "idle";
      const frames = this.bloodMonsterImages[state];
      const frameIndex =
        state === "attack01" || state === "attack02"
          ? Math.floor(
              (1 - Math.min(1, (enemy.animationTimer ?? 0) / 0.36)) *
                frames.length,
            )
          : state === "hit"
            ? Math.floor(
                (1 - Math.min(1, enemy.hurtTimer / 0.16)) * frames.length,
              )
            : Math.floor(
                this.elapsed * (state === "walk" ? 9 : 5) + enemy.id * 0.41,
              );
      if (!drawFrames(frames, frameIndex)) {
        context.fillStyle = definition.color;
        context.fillRect(x, y, definition.width, definition.height);
      }
      if (enemy.kind === "brute") {
        context.strokeStyle = "#9aa36f";
        context.strokeRect(x + 2.5, y + 8.5, 9, 11);
      } else if (enemy.kind === "sapper") {
        context.fillStyle = "#d7b26e";
        context.fillRect(x + definition.width / 2 - 2, y + 2, 4, 9);
        context.fillRect(x + definition.width / 2 - 6, y + 1, 12, 4);
      } else {
        context.fillStyle = "#ef9ad0";
        context.fillRect(
          facing > 0 ? x + definition.width - 5 : x + 2,
          y + 15,
          4,
          4,
        );
      }
    } else if (enemy.kind === "flyer" || enemy.kind === "diver") {
      const state =
        enemy.hurtTimer > 0
          ? "hit"
          : enemy.animationState === "attack" ||
              (enemy.kind === "diver" && enemy.diveState === "dive")
            ? "attack"
            : "flight";
      const frames = this.flyingEyeImages[state];
      const frameIndex =
        state === "attack"
          ? Math.floor(
              (1 - Math.min(1, (enemy.animationTimer ?? 0) / 0.36)) *
                frames.length,
            )
          : state === "hit"
            ? Math.floor(
                (1 - Math.min(1, enemy.hurtTimer / 0.16)) * frames.length,
              )
            : Math.floor(this.elapsed * 9 + enemy.id * 0.43);
      if (!drawFrames(frames, frameIndex)) {
        context.fillStyle = definition.color;
        context.fillRect(x, y, definition.width, definition.height);
      }
    } else if (enemy.kind === "sky-devourer") {
      const state =
        enemy.hurtTimer > 0
          ? "hit"
          : enemy.animationState === "attack"
            ? enemy.health / enemy.maxHealth < 0.45
              ? "attack02"
              : "attack01"
            : "walk";
      const frames = this.demonImages[state];
      const frameIndex =
        state === "attack01" || state === "attack02"
          ? Math.floor(
              (1 - Math.min(1, (enemy.animationTimer ?? 0) / 0.55)) *
                frames.length,
            )
          : state === "hit"
            ? Math.floor(
                (1 - Math.min(1, enemy.hurtTimer / 0.16)) * frames.length,
              )
            : Math.floor(
                this.elapsed * (state === "walk" ? 7 : 4) + enemy.id * 0.29,
              );
      if (!drawFrames(frames, frameIndex)) {
        context.fillStyle = definition.color;
        context.fillRect(x, y, definition.width, definition.height);
      }
    } else {
      context.fillStyle = definition.color;
      if (
        definition.movement === "flyer" ||
        definition.movement === "diver"
      ) {
        context.fillRect(
          x + definition.width * 0.3,
          y + 5,
          definition.width * 0.4,
          definition.height - 6,
        );
        context.fillRect(x, y + 8, definition.width * 0.32, 8);
        context.fillRect(
          x + definition.width * 0.68,
          y + 8,
          definition.width * 0.32,
          8,
        );
      } else {
        context.fillRect(
          x + 3,
          y + 4,
          definition.width - 6,
          definition.height - 9,
        );
        context.fillRect(x, y + definition.height - 9, 7, 9);
        context.fillRect(
          x + definition.width - 7,
          y + definition.height - 9,
          7,
          9,
        );
      }
      context.fillStyle = "#f4d68c";
      context.fillRect(
        facing > 0 ? x + definition.width - 8 : x + 4,
        y + 9,
        3,
        3,
      );
    }
    if (enemy.resistance !== "none") {
      const colors: Record<Exclude<EnemyResistance, "none">, string> = {
        physical: "#f2c171",
        trap: "#d7ef9b",
        frost: "#81ddff",
      };
      context.strokeStyle = colors[enemy.resistance];
      context.strokeRect(x - 2.5, y - 2.5, definition.width + 5, definition.height + 5);
    }
    context.restore();
    const ratio = Math.max(0, enemy.health / enemy.maxHealth);
    const barWidth = Math.max(24, definition.width);
    context.fillStyle = "#221923";
    context.fillRect(x + definition.width / 2 - barWidth / 2, y - 8, barWidth, 4);
    context.fillStyle = enemy.kind === "sky-devourer" ? "#f06c78" : "#d78186";
    context.fillRect(
      x + definition.width / 2 - barWidth / 2,
      y - 8,
      barWidth * ratio,
      4,
    );
  }

  private drawEnemies(context: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) this.drawEnemyBody(context, enemy);
  }

  private drawEnemyDeaths(context: CanvasRenderingContext2D): void {
    for (const death of this.enemyDeaths) {
      const definition = ENEMY_DEFINITIONS[death.kind];
      const sourceFrames =
        death.kind === "walker"
          ? this.mushroomImages.die
          : death.kind === "brute" ||
              death.kind === "sapper" ||
              death.kind === "spitter"
            ? this.bloodMonsterImages.die
            : death.kind === "flyer" || death.kind === "diver"
              ? this.flyingEyeImages.die
            : death.kind === "sky-devourer"
              ? this.demonImages.die
              : [];
      const frames = sourceFrames.filter(
        (frame): frame is HTMLImageElement => frame !== null,
      );
      if (frames.length === 0) continue;
      const progress = Math.min(0.999, death.age / death.duration);
      const frame = frames[Math.floor(progress * frames.length)];
      context.save();
      context.globalAlpha = Math.min(1, (death.duration - death.age) * 4);
      if (death.facing < 0) {
        context.translate(death.x + definition.width, 0);
        context.scale(-1, 1);
        context.drawImage(
          frame,
          0,
          death.y,
          definition.width,
          definition.height,
        );
      } else {
        context.drawImage(
          frame,
          death.x,
          death.y,
          definition.width,
          definition.height,
        );
      }
      context.restore();
    }
  }

  private drawPlayer(context: CanvasRenderingContext2D): void {
    if (this.player.respawnTimer > 0) {
      context.globalAlpha = 0.35 + Math.sin(this.elapsed * 9) * 0.15;
      context.fillStyle = "#d6eff0";
      context.fillRect(CORE_X - 8, this.coreGround() - 54, 16, 36);
      context.globalAlpha = 1;
      return;
    }
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const blink =
      this.player.invulnerability > 0 &&
      Math.floor(this.player.invulnerability * 12) % 2 === 0;
    if (blink) context.globalAlpha = 0.45;
    const idleFrame =
      this.playerIdleImages[
        Math.floor(this.elapsed * 7) % this.playerIdleImages.length
      ];
    if (idleFrame) {
      const spriteWidth = 24;
      const spriteHeight = 40;
      const spriteX = x + PLAYER_WIDTH / 2 - spriteWidth / 2;
      const spriteY = y + PLAYER_HEIGHT - spriteHeight;
      context.save();
      if (this.player.facing < 0) {
        context.translate(spriteX + spriteWidth, 0);
        context.scale(-1, 1);
        context.drawImage(idleFrame, 0, spriteY, spriteWidth, spriteHeight);
      } else {
        context.drawImage(
          idleFrame,
          spriteX,
          spriteY,
          spriteWidth,
          spriteHeight,
        );
      }
      context.restore();
    } else {
      context.fillStyle = "#263b43";
      context.fillRect(x + 4, y + 14, PLAYER_WIDTH - 8, 20);
      context.fillStyle = "#d7b184";
      context.fillRect(x + 6, y + 3, PLAYER_WIDTH - 12, 13);
      context.fillStyle = "#693f38";
      context.fillRect(x + 4, y, PLAYER_WIDTH - 8, 7);
      context.fillStyle = "#2b2528";
      context.fillRect(
        this.player.facing > 0 ? x + PLAYER_WIDTH - 9 : x + 6,
        y + 9,
        2,
        2,
      );
      context.fillStyle = "#6f9d86";
      context.fillRect(x + 2, y + 34, 8, 6);
      context.fillRect(x + PLAYER_WIDTH - 10, y + 34, 8, 6);
    }
    if (this.player.tool === "blade") {
      const reach = this.player.attackAnimation > 0 ? 24 : 13;
      context.fillStyle = "#e6ddbf";
      context.fillRect(
        this.player.facing > 0 ? x + PLAYER_WIDTH - 1 : x - reach + 1,
        y + 24,
        reach,
        3,
      );
    } else {
      context.fillStyle = "#8f684c";
      context.fillRect(
        this.player.facing > 0 ? x + PLAYER_WIDTH - 2 : x - 10,
        y + 21,
        12,
        4,
      );
    }
    if (this.playerShieldUntil > this.elapsed) {
      context.strokeStyle = "#a5eff8";
      context.strokeRect(x - 4.5, y - 4.5, PLAYER_WIDTH + 9, PLAYER_HEIGHT + 9);
    }
    context.globalAlpha = 1;
  }

  private drawInkDrops(context: CanvasRenderingContext2D): void {
    for (const drop of this.inkDrops) {
      const pulse = 1 + Math.sin(this.elapsed * 8 + drop.id) * 0.15;
      context.fillStyle = "#211a2d";
      context.fillRect(drop.x - 4 * pulse, drop.y - 4 * pulse, 8 * pulse, 8 * pulse);
      context.fillStyle = "#b595e6";
      context.fillRect(drop.x - 2, drop.y - 3, 4, 5);
      context.fillStyle = "#eee0ff";
      context.fillRect(drop.x - 1, drop.y - 2, 1, 1);
    }
  }

  private drawProjectiles(context: CanvasRenderingContext2D): void {
    for (const projectile of this.projectiles) {
      const progress = 1 - projectile.life / projectile.maxLife;
      context.strokeStyle = projectile.color;
      context.lineWidth = projectile.chained ? 2 : 1;
      if (projectile.chained) {
        context.beginPath();
        context.moveTo(projectile.x, projectile.y);
        const midX = (projectile.x + projectile.targetX) / 2 + Math.sin(progress * 20) * 8;
        const midY = (projectile.y + projectile.targetY) / 2 - 5;
        context.lineTo(midX, midY);
        context.lineTo(projectile.targetX, projectile.targetY);
        context.stroke();
      } else {
        const x = projectile.x + (projectile.targetX - projectile.x) * progress;
        const y = projectile.y + (projectile.targetY - projectile.y) * progress;
        if (projectile.sprite === "fire") {
          const fireFrames = this.fireImages.filter(
            (frame): frame is HTMLImageElement => frame !== null,
          );
          const fireFrame =
            fireFrames[
              Math.min(
                Math.max(0, fireFrames.length - 1),
                Math.floor(progress * fireFrames.length),
              )
            ];
          if (fireFrame) {
            context.drawImage(fireFrame, x - 20, y - 20, 40, 40);
          } else {
            context.fillStyle = projectile.color;
            context.fillRect(x - 5, y - 5, 10, 10);
          }
        } else if (
          projectile.sprite === "archer-arrow" &&
          this.archerArrowImage
        ) {
          context.save();
          context.translate(x, y);
          context.rotate(
            Math.atan2(
              projectile.targetY - projectile.y,
              projectile.targetX - projectile.x,
            ),
          );
          context.drawImage(this.archerArrowImage, -7, -3, 14, 6);
          context.restore();
        } else {
          context.fillStyle = projectile.color;
          context.fillRect(x - 3, y - 2, 7, 4);
        }
      }
    }
  }

  private drawExplosions(context: CanvasRenderingContext2D): void {
    const frames = this.explosionImages.filter(
      (frame): frame is HTMLImageElement => frame !== null,
    );
    if (frames.length === 0) return;
    for (const explosion of this.explosions) {
      const progress = Math.min(0.999, explosion.age / explosion.duration);
      const frame = frames[Math.floor(progress * frames.length)];
      context.drawImage(
        frame,
        explosion.x - explosion.size / 2,
        explosion.y - explosion.size / 2,
        explosion.size,
        explosion.size,
      );
    }
  }

  private drawParticles(context: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
  }

  private drawWarnings(context: CanvasRenderingContext2D): void {
    for (const warning of this.warnings) {
      const alpha = Math.max(0, warning.life / warning.maxLife);
      context.globalAlpha = 0.35 + alpha * 0.65;
      context.fillStyle = "#ffcc78";
      if (warning.direction === "air-top") {
        context.fillRect(warning.x - 12, warning.y - 2, 24, 3);
        context.fillRect(warning.x - 2, warning.y - 12, 4, 24);
      } else {
        const y = warning.y - 22;
        context.beginPath();
        if (warning.direction.endsWith("left")) {
          context.moveTo(warning.x, y);
          context.lineTo(warning.x + 14, y - 8);
          context.lineTo(warning.x + 14, y + 8);
        } else {
          context.moveTo(warning.x, y);
          context.lineTo(warning.x - 14, y - 8);
          context.lineTo(warning.x - 14, y + 8);
        }
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  private drawPlacement(context: CanvasRenderingContext2D): void {
    if (!this.activeActionId) return;
    const definition = CODEX_ACTIONS[this.activeActionId];
    if (!isStructureAction(definition)) return;
    const preview = this.getPlacementPreview(definition);
    const centerX = this.player.x + PLAYER_WIDTH / 2;
    const centerY = this.player.y + PLAYER_HEIGHT / 2;
    context.fillStyle = "rgba(112,222,190,0.08)";
    context.fillRect(
      centerX - REACH_TILES_X * TILE_SIZE,
      centerY - REACH_TILES_Y * TILE_SIZE,
      REACH_TILES_X * TILE_SIZE * 2,
      REACH_TILES_Y * TILE_SIZE * 2,
    );
    context.fillStyle = preview.ok
      ? "rgba(117,234,182,0.38)"
      : "rgba(239,108,105,0.38)";
    context.fillRect(preview.x, preview.y, preview.width, preview.height);
    context.strokeStyle = preview.ok ? "#a6ffd7" : "#ff9b98";
    context.strokeRect(
      preview.x + 0.5,
      preview.y + 0.5,
      preview.width - 1,
      preview.height - 1,
    );
  }

  private drawCursor(context: CanvasRenderingContext2D): void {
    if (this.heldFood) return;
    const x = Math.round(this.pointer.screenX / CAMERA_ZOOM);
    const y = Math.round(this.pointer.screenY / CAMERA_ZOOM);
    context.strokeStyle = this.activeActionId ? "#d9ffd6" : "#f5e4b4";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x - 6, y);
    context.lineTo(x + 6, y);
    context.moveTo(x, y - 6);
    context.lineTo(x, y + 6);
    context.stroke();
    context.fillStyle = "#28323a";
    context.fillRect(x - 1, y - 1, 3, 3);
  }

  private mixColor(a: string, b: string, amount: number): string {
    const parse = (color: string) => [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ];
    const first = parse(a);
    const second = parse(b);
    const values = first.map((value, index) =>
      Math.round(value + (second[index] - value) * amount),
    );
    return `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
  }
}

export { ACTION_ORDER };
