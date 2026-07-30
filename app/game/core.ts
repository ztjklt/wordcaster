export const TILE_SIZE = 20;
export const CAMERA_ZOOM = 2;
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 40;
export const REACH_TILES_X = 6;
export const REACH_TILES_Y = 8;
export const WORLD_WIDTH = 160;
export const WORLD_HEIGHT = 30;
export const SURFACE_Y = 23;
export const CORE_MAX_HEALTH = 600;
export const MAX_INK = 60;
export const STARTING_INK = 24;
export const DAILY_LESSON_LIMIT = 8;
export const LEARNING_REVISION = 4;
export const SAVE_KEY = "word-caster-save-v2";
/** Kept only for one-way, non-destructive save migration. */
export const LEGACY_V2_SAVE_KEY = "duskwood-line-defense-v2";
/** Kept only for old V1 detection; V1 worlds are never loaded. */
export const LEGACY_SAVE_KEY = "duskwood-save-v1";
export const LEGACY_MIGRATION_MARKER = "word-caster-legacy-save-imported";

export type GamePhase =
  | "prep"
  | "wave"
  | "intermission"
  | "victory"
  | "defeat";

export type SpawnDirection =
  | "ground-left"
  | "ground-right"
  | "air-left"
  | "air-right"
  | "air-top";

export type VoiceQuality = "basic" | "standard" | "fluent";
export type VoiceSource = "voice" | "text";
export type ToolId = "blade" | "hammer";

export type ActionId =
  | "tower"
  | "archer"
  | "swordsman"
  | "spearman"
  | "knight"
  | "barricade"
  | "arrow-tower"
  | "spike-trap"
  | "shield"
  | "palisade"
  | "fireball"
  | "health-potion"
  | "apple"
  | "bread"
  | "mushroom"
  | "cheese"
  | "fish"
  | "meat"
  | "coffee"
  | "tea"
  | "juice"
  | "stone-wall"
  | "ballista"
  | "web-trap"
  | "frost-ward"
  | "lightning-bolt"
  | "healing-ward"
  | "iron-gate"
  | "freeze-cannon"
  | "chain-lightning"
  | "fortress-ward"
  | "homing-turret"
  | "meteor"
  | "sanctuary";

export const REQUIRED_STARTER_ACTIONS = [
  "tower",
  "archer",
  "barricade",
] as const satisfies readonly ActionId[];

export type StructureActionId = Extract<
  ActionId,
  | "tower"
  | "barricade"
  | "arrow-tower"
  | "spike-trap"
  | "palisade"
  | "stone-wall"
  | "ballista"
  | "web-trap"
  | "frost-ward"
  | "healing-ward"
  | "iron-gate"
  | "freeze-cannon"
  | "fortress-ward"
  | "homing-turret"
>;

export type UnitActionId = Extract<
  ActionId,
  "archer" | "swordsman" | "spearman" | "knight"
>;
export type FoodActionId = Extract<
  ActionId,
  | "apple"
  | "bread"
  | "mushroom"
  | "cheese"
  | "fish"
  | "meat"
  | "coffee"
  | "tea"
  | "juice"
>;
export const FOOD_ACTION_IDS = [
  "apple",
  "bread",
  "mushroom",
  "cheese",
  "fish",
  "meat",
  "coffee",
  "tea",
  "juice",
] as const satisfies readonly FoodActionId[];
export type SpellActionId = Exclude<
  ActionId,
  StructureActionId | UnitActionId | FoodActionId
>;

export type EnemyKind =
  | "walker"
  | "brute"
  | "sapper"
  | "spitter"
  | "flyer"
  | "diver"
  | "sky-devourer";

export type EnemyMovement = "walker" | "jumper" | "flyer" | "diver";
export type EnemyResistance = "none" | "physical" | "trap" | "frost";
export type TargetClass = "ground" | "air" | "both";
export type EnemySizeClass = "small" | "large" | "huge";

export const ENEMY_SIZE_PIXELS: Record<EnemySizeClass, 20 | 40 | 60> = {
  small: 20,
  large: 40,
  huge: 60,
};

export const ENEMY_WALL_ROWS: Record<EnemySizeClass, 1 | 2 | 3> = {
  small: 1,
  large: 2,
  huge: 3,
};

export interface Footprint {
  width: number;
  height: number;
}

export interface StructureEffectDefinition {
  type: "structure";
  footprint: Footprint;
  placement: "ground" | "supported" | "flat-surface";
  maxHealth: number;
  blocking: boolean;
  damage: number;
  attackInterval: number;
  rangeTiles: number;
  target: TargetClass;
  role:
    | "wall"
    | "tower"
    | "garrison"
    | "trap"
    | "slow-aura"
    | "healing-aura"
    | "fortress-aura";
}

export interface UnitEffectDefinition {
  type: "unit";
  role: "archer" | "swordsman" | "spearman" | "knight";
  maxHealth: number;
  damage: number;
  attackInterval: number;
  rangeTiles: number;
  target: TargetClass;
}

export interface SpellEffectDefinition {
  type: "spell" | "consumable";
  role:
    | "shield"
    | "fireball"
    | "heal-player"
    | "lightning"
    | "chain-lightning"
    | "meteor"
    | "sanctuary";
  power: number;
  radiusTiles: number;
  duration: number;
}

export type FoodEffectDefinition =
  | {
      type: "food";
      supplyType: "food";
      emoji: "🍎" | "🍞" | "🍄" | "🧀" | "🐟" | "🍖";
      healing: number;
    }
  | {
      type: "food";
      supplyType: "drink";
      emoji: "☕" | "🍵" | "🧃";
      nightInkRegen: number;
      duration: number;
    };

