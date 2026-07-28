import Phaser from 'phaser';
import type { GameplayCommand } from '../../language/GameplayCommand';
import { SaveManager } from '../../storage/SaveManager';
import { getArena } from '../arena/BattleContent';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

interface ObjectSpec {
  emoji: string;
  label: string;
  color: number;
  width: number;
  height: number;
  immovable?: boolean;
}

const OBJECT_SPECS: Record<string, ObjectSpec> = {
  light: { emoji: '💡', label: 'LIGHT', color: 0xffd76d, width: 68, height: 82, immovable: true },
  chair: { emoji: '🪑', label: 'CHAIR', color: 0xc98c62, width: 70, height: 86 },
  bottle: { emoji: '🍾', label: 'BOTTLE', color: 0x67dff5, width: 58, height: 82 },
  box: { emoji: '📦', label: 'BOX', color: 0xd69a4b, width: 78, height: 78 },
  cabinet: { emoji: '🗄️', label: 'CABINET', color: 0xb48a65, width: 88, height: 116, immovable: true },
  lantern: { emoji: '🏮', label: 'LANTERN', color: 0xff6f83, width: 70, height: 92, immovable: true },
  bell: { emoji: '🔔', label: 'BELL', color: 0xffd35f, width: 68, height: 78 },
  gate: { emoji: '⛩️', label: 'GATE', color: 0xff6684, width: 112, height: 122, immovable: true },
  charm: { emoji: '🧿', label: 'CHARM', color: 0x6ccfff, width: 64, height: 76 },
  bamboo: { emoji: '🎋', label: 'BAMBOO', color: 0x5ee0a0, width: 72, height: 108, immovable: true },
  leaf: { emoji: '🍃', label: 'LEAF', color: 0x75e99b, width: 60, height: 68 },
  umbrella: { emoji: '☂️', label: 'UMBRELLA', color: 0x8ec7ff, width: 82, height: 92 },
  bridge: { emoji: '🌉', label: 'BRIDGE', color: 0x82ccef, width: 118, height: 74, immovable: true },
  noodles: { emoji: '🍜', label: 'NOODLES', color: 0xffa75f, width: 76, height: 74 },
  coin: { emoji: '🪙', label: 'COIN', color: 0xffd462, width: 58, height: 65 },
  basket: { emoji: '🧺', label: 'BASKET', color: 0xd8a56d, width: 78, height: 72 },
  cup: { emoji: '☕', label: 'CUP', color: 0xead6bd, width: 64, height: 67 },
  plate: { emoji: '🍽️', label: 'PLATE', color: 0xccecff, width: 72, height: 68 },
  spoon: { emoji: '🥄', label: 'SPOON', color: 0xcbe5ef, width: 55, height: 75 },
  pan: { emoji: '🍳', label: 'PAN', color: 0xffbf62, width: 82, height: 70 },
  kettle: { emoji: '🫖', label: 'KETTLE', color: 0xf0a583, width: 76, height: 74 },
  fridge: { emoji: '🧊', label: 'FRIDGE', color: 0x93e1f2, width: 82, height: 116, immovable: true },
  apple: { emoji: '🍎', label: 'APPLE', color: 0xff6675, width: 58, height: 65 },
  table: { emoji: '🪑', label: 'TABLE', color: 0xc78c61, width: 105, height: 76, immovable: true },
  book: { emoji: '📖', label: 'BOOK', color: 0x77b9ff, width: 76, height: 68 },
  lamp: { emoji: '💡', label: 'LAMP', color: 0xffdb72, width: 66, height: 82, immovable: true },
  computer: { emoji: '💻', label: 'COMPUTER', color: 0x70ddf5, width: 92, height: 76 },
  phone: { emoji: '📱', label: 'PHONE', color: 0x8a9fff, width: 55, height: 76 },
  clock: { emoji: '⏰', label: 'CLOCK', color: 0xff8c75, width: 68, height: 72 },
  window: { emoji: '🪟', label: 'WINDOW', color: 0x75d7f4, width: 90, height: 98, immovable: true },
  desk: { emoji: '🗄️', label: 'DESK', color: 0xb98a69, width: 100, height: 80, immovable: true },
  ticket: { emoji: '🎫', label: 'TICKET', color: 0xff81b2, width: 66, height: 66 },
  train: { emoji: '🚆', label: 'TRAIN', color: 0x68d7ef, width: 116, height: 78 },
  door: { emoji: '🚪', label: 'DOOR', color: 0xc58c5e, width: 78, height: 116, immovable: true },
  seat: { emoji: '💺', label: 'SEAT', color: 0x789ee9, width: 72, height: 82 },
  bag: { emoji: '🎒', label: 'BAG', color: 0xef707d, width: 68, height: 76 },
  map: { emoji: '🗺️', label: 'MAP', color: 0x77dfb0, width: 80, height: 70 },
};