export interface CodexActionDefinition {
  id: ActionId;
  english: string;
  chinese: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  availableFromDay: 1 | 4;
  kind: "structure" | "trap" | "unit" | "spell" | "consumable" | "food";
  inkCost: number;
  description: string;
  example: string;
  color: string;
  aliases: string[];
  effect:
    | StructureEffectDefinition
    | UnitEffectDefinition
    | SpellEffectDefinition
    | FoodEffectDefinition;
}

const structure = (
  footprint: Footprint,
  placement: StructureEffectDefinition["placement"],
  maxHealth: number,
  blocking: boolean,
  damage: number,
  attackInterval: number,
  rangeTiles: number,
  target: TargetClass,
  role: StructureEffectDefinition["role"],
): StructureEffectDefinition => ({
  type: "structure",
  footprint,
  placement,
  maxHealth,
  blocking,
  damage,
  attackInterval,
  rangeTiles,
  target,
  role,
});

const spell = (
  role: SpellEffectDefinition["role"],
  power: number,
  radiusTiles: number,
  duration = 0,
  type: SpellEffectDefinition["type"] = "spell",
): SpellEffectDefinition => ({
  type,
  role,
  power,
  radiusTiles,
  duration,
});

const food = (
  emoji: Extract<FoodEffectDefinition, { supplyType: "food" }>["emoji"],
  healing: number,
): FoodEffectDefinition => ({
  type: "food",
  supplyType: "food",
  emoji,
  healing,
});

const drink = (
  emoji: Extract<FoodEffectDefinition, { supplyType: "drink" }>["emoji"],
  nightInkRegen: number,
  duration: number,
): FoodEffectDefinition => ({
  type: "food",
  supplyType: "drink",
  emoji,
  nightInkRegen,
  duration,
});

const unit = (
  role: UnitEffectDefinition["role"],
  maxHealth: number,
  damage: number,
  attackInterval: number,
  rangeTiles: number,
  target: TargetClass,
): UnitEffectDefinition => ({
  type: "unit",
  role,
  maxHealth,
  damage,
  attackInterval,
  rangeTiles,
  target,
});

export const CODEX_ACTIONS: Record<ActionId, CodexActionDefinition> = {
  tower: {
    id: "tower",
    english: "Tower",
    chinese: "塔",
    tier: 0,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 5,
    description: "可叠放的基础防御工事。每座塔驻守一名弓箭手，空塔本身只负责阻挡。",
    example: "Build a tower on the left.",
    color: "#b98a57",
    aliases: ["watchtower"],
    effect: structure({ width: 2, height: 3 }, "flat-surface", 320, true, 0, 0, 0, "ground", "garrison"),
  },
  archer: {
    id: "archer",
    english: "Archer",
    chinese: "弓箭手",
    tier: 0,
    availableFromDay: 1,
    kind: "unit",
    inkCost: 5,
    description: "优先进入空塔并攻击地面与空中敌人；塔位已满时在书台附近巡逻。",
    example: "Summon an archer to defend the tower.",
    color: "#d7c37b",
    aliases: ["bowman"],
    effect: unit("archer", 70, 14, 0.85, 12, "both"),
  },
  swordsman: {
    id: "swordsman",
    english: "Swordsman",
    chinese: "剑士",
    tier: 0,
    availableFromDay: 1,
    kind: "unit",
    inkCost: 6,
    description: "使用老武士形象在书台两侧巡逻，贴近地面敌人后进行快速近战。",
    example: "Summon a swordsman on the left.",
    color: "#d8c2a1",
    aliases: ["sword man", "warrior"],
    effect: unit("swordsman", 150, 22, 0.78, 1.7, "ground"),
  },
  spearman: {
    id: "spearman",
    english: "Spearman",
    chinese: "枪士",
    tier: 0,
    availableFromDay: 1,
    kind: "unit",
    inkCost: 6,
    description: "使用长枪从近战防线后方攻击地面敌人，射程比剑士更远。",
    example: "Summon a spearman to hold the line.",
    color: "#aebdca",
    aliases: ["spear man", "lancer"],
    effect: unit("spearman", 125, 20, 0.95, 2.8, "ground"),
  },
  knight: {
    id: "knight",
    english: "Knight",
    chinese: "骑士",
    tier: 0,
    availableFromDay: 1,
    kind: "unit",
    inkCost: 9,
    description: "高耐久重甲前排，会吸引三格内地面怪物并用盾牌保护后排。",
    example: "Summon a knight to hold the front line.",
    color: "#e0c878",
    aliases: ["armored knight"],
    effect: unit("knight", 280, 14, 1.05, 1.4, "ground"),
  },
  barricade: {
    id: "barricade",
    english: "Barricade",
    chinese: "路障",
    tier: 0,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 4,
    description: "一格高的基础木墙，可沿网格向上叠放；小型怪物无法越过。",
    example: "Build a barricade on the left.",
    color: "#c98c55",
    aliases: ["barrier"],
    effect: structure({ width: 1, height: 1 }, "supported", 105, true, 0, 0, 0, "ground", "wall"),
  },
  "arrow-tower": {
    id: "arrow-tower",
    english: "Arrow Tower",
    chinese: "箭塔",
    tier: 0,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 7,
    description: "射击射程内最接近书台的地面或空中敌人。",
    example: "Build an arrow tower on the right.",
    color: "#7ed5dd",
    aliases: ["arrow tower"],
    effect: structure({ width: 2, height: 3 }, "flat-surface", 130, false, 12, 0.9, 10, "both", "tower"),
  },
  "spike-trap": {
    id: "spike-trap",
    english: "Spike Trap",
    chinese: "尖刺陷阱",
    tier: 0,
    availableFromDay: 1,
    kind: "trap",
    inkCost: 3,
    description: "周期性刺伤从上方走过的地面敌人。",
    example: "Place a spike trap near the wall.",
    color: "#d7d49b",
    aliases: ["spikes", "spike"],
    effect: structure({ width: 2, height: 1 }, "ground", 90, false, 16, 0.95, 1.4, "ground", "trap"),
  },
  shield: {
    id: "shield",
    english: "Shield",
    chinese: "护盾",
    tier: 0,
    availableFromDay: 1,
    kind: "spell",
    inkCost: 4,
    description: "为鼠标附近的建筑或玩家提供短时护盾。",
    example: "Shield the tower from the attack.",
    color: "#92e9f6",
    aliases: ["protect"],
    effect: spell("shield", 90, 2.5, 5),
  },
  palisade: {
    id: "palisade",
    english: "Palisade",
    chinese: "尖刺木栅",
    tier: 1,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 5,
    description: "可叠放的一格尖刺木栅，会反伤贴近它的地面敌人。",
    example: "Build a palisade beside the gate.",
    color: "#dfaa63",
    aliases: ["wooden fence"],
    effect: structure({ width: 1, height: 1 }, "supported", 140, true, 6, 0.8, 1, "ground", "wall"),
  },
  fireball: {
    id: "fireball",
    english: "Fireball",
    chinese: "火球",
    tier: 1,
    availableFromDay: 1,
    kind: "spell",
    inkCost: 5,
    description: "轰击鼠标附近目标并伤害小范围敌人。",
    example: "Cast a fireball at the brute.",
    color: "#ff8054",
    aliases: ["fire ball", "burn"],
    effect: spell("fireball", 38, 2.2),
  },
  "health-potion": {
    id: "health-potion",
    english: "Health Potion",
    chinese: "生命药水",
    tier: 1,
    availableFromDay: 1,
    kind: "consumable",
    inkCost: 4,
    description: "恢复玩家30点生命，抵消近战带来的代价。",
    example: "Use a health potion now.",
    color: "#ef6f76",
    aliases: ["potion", "heal me"],
    effect: spell("heal-player", 30, 0, 0, "consumable"),
  },
  apple: {
    id: "apple",
    english: "Apple",
    chinese: "苹果",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 3,
    description: "召唤后跟随鼠标或手指；投放到我方单位身上可恢复28点生命。",
    example: "Give an apple to the knight.",
    color: "#f16d67",
    aliases: ["red apple"],
    effect: food("🍎", 28),
  },
  bread: {
    id: "bread",
    english: "Bread",
    chinese: "面包",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 4,
    description: "投放到我方单位身上可恢复34点生命。",
    example: "Give bread to the spearman.",
    color: "#d7a76d",
    aliases: ["loaf", "loaf of bread"],
    effect: food("🍞", 34),
  },
  mushroom: {
    id: "mushroom",
    english: "Mushroom",
    chinese: "蘑菇",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 4,
    description: "投放到我方单位身上可恢复30点生命。",
    example: "Give a mushroom to the swordsman.",
    color: "#ef8d72",
    aliases: ["red mushroom"],
    effect: food("🍄", 30),
  },
  cheese: {
    id: "cheese",
    english: "Cheese",
    chinese: "奶酪",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 5,
    description: "投放到我方单位身上可恢复42点生命。",
    example: "Give cheese to the knight.",
    color: "#f0c85c",
    aliases: ["cheese wedge"],
    effect: food("🧀", 42),
  },
  fish: {
    id: "fish",
    english: "Fish",
    chinese: "鱼",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 6,
    description: "投放到我方单位身上可恢复48点生命。",
    example: "Give the fish to the archer.",
    color: "#76b8d8",
    aliases: ["blue fish"],
    effect: food("🐟", 48),
  },
  meat: {
    id: "meat",
    english: "Meat",
    chinese: "肉",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 7,
    description: "投放到我方单位身上可恢复56点生命。",
    example: "Give meat to the knight.",
    color: "#cd776d",
    aliases: ["meat on bone"],
    effect: food("🍖", 56),
  },
  coffee: {
    id: "coffee",
    english: "Coffee",
    chinese: "咖啡",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 4,
    description: "投放到玩家自身后，夜晚每秒额外恢复0.18墨水，持续45秒。",
    example: "Drink coffee before nightfall.",
    color: "#c99565",
    aliases: ["cup of coffee"],
    effect: drink("☕", 0.18, 45),
  },
  tea: {
    id: "tea",
    english: "Tea",
    chinese: "茶",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 4,
    description: "投放到玩家自身后，夜晚每秒额外恢复0.12墨水，持续60秒。",
    example: "Drink tea before the next wave.",
    color: "#8fbd75",
    aliases: ["green tea", "cup of tea"],
    effect: drink("🍵", 0.12, 60),
  },
  juice: {
    id: "juice",
    english: "Juice",
    chinese: "果汁",
    tier: 1,
    availableFromDay: 1,
    kind: "food",
    inkCost: 3,
    description: "投放到玩家自身后，夜晚每秒额外恢复0.10墨水，持续75秒。",
    example: "Drink some juice.",
    color: "#f1a35c",
    aliases: ["juice box", "fruit juice"],
    effect: drink("🧃", 0.1, 75),
  },
  "stone-wall": {
    id: "stone-wall",
    english: "Stone Wall",
    chinese: "石墙",
    tier: 2,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 7,
    description: "耐久较高的一格石墙，可叠成两格或三格高墙阻挡大型怪物。",
    example: "Build a stone wall on the left.",
    color: "#9ba8a5",
    aliases: ["stone wall"],
    effect: structure({ width: 1, height: 1 }, "supported", 255, true, 0, 0, 0, "ground", "wall"),
  },
  ballista: {
    id: "ballista",
    english: "Ballista",
    chinese: "弩车",
    tier: 2,
    availableFromDay: 1,
    kind: "structure",
    inkCost: 9,
    description: "射速较慢，但能够贯穿两个地面目标。",
    example: "Build a ballista behind the wall.",
    color: "#d9bd7d",
    aliases: ["crossbow"],
    effect: structure({ width: 3, height: 2 }, "flat-surface", 170, false, 30, 1.9, 15, "ground", "tower"),
  },
  "web-trap": {
    id: "web-trap",
    english: "Web Trap",
    chinese: "蛛网陷阱",
    tier: 2,
    availableFromDay: 1,
    kind: "trap",
    inkCost: 4,
    description: "减慢地面敌人60%，持续三秒。",
    example: "Place a web trap before the gate.",
    color: "#d8e5dc",
    aliases: ["web", "spider web"],
    effect: structure({ width: 2, height: 1 }, "ground", 80, false, 2, 1.2, 1.5, "ground", "trap"),
  },
  "frost-ward": {
    id: "frost-ward",
    english: "Frost Ward",
    chinese: "冰霜结界",
    tier: 3,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 8,
    description: "减慢附近的地面与空中单位。",
    example: "Place a frost ward near the center.",
    color: "#8edfff",
    aliases: ["frost", "ice ward"],
    effect: structure({ width: 2, height: 2 }, "supported", 185, false, 0, 0, 5, "both", "slow-aura"),
  },
  "lightning-bolt": {
    id: "lightning-bolt",
    english: "Lightning Bolt",
    chinese: "闪电箭",
    tier: 3,
    availableFromDay: 4,
    kind: "spell",
    inkCost: 7,
    description: "重击鼠标附近的单一目标。",
    example: "Strike the flyer with a lightning bolt.",
    color: "#f7dc68",
    aliases: ["lightning", "bolt"],
    effect: spell("lightning", 64, 1),
  },
  "healing-ward": {
    id: "healing-ward",
    english: "Healing Ward",
    chinese: "治愈结界",
    tier: 3,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 8,
    description: "缓慢修复附近建筑，也治疗靠近的玩家。",
    example: "Build a healing ward behind the wall.",
    color: "#7fd6a8",
    aliases: ["healing ward", "healing"],
    effect: structure({ width: 2, height: 2 }, "supported", 150, false, 4, 1, 5, "both", "healing-aura"),
  },
  "iron-gate": {
    id: "iron-gate",
    english: "Iron Gate",
    chinese: "铁墙",
    tier: 4,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 10,
    description: "高耐久的一格铁墙，可纵向叠放组成更高的最终防线。",
    example: "Build an iron gate on the right.",
    color: "#aeb8bd",
    aliases: ["gate", "iron gate"],
    effect: structure({ width: 1, height: 1 }, "supported", 430, true, 0, 0, 0, "ground", "wall"),
  },
  "freeze-cannon": {
    id: "freeze-cannon",
    english: "Freeze Cannon",
    chinese: "冷冻炮",
    tier: 4,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 11,
    description: "优先攻击飞行敌人，每四发冻结一次目标。",
    example: "Build a freeze cannon for the flyers.",
    color: "#71cceb",
    aliases: ["freeze cannon", "ice cannon"],
    effect: structure({ width: 2, height: 3 }, "flat-surface", 190, false, 19, 1.55, 13, "both", "tower"),
  },
  "chain-lightning": {
    id: "chain-lightning",
    english: "Chain Lightning",
    chinese: "连锁闪电",
    tier: 4,
    availableFromDay: 4,
    kind: "spell",
    inkCost: 10,
    description: "在最多五个邻近敌人之间跃动。",
    example: "Cast chain lightning at the swarm.",
    color: "#fff18b",
    aliases: ["chain lightning", "thunder chain"],
    effect: spell("chain-lightning", 50, 5),
  },
  "fortress-ward": {
    id: "fortress-ward",
    english: "Fortress Ward",
    chinese: "堡垒结界",
    tier: 5,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 14,
    description: "让附近建筑受到的伤害降低35%。",
    example: "Place a fortress ward around the core.",
    color: "#c7a9ef",
    aliases: ["fortress", "fortress ward"],
    effect: structure({ width: 2, height: 3 }, "supported", 520, true, 0, 0, 6, "both", "fortress-aura"),
  },
  "homing-turret": {
    id: "homing-turret",
    english: "Homing Turret",
    chinese: "追踪炮台",
    tier: 5,
    availableFromDay: 4,
    kind: "structure",
    inkCost: 13,
    description: "高速攻击地面和空中单位，不受高度影响。",
    example: "Build a homing turret above the gate.",
    color: "#f0a7ca",
    aliases: ["homing turret", "turret"],
    effect: structure({ width: 2, height: 3 }, "flat-surface", 225, false, 16, 0.6, 13, "both", "tower"),
  },
  meteor: {
    id: "meteor",
    english: "Meteor",
    chinese: "陨石",
    tier: 5,
    availableFromDay: 4,
    kind: "spell",
    inkCost: 16,
    description: "对鼠标附近的大范围敌人造成毁灭性伤害。",
    example: "Call a meteor on the giant.",
    color: "#ff9a57",
    aliases: ["meteor strike"],
    effect: spell("meteor", 145, 4.5),
  },
  sanctuary: {
    id: "sanctuary",
    english: "Sanctuary",
    chinese: "圣所",
    tier: 5,
    availableFromDay: 4,
    kind: "spell",
    inkCost: 14,
    description: "修复书台并暂时保护中央区域内的全部建筑。",
    example: "Create a sanctuary around the book.",
    color: "#f6e8ad",
    aliases: ["holy sanctuary"],
    effect: spell("sanctuary", 80, 8, 6),
  },
};