export interface ObjectPlacement {
  id: string;
  x: number;
  y: number;
  scale: number;
  solid: boolean;
  surface: 'ground' | 'left-platform' | 'right-platform';
}

const SOLID_PRIORITY = [
  'gate', 'bridge', 'fridge', 'table', 'window', 'desk', 'door', 'cabinet',
  'bamboo', 'lantern', 'light', 'lamp',
] as const;

const SOLID_SLOTS = [
  { x: 1200, surfaceY: 542, surface: 'ground' as const },
  { x: 88, surfaceY: 542, surface: 'ground' as const },
];

const DISPLAY_SLOTS = [
  { x: 320, surfaceY: 421, surface: 'left-platform' as const },
  { x: 450, surfaceY: 421, surface: 'left-platform' as const },
  { x: 580, surfaceY: 542, surface: 'ground' as const },
  { x: 750, surfaceY: 361, surface: 'right-platform' as const },
  { x: 885, surfaceY: 361, surface: 'right-platform' as const },
  { x: 1020, surfaceY: 542, surface: 'ground' as const },
  { x: 700, surfaceY: 542, surface: 'ground' as const },
  { x: 1080, surfaceY: 542, surface: 'ground' as const },
];

export function planObjectLayout(ids: readonly string[]): ObjectPlacement[] {
  const availableIds = [...new Set(ids)].filter((id) => Boolean(OBJECT_SPECS[id])).slice(0, 8);
  const solidIds = availableIds
    .filter((id) => OBJECT_SPECS[id].immovable)
    .sort((left, right) => {
      const leftRank = SOLID_PRIORITY.indexOf(left as typeof SOLID_PRIORITY[number]);
      const rightRank = SOLID_PRIORITY.indexOf(right as typeof SOLID_PRIORITY[number]);
      return (leftRank < 0 ? 999 : leftRank) - (rightRank < 0 ? 999 : rightRank);
    })
    .slice(0, 2);
  let solidIndex = 0;
  let displayIndex = 0;
  return availableIds.map((id) => {
    const spec = OBJECT_SPECS[id];
    const solid = solidIds.includes(id);
    const slot = solid ? SOLID_SLOTS[solidIndex++] : DISPLAY_SLOTS[displayIndex++];
    const scale = solid ? 1 : .82;
    return {
      id,
      x: slot.x,
      y: slot.surfaceY - spec.height * scale / 2,
      scale,
      solid,
      surface: slot.surface,
    };
  });
}

const USE_MESSAGES: Record<string, string> = {
  lantern: 'Lantern lit · 灯笼亮起',
  bell: 'Bell rings · 铃声扩散',
  gate: 'Gate activated · 鸟居回应',
  charm: 'Charm awakened · 护符苏醒',
  bamboo: 'Bamboo resonates · 竹影共鸣',
  leaf: 'Leaf released · 叶片随风而起',
  umbrella: 'Umbrella opened · 雨伞展开',
  bridge: 'Bridge checked · 桥面安全',
  noodles: 'Noodles cooked · 面条煮好了',
  coin: 'Coin flipped · 硬币已抛起',
  basket: 'Basket checked · 篮子已检查',
  cup: 'Cup used · 杯子已使用',
  plate: 'Plate served · 餐盘已摆好',
  spoon: 'Spoon used · 勺子已使用',
  pan: 'Pan heated · 平底锅已加热',
  kettle: 'Kettle boiling · 水壶正在沸腾',
  fridge: 'Fridge checked · 冰箱已检查',
  apple: 'Apple used · 苹果已取用',
  table: 'Table checked · 桌面已检查',
  book: 'Book opened · 正在阅读',
  lamp: 'Lamp turned on · 台灯亮起',
  computer: 'Computer started · 电脑已启动',
  phone: 'Phone checked · 手机已检查',
  clock: 'Clock checked · 时间已确认',
  window: 'Window checked · 窗户已检查',
  desk: 'Desk checked · 书桌已检查',
  ticket: 'Ticket checked · 车票有效',
  train: 'Train started · 列车启动',
  door: 'Door activated · 门已响应',
  seat: 'Seat used · 已就座',
  bag: 'Bag checked · 背包已检查',
  map: 'Map displayed · 地图已展开',
};