export const ACTION_ORDER: ActionId[] = [
  "tower",
  "archer",
  "swordsman",
  "spearman",
  "knight",
  "barricade",
  "arrow-tower",
  "spike-trap",
  "shield",
  "palisade",
  "fireball",
  "health-potion",
  "apple",
  "bread",
  "mushroom",
  "cheese",
  "fish",
  "meat",
  "coffee",
  "tea",
  "juice",
  "stone-wall",
  "ballista",
  "web-trap",
  "frost-ward",
  "lightning-bolt",
  "healing-ward",
  "iron-gate",
  "freeze-cannon",
  "chain-lightning",
  "fortress-ward",
  "homing-turret",
  "meteor",
  "sanctuary",
];

export function canLearnCampaignAction(
  actionId: ActionId,
  dayIndex: number,
): boolean {
  const currentDay = Math.max(1, Math.floor(dayIndex) + 1);
  return CODEX_ACTIONS[actionId].availableFromDay <= currentDay;
}

export interface EnemyDefinition {
  id: EnemyKind;
  name: string;
  movement: EnemyMovement;
  sizeClass: EnemySizeClass;
  health: number;
  speed: number;
  damage: number;
  attackInterval: number;
  inkDrop: number;
  width: number;
  height: number;
  color: string;
  /** Derived compatibility field: number of one-tile wall segments this enemy can vault over. */
  wallJumpRows: 0 | 1 | 2;
}

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  walker: {
    id: "walker",
    name: "蘑菇怪",
    movement: "walker",
    sizeClass: "small",
    health: 54,
    speed: 31,
    damage: 11,
    attackInterval: 1.15,
    inkDrop: 2,
    width: 20,
    height: 20,
    color: "#a7c66a",
    wallJumpRows: 0,
  },
  brute: {
    id: "brute",
    name: "重甲血魔",
    movement: "walker",
    sizeClass: "large",
    health: 145,
    speed: 19,
    damage: 23,
    attackInterval: 1.45,
    inkDrop: 4,
    width: 40,
    height: 40,
    color: "#869b62",
    wallJumpRows: 1,
  },
  sapper: {
    id: "sapper",
    name: "破城血魔",
    movement: "jumper",
    sizeClass: "large",
    health: 82,
    speed: 27,
    damage: 19,
    attackInterval: 0.95,
    inkDrop: 4,
    width: 40,
    height: 40,
    color: "#d39a57",
    wallJumpRows: 1,
  },
  spitter: {
    id: "spitter",
    name: "吐息血魔",
    movement: "walker",
    sizeClass: "large",
    health: 66,
    speed: 23,
    damage: 15,
    attackInterval: 1.8,
    inkDrop: 3,
    width: 40,
    height: 40,
    color: "#bb78a7",
    wallJumpRows: 0,
  },
  flyer: {
    id: "flyer",
    name: "低空影蛾",
    movement: "flyer",
    sizeClass: "large",
    health: 72,
    speed: 38,
    damage: 15,
    attackInterval: 1.25,
    inkDrop: 3,
    width: 40,
    height: 40,
    color: "#9b85d2",
    wallJumpRows: 2,
  },
  diver: {
    id: "diver",
    name: "俯冲兽",
    movement: "diver",
    sizeClass: "large",
    health: 96,
    speed: 45,
    damage: 25,
    attackInterval: 1.5,
    inkDrop: 4,
    width: 40,
    height: 40,
    color: "#e17b74",
    wallJumpRows: 2,
  },
  "sky-devourer": {
    id: "sky-devourer",
    name: "恶魔",
    movement: "flyer",
    sizeClass: "huge",
    health: 760,
    speed: 29,
    damage: 34,
    attackInterval: 1.2,
    inkDrop: 20,
    width: 60,
    height: 60,
    color: "#e56376",
    wallJumpRows: 2,
  },
};

export interface WaveScaling {
  healthMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  abilities: string[];
}

export interface WaveDefinition {
  index: number;
  title: string;
  durationTarget: number;
  counts: Partial<Record<EnemyKind, number>>;
  abilities: string[];
}

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    index: 0,
    title: "第一关 · 两侧脚步",
    durationTarget: 75,
    counts: { walker: 12 },
    abilities: [],
  },
  {
    index: 1,
    title: "第二关 · 锤与齿",
    durationTarget: 100,
    counts: { walker: 10, brute: 3, sapper: 3 },
    abilities: ["拆墙兽对建筑额外造成20%伤害"],
  },
  {
    index: 2,
    title: "第三关 · 双线压迫",
    durationTarget: 120,
    counts: { walker: 10, brute: 4, sapper: 4, spitter: 4 },
    abilities: ["地面怪低于40%生命时移动加快15%"],
  },
  {
    index: 3,
    title: "第四关 · 低空阴影",
    durationTarget: 135,
    counts: { walker: 8, brute: 3, sapper: 3, spitter: 2, flyer: 6 },
    abilities: ["飞行怪越过地面防线", "地面怪击退抗性提高15%"],
  },
  {
    index: 4,
    title: "第五关 · 天穹裂口",
    durationTarget: 160,
    counts: { walker: 8, brute: 4, sapper: 4, spitter: 4, flyer: 6, diver: 4 },
    abilities: ["部分敌人获得20%抗性", "俯冲兽从正上方锁定目标"],
  },
  {
    index: 5,
    title: "第六关 · 恶魔降临",
    durationTarget: 180,
    counts: {
      walker: 6,
      brute: 4,
      sapper: 4,
      spitter: 4,
      flyer: 5,
      diver: 3,
      "sky-devourer": 1,
    },
    abilities: ["靠近书台时攻击速度提高10%", "首领拥有三个阶段"],
  },
];