const steamingItems = new Set(['noodles', 'cup', 'pan', 'kettle']);
const glowingItems = new Set(['light', 'lantern', 'lamp', 'computer', 'phone', 'charm']);
const readingItems = new Set(['book', 'map', 'phone', 'clock', 'ticket']);

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolved = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + resolved, y);
  context.lineTo(x + width - resolved, y);
  context.arcTo(x + width, y, x + width, y + resolved, resolved);
  context.lineTo(x + width, y + height - resolved);
  context.arcTo(x + width, y + height, x + width - resolved, y + height, resolved);
  context.lineTo(x + resolved, y + height);
  context.arcTo(x, y + height, x, y + height - resolved, resolved);
  context.lineTo(x, y + resolved);
  context.arcTo(x, y, x + resolved, y, resolved);
  context.closePath();
}

export class ObjectCommandSystem {
  private readonly objects = new Map<string, Phaser.Physics.Arcade.Image>();
  private readonly highEffects: boolean;
  private readonly trailCleanups = new Set<() => void>();
  private lightsOff = false;
  private darkness?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly platforms: Phaser.Physics.Arcade.StaticGroup,
    private readonly player: Player,
    private readonly enemy: Enemy,
  ) {
    const reducedMotion = typeof window !== 'undefined'
      && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    this.highEffects = SaveManager.load().settings.effectsQuality !== 'low' && !reducedMotion;
    this.createMapObjects();
  }

  execute(command: GameplayCommand): string {
    if (command.intent === 'MOVE_OBJECT' && command.itemId) return this.moveToPlayer(command.itemId);
    if (command.intent === 'THROW_OBJECT' && command.itemId) return this.throwAtEnemy(command.itemId);
    if (command.intent === 'OPEN_OBJECT' && command.itemId) return this.openObject(command.itemId);
    if (command.intent === 'USE_OBJECT' && command.itemId) return this.useObject(command.itemId);
    if (command.intent === 'TURN_LIGHT_OFF') return this.turnOffLights();
    if (command.intent === 'CAST_SKILL') return this.cast(command.itemId);
    if (['MOVE_OBJECT', 'THROW_OBJECT', 'OPEN_OBJECT', 'USE_OBJECT'].includes(command.intent)) {
      return '请说出要操作的物件名称';
    }
    return '这条指令暂时不能在战场中执行';
  }

  getObjects(): Phaser.Physics.Arcade.Image[] {
    return [...this.objects.values()];
  }

  destroy(): void {
    this.trailCleanups.forEach((cleanup) => cleanup());
    this.trailCleanups.clear();
    this.objects.forEach((object) => object.destroy());
    this.darkness?.destroy();
  }

  private createMapObjects(): void {
    const save = SaveManager.load();
    const arena = getArena(save.selectedArenaId);
    const lessonObjects = arena.lesson.words
      .map((word) => word.itemId)
      .filter((itemId): itemId is string => Boolean(itemId && OBJECT_SPECS[itemId]));
    planObjectLayout(lessonObjects).forEach((placement) => {
      this.createObject(placement, OBJECT_SPECS[placement.id]);
    });
  }

  private createObject(placement: ObjectPlacement, spec: ObjectSpec): void {
    const { id, x, y } = placement;
    const key = `map-emoji-${id}-v1`;
    this.ensureEmojiTexture(key, spec);
    const object = this.scene.physics.add
      .image(x, y, key)
      .setBounce(.24)
      .setCollideWorldBounds(true)
      .setDepth(placement.solid ? 7 : 6)
      .setScale(placement.scale);
    const body = object.body as Phaser.Physics.Arcade.Body;
    body.setSize(
      Math.max(24, spec.width * (placement.solid ? .5 : .62)),
      Math.max(28, spec.height * (placement.solid ? .66 : .7)),
      true,
    );
    if (placement.solid) {
      object.setImmovable(true);
      body.allowGravity = false;
    } else {
      body.enable = false;
      body.allowGravity = false;
    }
    object
      .setData('itemId', id)
      .setData('label', spec.label)
      .setData('emoji', spec.emoji)
      .setData('displayScale', placement.scale)
      .setData('solid', placement.solid);
    this.scene.physics.add.collider(object, this.platforms);
    if (this.highEffects) {
      object.setAlpha(0).setScale(placement.scale * .46);
      this.scene.tweens.add({
        targets: object,
        alpha: 1,
        scale: placement.scale,
        duration: 280,
        delay: this.objects.size * 55,
        ease: 'Back.Out',
      });
    }
    this.objects.set(id, object);
  }

  private ensureEmojiTexture(key: string, spec: ObjectSpec): void {
    if (this.scene.textures.exists(key)) return;
    const texture = this.scene.textures.createCanvas(key, spec.width, spec.height);
    if (!texture) return;
    const context = texture.getContext();
    const color = `#${spec.color.toString(16).padStart(6, '0')}`;
    context.clearRect(0, 0, spec.width, spec.height);
    context.save();
    context.shadowColor = 'rgba(0,0,0,.55)';
    context.shadowBlur = 9;
    context.shadowOffsetY = 5;
    context.fillStyle = 'rgba(3,8,16,.82)';
    roundedRectPath(context, 3, 3, spec.width - 6, spec.height - 7, 13);
    context.fill();
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.strokeStyle = color;
    context.globalAlpha = .72;
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    context.fillStyle = color;
    context.globalAlpha = .12;
    roundedRectPath(context, 7, 7, spec.width - 14, spec.height - 23, 10);
    context.fill();
    context.globalAlpha = 1;
    const emojiSize = Math.max(28, Math.min(spec.width * .62, spec.height * .53));
    context.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.fillText(spec.emoji, spec.width / 2, Math.max(24, (spec.height - 18) * .48));

    const labelWidth = Math.min(spec.width - 10, Math.max(40, spec.label.length * 6.2 + 12));
    context.fillStyle = 'rgba(2,7,14,.9)';
    roundedRectPath(context, (spec.width - labelWidth) / 2, spec.height - 21, labelWidth, 16, 6);
    context.fill();
    context.strokeStyle = color;
    context.globalAlpha = .64;
    context.lineWidth = 1;
    context.stroke();
    context.globalAlpha = 1;
    context.font = 'bold 8px Arial, sans-serif';
    context.fillStyle = '#f3fbff';
    context.fillText(spec.label, spec.width / 2, spec.height - 13);
    texture.refresh();
  }

  private makeDynamic(object: Phaser.Physics.Arcade.Image): void {
    this.scene.tweens.killTweensOf(object);
    object
      .setData('motionToken', (Number(object.getData('motionToken')) || 0) + 1)
      .setData('displayScale', 1);
    object.setImmovable(false);
    const body = object.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.allowGravity = true;
    body.setSize(
      Math.max(24, object.width * .62),
      Math.max(28, object.height * .7),
      true,
    );
    object
      .setScale(1)
      .setAlpha(1)
      .setDepth(8)
      .setDragX(240)
      .setMaxVelocity(840, 900);
  }

  private displayScale(object: Phaser.Physics.Arcade.Image): number {
    const scale = Number(object.getData('displayScale'));
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  private schedulePassThrough(object: Phaser.Physics.Arcade.Image, delay: number): void {
    const motionToken = Number(object.getData('motionToken'));
    this.scene.time.delayedCall(delay, () => {
      if (!object.active || Number(object.getData('motionToken')) !== motionToken) return;
      object.setData('armed', false).setVelocity(0, 0).setAngularVelocity(0).setAlpha(.92).setDepth(6);
      const body = object.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.enable = false;
    });
  }

  private moveToPlayer(itemId: string): string {
    const object = this.objects.get(itemId);
    if (!object) return this.missingObject(itemId);
    this.makeDynamic(object);
    this.commandBurst(object.x, object.y, 0x63f0d4);
    this.actionFeedback(object, 'MOVE', 0x63f0d4);
    object.setVelocity((this.player.x - object.x) * 2.1, -235);
    this.attachMotionTrail(object, 0x63f0d4);
    this.schedulePassThrough(object, 1450);
    return `${this.objectName(itemId)} 正在移动到你面前`;
  }

  private throwAtEnemy(itemId: string): string {
    const object = this.objects.get(itemId);
    if (!object) return this.missingObject(itemId);
    this.makeDynamic(object);
    this.commandBurst(object.x, object.y, 0xffd66d);
    this.actionFeedback(object, 'THROW', 0xffd66d);
    object.setData('armed', true).setData('damage', 18);
    object
      .setVelocity((this.enemy.x - object.x) * 2.45, -355)
      .setAngularVelocity(480);
    this.attachMotionTrail(object, 0xffd66d);
    this.schedulePassThrough(object, 1900);
    return `${this.objectName(itemId)} 已投向敌人`;
  }

  private openObject(itemId: string): string {
    const object = this.objects.get(itemId);
    if (!object) return this.missingObject(itemId);
    if (object.getData('opened')) return `${this.objectName(itemId)} 已经打开`;
    object.setData('opened', true);
    this.commandBurst(object.x, object.y - 8, 0x78dcff);
    this.actionFeedback(object, 'OPEN', 0x78dcff);
    this.scene.tweens.add({
      targets: object,
      scaleX: .32,
      angle: itemId === 'gate' ? -5 : 4,
      duration: 145,
      ease: 'Back.In',
      yoyo: true,
      onComplete: () => {
        object.setTint(0xd9f4ff).setAngle(itemId === 'gate' ? -2 : 1);
        if (object.getData('solid')) {
          const body = object.body as Phaser.Physics.Arcade.Body;
          body.enable = false;
        }
      },
    });
    return `${this.objectName(itemId)} opened · 已打开`;
  }

  private useObject(itemId: string): string {
    const object = this.objects.get(itemId);
    if (!object) return this.missingObject(itemId);
    const spec = OBJECT_SPECS[itemId];
    if (!spec) return `${itemId.toUpperCase()} 暂不支持使用`;
    this.commandBurst(object.x, object.y, spec.color);
    this.actionFeedback(object, 'USE', spec.color);
    if (steamingItems.has(itemId)) this.steamFx(object, spec.color);
    else if (glowingItems.has(itemId)) this.glowFx(object, spec.color);
    else if (readingItems.has(itemId)) this.inspectFx(object, spec);
    else if (itemId === 'bell') this.ringFx(object);
    else if (itemId === 'train') this.startTrain(object, spec.color);
    else if (itemId === 'umbrella') this.umbrellaFx(object);
    else this.pulseObject(object);
    return USE_MESSAGES[itemId] ?? `${this.objectName(itemId)} used · 已使用`;
  }

  private ringFx(object: Phaser.Physics.Arcade.Image): void {
    this.scene.tweens.add({
      targets: object,
      angle: { from: -14, to: 14 },
      duration: 60,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.InOut',
      onComplete: () => object.setAngle(0),
    });
    for (let index = 0; index < (this.highEffects ? 3 : 2); index += 1) {
      const wave = this.scene.add.circle(object.x, object.y, 24, 0xffd35f, 0)
        .setStrokeStyle(2, 0xffd35f, .72 - index * .16)
        .setDepth(8);
      this.scene.tweens.add({
        targets: wave,
        scale: 2.1 + index * .45,
        alpha: 0,
        delay: index * 80,
        duration: 360,
        onComplete: () => wave.destroy(),
      });
    }
  }

  private steamFx(object: Phaser.Physics.Arcade.Image, color: number): void {
    this.pulseObject(object);
    const count = this.highEffects ? 8 : 4;
    for (let index = 0; index < count; index += 1) {
      const steam = this.scene.add.circle(
        object.x + Phaser.Math.Between(-16, 16),
        object.y - 20,
        Phaser.Math.Between(4, 8),
        index % 3 === 0 ? color : 0xe9fbff,
        .34,
      ).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: steam,
        x: steam.x + Phaser.Math.Between(-24, 24),
        y: steam.y - Phaser.Math.Between(70, 125),
        scale: 2.2,
        alpha: 0,
        delay: index * 55,
        duration: Phaser.Math.Between(480, 760),
        ease: 'Sine.Out',
        onComplete: () => steam.destroy(),
      });
    }
  }

  private glowFx(object: Phaser.Physics.Arcade.Image, color: number): void {
    const baseScale = this.displayScale(object);
    const glow = this.scene.add.circle(object.x, object.y - 6, 34, color, .2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);
    this.scene.tweens.add({
      targets: glow,
      scale: 2.4,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.Out',
      onComplete: () => glow.destroy(),
    });
    this.scene.tweens.add({
      targets: object,
      scale: baseScale * 1.12,
      duration: 130,
      yoyo: true,
      repeat: 1,
      onComplete: () => object.setScale(baseScale),
    });
  }

  private inspectFx(object: Phaser.Physics.Arcade.Image, spec: ObjectSpec): void {
    const panel = this.scene.add.container(object.x, object.y - 70).setDepth(12);
    const backdrop = this.scene.add.rectangle(0, 0, 116, 38, 0x04101c, .9)
      .setStrokeStyle(1, spec.color, .78);
    const text = this.scene.add.text(0, 0, `${spec.emoji}  ${spec.label}`, {
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f5fbff',
    }).setOrigin(.5);
    panel.add([backdrop, text]).setAlpha(0).setScale(.82);
    this.scene.tweens.add({
      targets: panel,
      y: panel.y - 24,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
      hold: 430,
      yoyo: true,
      onComplete: () => panel.destroy(),
    });
  }

  private startTrain(object: Phaser.Physics.Arcade.Image, color: number): void {
    this.makeDynamic(object);
    object.setVelocityX(this.player.facing * 420).setAngularVelocity(0);
    this.attachMotionTrail(object, color);
    this.schedulePassThrough(object, 1700);
  }

  private umbrellaFx(object: Phaser.Physics.Arcade.Image): void {
    const baseScale = this.displayScale(object);
    this.scene.tweens.add({
      targets: object,
      angle: 360,
      scale: baseScale * 1.18,
      duration: 420,
      ease: 'Cubic.Out',
      yoyo: true,
      onComplete: () => object.setAngle(0).setScale(baseScale),
    });
  }

  private pulseObject(object: Phaser.Physics.Arcade.Image): void {
    const baseScale = this.displayScale(object);
    this.scene.tweens.add({
      targets: object,
      scale: baseScale * 1.12,
      angle: { from: -3, to: 3 },
      duration: 125,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.InOut',
      onComplete: () => object.setScale(baseScale).setAngle(0),
    });
  }

  private turnOffLights(): string {
    if (this.lightsOff) return '灯已经关闭';
    this.lightsOff = true;
    const veil = this.scene.add.rectangle(0, 0, 1280, 640, 0x02040a, .66).setOrigin(0);
    const topShade = this.scene.add.rectangle(0, 0, 1280, 180, 0x000105, .25).setOrigin(0);
    const bottomShade = this.scene.add.rectangle(0, 520, 1280, 120, 0x000105, .34).setOrigin(0);
    const scan = this.scene.add.graphics();
    scan.lineStyle(2, 0x63f0d4, .11)
      .lineBetween(0, 118, 1280, 118)
      .lineBetween(0, 492, 1280, 492);
    this.darkness = this.scene.add.container(0, 0, [veil, topShade, bottomShade, scan]).setDepth(6).setAlpha(0);
    const lights = ['light', 'lantern', 'lamp']
      .map((id) => this.objects.get(id))
      .filter((object): object is Phaser.Physics.Arcade.Image => Boolean(object));
    lights.forEach((object) => object.setTint(0x536071));
    this.scene.tweens.add({ targets: this.darkness, alpha: 1, duration: 260, ease: 'Sine.Out' });
    this.scene.time.delayedCall(5000, () => {
      const darkness = this.darkness;
      if (!darkness) return;
      this.scene.tweens.add({
        targets: darkness,
        alpha: 0,
        duration: 320,
        onComplete: () => darkness.destroy(),
      });
      lights.forEach((object) => {
        if (object.active) object.clearTint();
      });
      this.darkness = undefined;
      this.lightsOff = false;
    });
    return 'Lights off · 战场暂时变暗';
  }

  private cast(itemId?: string): string {
    if (itemId === 'heal') {
      this.player.stats.health = Math.min(this.player.stats.maxHealth, this.player.stats.health + 24);
      this.castFx(this.player.x, this.player.y - 18, 0x63f0d4, 'heal');
      return 'Heal successful · 生命恢复';
    }
    if (itemId === 'push') {
      this.enemy.setVelocityX((this.enemy.x > this.player.x ? 1 : -1) * 620);
      this.castFx(this.player.x, this.player.y - 18, 0xb58aff, 'push');
      return 'Stay away · 敌人被推开';
    }
    this.player.stats.stamina = this.player.stats.maxStamina;
    this.castFx(this.player.x, this.player.y - 18, 0xffd66d, 'help');
    return 'Help arrived · 体力恢复';
  }

  private objectName(itemId: string): string {
    return OBJECT_SPECS[itemId]?.label ?? itemId.toUpperCase();
  }

  private missingObject(itemId: string): string {
    return `${this.objectName(itemId)} 不在当前战场，请尝试本局出现的物件`;
  }

  private actionFeedback(object: Phaser.Physics.Arcade.Image, action: string, color: number): void {
    const label = this.scene.add.text(object.x, object.y - object.displayHeight * .62, action, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#031018',
      strokeThickness: 4,
      letterSpacing: 2,
    }).setOrigin(.5).setDepth(12);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 28,
      scale: 1.15,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => label.destroy(),
    });
  }

  private commandBurst(x: number, y: number, color: number): void {
    const graphics = this.scene.add.graphics().setPosition(x, y).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    graphics.lineStyle(3, color, .82).strokeCircle(0, 0, 24);
    const rays = this.highEffects ? 8 : 4;
    for (let index = 0; index < rays; index += 1) {
      const angle = index * Math.PI * 2 / rays;
      graphics.lineStyle(2, index % 2 ? 0xffffff : color, .64)
        .lineBetween(
          Math.cos(angle) * 29,
          Math.sin(angle) * 29,
          Math.cos(angle) * 43,
          Math.sin(angle) * 43,
        );
    }
    this.scene.tweens.add({
      targets: graphics,
      scale: 1.6,
      alpha: 0,
      duration: 340,
      ease: 'Cubic.Out',
      onComplete: () => graphics.destroy(),
    });
  }

  private attachMotionTrail(object: Phaser.Physics.Arcade.Image, color: number): void {
    if (!this.highEffects) return;
    const trail = this.scene.add.graphics().setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    const points: Phaser.Math.Vector2[] = [];
    const startedAt = this.scene.time.now;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      if (trail.active) trail.destroy();
      this.trailCleanups.delete(cleanup);
    };
    const update = () => {
      if (!object.active || !trail.active || this.scene.time.now - startedAt > 520) {
        cleanup();
        return;
      }
      points.unshift(new Phaser.Math.Vector2(object.x, object.y));
      points.splice(7);
      trail.clear();
      points.slice(1).forEach((position, index) => {
        const previous = points[index];
        trail.lineStyle(Math.max(1, 7 - index), color, Math.max(.03, .18 - index * .024))
          .lineBetween(previous.x, previous.y, position.x, position.y);
      });
    };
    this.trailCleanups.add(cleanup);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  }

  private castFx(x: number, y: number, color: number, kind: 'heal' | 'push' | 'help'): void {
    const graphics = this.scene.add.graphics().setPosition(x, y).setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    graphics.lineStyle(kind === 'push' ? 6 : 3, color, .76).strokeCircle(0, 0, kind === 'push' ? 42 : 31);
    const count = this.highEffects ? 10 : 5;
    for (let index = 0; index < count; index += 1) {
      const angle = index * Math.PI * 2 / count;
      const radius = kind === 'push' ? 50 : 37;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (kind === 'heal' && index % 2 === 0) {
        graphics.lineStyle(3, 0xffffff, .72)
          .lineBetween(px - 5, py, px + 5, py)
          .lineBetween(px, py - 5, px, py + 5);
      } else {
        graphics.fillStyle(index % 2 ? color : 0xffffff, .74).fillCircle(px, py, 2.5);
      }
    }
    this.scene.tweens.add({
      targets: graphics,
      scale: kind === 'push' ? 2.6 : 1.8,
      y: kind === 'push' ? y : y - 24,
      alpha: 0,
      duration: kind === 'push' ? 430 : 620,
      ease: 'Cubic.Out',
      onComplete: () => graphics.destroy(),
    });
  }
}