export interface SpawnInstruction {
  at: number;
  kind: EnemyKind;
  direction: SpawnDirection;
  resistance: EnemyResistance;
}

export function getWaveScaling(waveIndex: number): WaveScaling {
  const cleared = Math.max(0, Math.min(5, Math.floor(waveIndex)));
  return {
    healthMultiplier: 1.18 ** cleared,
    damageMultiplier: 1.12 ** cleared,
    speedMultiplier: Math.min(1.15, 1 + cleared * 0.03),
    abilities: WAVE_DEFINITIONS[cleared]?.abilities ?? [],
  };
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function directionFor(kind: EnemyKind, index: number, random: () => number): SpawnDirection {
  if (kind === "diver" || kind === "sky-devourer") return "air-top";
  if (kind === "flyer") {
    return (index + Math.floor(random() * 2)) % 2 === 0 ? "air-left" : "air-right";
  }
  return (index + Math.floor(random() * 2)) % 2 === 0 ? "ground-left" : "ground-right";
}

export function createWaveSchedule(waveIndex: number, seed: number): SpawnInstruction[] {
  const definition = WAVE_DEFINITIONS[waveIndex];
  if (!definition) return [];
  const random = seededRandom(seed ^ ((waveIndex + 1) * 2_654_435_761));
  const kinds: EnemyKind[] = [];
  for (const [kind, count] of Object.entries(definition.counts) as Array<
    [EnemyKind, number]
  >) {
    for (let index = 0; index < count; index += 1) kinds.push(kind);
  }
  const bossIndex = kinds.indexOf("sky-devourer");
  if (bossIndex >= 0) kinds.splice(bossIndex, 1);
  for (let index = kinds.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [kinds[index], kinds[swap]] = [kinds[swap], kinds[index]];
  }
  const total = kinds.length;
  const schedule = kinds.map((kind, index) => ({
    at:
      2 +
      (index / Math.max(1, total - 1)) * (definition.durationTarget - 14) +
      random() * 2.4,
    kind,
    direction: directionFor(kind, index, random),
    resistance:
      waveIndex >= 4 && random() < 0.42
        ? (["physical", "trap", "frost"] as EnemyResistance[])[
            Math.floor(random() * 3)
          ]
        : "none",
  }));
  if (bossIndex >= 0) {
    schedule.push({
      at: 8,
      kind: "sky-devourer",
      direction: "air-top",
      resistance: "none",
    });
  }
  return schedule.sort((a, b) => a.at - b.at);
}

export interface VoiceIntent {
  actionId: ActionId;
  quality: VoiceQuality;
  transcript: string;
  matchKind: "exact" | "joined" | "tolerant";
  recognizedPhrase: string;
  targetHint?: string;
}

export type VoiceResolution =
  | { kind: "action"; intent: VoiceIntent }
  | { kind: "begin-wave"; transcript: string }
  | { kind: "ambiguous"; candidates: ActionId[]; transcript: string }
  | { kind: "unknown"; transcript: string };

const ACTION_WORDS = new Set([
  "build",
  "place",
  "create",
  "cast",
  "call",
  "use",
  "summon",
  "strike",
  "shield",
]);

const MODIFIER_WORDS = new Set([
  "left",
  "right",
  "near",
  "behind",
  "before",
  "above",
  "below",
  "center",
  "core",
  "book",
  "enemy",
  "flyer",
  "brute",
  "wall",
  "gate",
  "now",
]);

export function normalizeTranscript(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[-']/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactTranscript(input: string): string {
  return normalizeTranscript(input).replace(/\s+/g, "");
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }
  return previous[right.length];
}

function tolerantLimit(length: number): number {
  if (length >= 8) return 2;
  if (length >= 6) return 1;
  return -1;
}

function targetHintFrom(tokens: string[]): string | undefined {
  return tokens.find((token) =>
    ["left", "right", "center", "above", "below"].includes(token),
  );
}

export function resolveVoiceIntent(
  transcript: string,
  dayIndex: number,
  learnedActions?: Partial<Record<ActionId, number>>,
): VoiceResolution {
  const normalized = normalizeTranscript(transcript);
  const compact = compactTranscript(transcript);
  const tokens = normalized.split(" ").filter(Boolean);
  if (
    ["begin the wave", "start the wave", "begin wave", "start wave"].some(
      (phrase) =>
        normalized.includes(phrase) ||
        compact.includes(compactTranscript(phrase)),
    )
  ) {
    return { kind: "begin-wave", transcript };
  }

  const unlocked = ACTION_ORDER.filter(
    (id) =>
      canLearnCampaignAction(id, dayIndex) &&
      (learnedActions === undefined || (learnedActions[id] ?? 0) > 0),
  );
  const fullMatches = unlocked
    .map((id) => {
      const title = normalizeTranscript(CODEX_ACTIONS[id].english);
      const titleCompact = compactTranscript(title);
      if (normalized === title || normalized.includes(title)) {
        return { id, matchKind: "exact" as const, recognizedPhrase: title };
      }
      if (compact === titleCompact || compact.includes(titleCompact)) {
        return {
          id,
          matchKind: "joined" as const,
          recognizedPhrase: titleCompact,
        };
      }
      return null;
    })
    .filter(
      (
        match,
      ): match is {
        id: ActionId;
        matchKind: "exact" | "joined";
        recognizedPhrase: string;
      } => Boolean(match),
    )
    .sort(
      (a, b) =>
        CODEX_ACTIONS[b.id].english.length -
        CODEX_ACTIONS[a.id].english.length,
    );

  let matched:
    | {
        id: ActionId;
        matchKind: "exact" | "joined" | "tolerant";
        recognizedPhrase: string;
      }
    | null = fullMatches[0] ?? null;
  if (!matched) {
    const aliasMatches = unlocked.flatMap((id) =>
      CODEX_ACTIONS[id].aliases.flatMap((alias) => {
        const normalizedAlias = normalizeTranscript(alias);
        const aliasCompact = compactTranscript(alias);
        const exact =
          normalized === normalizedAlias ||
          normalized.split(" ").includes(normalizedAlias);
        const joined =
          compact === aliasCompact ||
          (aliasCompact.length >= 6 && compact.includes(aliasCompact));
        return exact || joined
          ? [{
              id,
              matchKind: exact ? "exact" as const : "joined" as const,
              recognizedPhrase: exact ? normalizedAlias : aliasCompact,
            }]
          : [];
      }),
    );
    const aliasIds = [...new Set(aliasMatches.map((match) => match.id))];
    if (aliasIds.length > 1) {
      return { kind: "ambiguous", candidates: aliasIds, transcript };
    }
    matched = aliasMatches[0] ?? null;
  }
  if (!matched) {
    const tolerantMatches = unlocked
      .flatMap((id) => {
        const titleCompact = compactTranscript(CODEX_ACTIONS[id].english);
        const limit = tolerantLimit(titleCompact.length);
        if (limit < 0) return [];
        let best:
          | { distance: number; recognizedPhrase: string }
          | undefined;
        const titleWords = normalizeTranscript(
          CODEX_ACTIONS[id].english,
        ).split(" ").length;
        const maximumWindow = Math.min(tokens.length, titleWords + 1);
        for (let start = 0; start < tokens.length; start += 1) {
          for (let size = 1; size <= maximumWindow; size += 1) {
            const phraseTokens = tokens.slice(start, start + size);
            if (phraseTokens.length !== size) continue;
            const candidate = phraseTokens.join("");
            if (Math.abs(candidate.length - titleCompact.length) > limit) continue;
            const distance = editDistance(candidate, titleCompact);
            if (distance > limit || (best && distance >= best.distance)) continue;
            best = {
              distance,
              recognizedPhrase: phraseTokens.join(" "),
            };
          }
        }
        return best ? [{ id, ...best }] : [];
      })
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          CODEX_ACTIONS[right.id].english.length -
            CODEX_ACTIONS[left.id].english.length,
      );
    if (tolerantMatches.length > 0) {
      const bestDistance = tolerantMatches[0].distance;
      const contenders = tolerantMatches.filter(
        (match) => match.distance - bestDistance < 2,
      );
      const contenderIds = [...new Set(contenders.map((match) => match.id))];
      if (contenderIds.length > 1) {
        return { kind: "ambiguous", candidates: contenderIds, transcript };
      }
      matched = {
        id: tolerantMatches[0].id,
        matchKind: "tolerant",
        recognizedPhrase: tolerantMatches[0].recognizedPhrase,
      };
    }
  }
  if (!matched) return { kind: "unknown", transcript };

  const title = normalizeTranscript(CODEX_ACTIONS[matched.id].english);
  const titleCompact = compactTranscript(title);
  const hasAction = tokens.some((token) => ACTION_WORDS.has(token));
  const hasModifier = tokens.some((token) => MODIFIER_WORDS.has(token));
  const quality: VoiceQuality =
    compact === titleCompact
      ? "basic"
      : hasAction && hasModifier && tokens.length >= 4
        ? "fluent"
        : hasAction
          ? "standard"
          : "basic";

  return {
    kind: "action",
    intent: {
      actionId: matched.id,
      quality,
      transcript,
      matchKind: matched.matchKind,
      recognizedPhrase: matched.recognizedPhrase,
      targetHint: targetHintFrom(tokens),
    },
  };
}

export function effectiveInkCost(
  actionId: ActionId,
  quality: VoiceQuality,
  source: VoiceSource = "voice",
): number {
  const base = CODEX_ACTIONS[actionId].inkCost;
  if (source === "text" || quality === "basic") return base;
  if (quality === "standard") return Math.max(1, base - 1);
  return Math.max(1, Math.ceil(base * 0.8));
}

export function qualityPower(
  quality: VoiceQuality,
  source: VoiceSource = "voice",
): number {
  if (source === "text" || quality === "basic") return 1;
  return quality === "standard" ? 1.1 : 1.2;
}

export function meleeHealthCost(hitCount: number): 0 | 2 {
  return hitCount > 0 ? 2 : 0;
}

export function wallBlocksEnemy(
  stackedRows: number,
  enemyJumpRows: number,
): boolean {
  return Math.max(0, Math.floor(stackedRows)) > Math.max(0, enemyJumpRows);
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  facing: -1 | 1;
  onGround: boolean;
  invulnerability: number;
  attackCooldown: number;
  attackAnimation: number;
  respawnTimer: number;
  tool: ToolId;
}

export interface StructureState {
  id: number;
  actionId: StructureActionId;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  nextActionAt: number;
  shieldUntil: number;
  power: number;
  shotCount: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  direction: SpawnDirection;
  resistance: EnemyResistance;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  nextAttackAt: number;
  slowedUntil: number;
  frozenUntil: number;
  hurtTimer: number;
  animationState?: "idle" | "run" | "attack" | "hit";
  animationTimer?: number;
  diveState: "approach" | "warning" | "dive" | "recover";
  diveTimer: number;
  /** Grid column of a wall stack this enemy has committed to dismantling. */
  siegeColumnX?: number | null;
  /** Current wall layer (ground = 1) being attacked in that committed column. */
  siegeLayer?: 1 | 2 | 3 | null;
}

export interface WallCollapseResult {
  destroyedId: number;
  collapsedIds: number[];
}

export function resolveWallCollapse(
  groundUpWallIds: readonly number[],
  destroyedId: number,
): WallCollapseResult {
  const layerIndex = groundUpWallIds.indexOf(destroyedId);
  return {
    destroyedId,
    collapsedIds:
      layerIndex < 0 ? [] : groundUpWallIds.slice(layerIndex + 1),
  };
}

export interface InkDropState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  amount: number;
  age: number;
}

export interface FoodState {
  id: number;
  actionId: FoodActionId;
  x: number;
  y: number;
  power: number;
}

export interface HeldFoodState {
  actionId: FoodActionId;
  power: number;
}

export interface ArcherState {
  id: number;
  /** Missing in older V2 saves; those entries are treated as archers. */
  actionId?: UnitActionId;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  towerId: number | null;
  nextAttackAt: number;
  facing: -1 | 1;
  patrolDirection: -1 | 1;
  power: number;
  shotCount: number;
  animationTimer?: number;
  hurtTimer?: number;
}

export interface WordMastery {
  uses: number;
  spokenUses: number;
  fluentUses: number;
}

export interface LearningDayState {
  dayIndex: number;
  learnedWordKeys: string[];
  limit: 8;
}

export function normalizeLearningWordKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recordDailyLesson(
  state: LearningDayState,
  english: string,
  newlyLearned: boolean,
): { accepted: boolean; state: LearningDayState } {
  const wordKey = normalizeLearningWordKey(english);
  if (
    !newlyLearned ||
    !wordKey ||
    state.learnedWordKeys.includes(wordKey)
  ) {
    return { accepted: true, state };
  }
  if (state.learnedWordKeys.length >= state.limit) {
    return { accepted: false, state };
  }
  return {
    accepted: true,
    state: {
      ...state,
      learnedWordKeys: [...state.learnedWordKeys, wordKey],
    },
  };
}

export interface SaveGameV2 {
  version: 2;
  savedAt: number;
  seed: number;
  phase: GamePhase;
  waveIndex: number;
  phaseTimer: number;
  waveElapsed: number;
  spawnCursor: number;
  player: Pick<
    PlayerState,
    "x" | "y" | "health" | "facing" | "respawnTimer" | "tool"
  >;
  coreHealth: number;
  ink: number;
  unlockedTier: number;
  structures: StructureState[];
  archers?: ArcherState[];
  enemies: EnemyState[];
  inkDrops: InkDropState[];
  foods?: FoodState[];
  heldFood?: HeldFoodState | null;
  nightInkRegenBonus?: number;
  nightInkRegenRemaining?: number;
  nightInkRegenAccumulator?: number;
  wordMastery: Partial<Record<ActionId, WordMastery>>;
  learnedActions?: Partial<Record<ActionId, number>>;
  learningRevision?: number;
  learningDay?: LearningDayState;
}

export function encodeSave(save: SaveGameV2): string {
  return JSON.stringify(save);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function decodeSave(raw: string | null): SaveGameV2 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SaveGameV2>;
    if (
      value.version !== 2 ||
      !finite(value.seed) ||
      !finite(value.waveIndex) ||
      !finite(value.phaseTimer) ||
      !finite(value.waveElapsed) ||
      !finite(value.spawnCursor) ||
      !finite(value.coreHealth) ||
      !finite(value.ink) ||
      !finite(value.unlockedTier) ||
      !value.player ||
      !finite(value.player.x) ||
      !finite(value.player.y) ||
      !finite(value.player.health) ||
      !Array.isArray(value.structures) ||
      !Array.isArray(value.enemies) ||
      !Array.isArray(value.inkDrops) ||
      !["prep", "wave", "intermission", "victory", "defeat"].includes(
        value.phase ?? "",
      )
    ) {
      return null;
    }
    return value as SaveGameV2;
  } catch {
    return null;
  }
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function phaseLabel(phase: GamePhase): string {
  if (phase === "prep") return "第一日白昼";
  if (phase === "intermission") return "白昼学习与布防";
  if (phase === "wave") return "夜晚进攻";
  if (phase === "victory") return "召唤门已关闭";
  return "言灵封印已破碎";
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}
