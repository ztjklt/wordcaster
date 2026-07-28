import Phaser from 'phaser';
import type { ArenaDefinition } from '../arena/BattleContent';
import type { CommandWordDefinition } from './CommandBlockContent';
import { planWordBlockLayout } from './WordBlockLayout';

interface WordBlockView {
  definition: CommandWordDefinition;
  body: Phaser.GameObjects.Rectangle;
  shadow: Phaser.GameObjects.Rectangle;
  face: Phaser.GameObjects.Rectangle;
  top: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  emoji: Phaser.GameObjects.Text;
  hint: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
  activated: boolean;
}

const colorCss = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export class WordBlockSystem {
  readonly colliders: Phaser.Physics.Arcade.StaticGroup;
  readonly definitions: readonly CommandWordDefinition[];
  private readonly views = new Map<string, WordBlockView>();
  private candidateId?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly arena: ArenaDefinition,
    words: readonly CommandWordDefinition[],
    seed: number,
    private readonly reducedMotion = false,
  ) {
    this.definitions = words;
    this.colliders = scene.physics.add.staticGroup();
    const placements = planWordBlockLayout(words, seed);

    placements.forEach((placement, index) => {
      const definition = words.find((entry) => entry.id === placement.wordId);
      if (!definition) return;
      const shadow = scene.add.rectangle(placement.x + 7, placement.y + 9, placement.width + 8, 47, 0x010309, .62).setDepth(4);
      const face = scene.add.rectangle(placement.x, placement.y, placement.width, 43, 0x081426, .96)
        .setStrokeStyle(2, arena.accent, .58)
        .setDepth(6);
      const top = scene.add.rectangle(placement.x, placement.y - 19, placement.width - 15, 2, definition.visual.color, .66)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(7);
      const text = scene.add.text(placement.x, placement.y - 1, definition.word.toUpperCase(), {
        fontFamily: 'Arial Black, Arial',
        fontSize: definition.word.length > 7 ? '15px' : '18px',
        color: '#f8fbff',
        letterSpacing: definition.word.length > 7 ? 1 : 2,
      }).setOrigin(.5).setDepth(8).setShadow(0, 0, colorCss(definition.visual.color), 8);
      const emoji = scene.add.text(placement.x - placement.width / 2 + 14, placement.y - 31, definition.emoji ?? '✦', {
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: '22px',
      }).setOrigin(.5).setDepth(9).setShadow(0, 5, '#000000', 8);
      const hint = scene.add.text(placement.x, placement.y + 29, `${definition.pronunciation}  ${definition.chinese}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f4f8ff',
      }).setOrigin(.5, 0).setDepth(9).setAlpha(0).setShadow(0, 2, '#000000', 6);
      const check = scene.add.text(placement.x + placement.width / 2 - 15, placement.y - 1, '✓', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '15px',
        color: '#ffffff',
      }).setOrigin(.5).setDepth(10).setAlpha(0);
      const body = scene.add.rectangle(placement.x, placement.y, placement.width, 43, 0xffffff, .001).setDepth(5);
      scene.physics.add.existing(body, true);
      this.colliders.add(body);

      const view: WordBlockView = { definition, body, shadow, face, top, text, emoji, hint, check, activated: false };
      this.views.set(definition.id, view);

      face.setScale(.5, .25);
      shadow.setScale(.5, .25).setAlpha(0);
      top.setScale(.4, 1).setAlpha(0);
      text.setAlpha(0).setY(placement.y + 7);
      emoji.setAlpha(0).setScale(.4);
      scene.tweens.add({
        targets: [face, shadow, top],
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: this.reducedMotion ? 90 : 300,
        delay: this.reducedMotion ? 0 : index * 45,
        ease: 'Back.out',
      });
      scene.tweens.add({
        targets: [text, emoji],
        y: (target: Phaser.GameObjects.GameObject) => target === text ? placement.y - 1 : placement.y - 31,
        alpha: 1,
        scale: 1,
        duration: this.reducedMotion ? 90 : 260,
        delay: this.reducedMotion ? 0 : 110 + index * 45,
        ease: 'Cubic.out',
      });
    });
  }

  getDefinition(wordId: string): CommandWordDefinition | undefined {
    return this.views.get(wordId)?.definition;
  }

  getCenter(wordId: string): { x: number; y: number } | undefined {
    const view = this.views.get(wordId);
    return view ? { x: view.face.x, y: view.face.y } : undefined;
  }

  setCandidate(wordId?: string): void {
    if (this.candidateId === wordId) return;
    this.candidateId = wordId;
    this.views.forEach((view, id) => {
      if (view.activated) return;
      const active = id === wordId;
      view.face.setFillStyle(active ? view.definition.visual.color : 0x081426, active ? .22 : .96);
      view.face.setStrokeStyle(active ? 3 : 2, active ? 0xffffff : this.arena.accent, active ? .95 : .58);
      view.text.setScale(active ? 1.08 : 1);
      view.emoji.setScale(active ? 1.16 : 1);
      if (active && !this.reducedMotion) {
        this.scene.tweens.killTweensOf([view.face, view.text]);
        this.scene.tweens.add({
          targets: [view.face, view.text],
          alpha: { from: .72, to: 1 },
          duration: 260,
          yoyo: true,
          repeat: 1,
        });
      }
    });
  }

  activate(wordId: string): { x: number; y: number } | undefined {
    const view = this.views.get(wordId);
    if (!view || view.activated) return;
    view.activated = true;
    this.candidateId = undefined;
    view.face.setFillStyle(view.definition.visual.color, .34).setStrokeStyle(3, 0xffffff, .94);
    view.top.setFillStyle(0xffffff, .95);
    view.text.setColor('#ffffff').setScale(1.08);
    view.emoji.setScale(1.18);
    view.check.setAlpha(1);
    this.scene.tweens.add({
      targets: [view.text, view.emoji, view.check],
      scale: { from: 1.28, to: 1 },
      duration: this.reducedMotion ? 100 : 520,
      ease: 'Back.out',
    });
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.reducedMotion ? 100 : 900,
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 0;
        const phase = value < .5 ? value * 2 : (value - .5) * 2;
        const from = value < .5 ? view.definition.visual.color : 0xf4d66d;
        const to = value < .5 ? 0xf4d66d : 0xb98cff;
        const start = Phaser.Display.Color.ValueToColor(from);
        const end = Phaser.Display.Color.ValueToColor(to);
        const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, Math.round(phase * 100));
        view.text.setColor(colorCss(Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b)));
      },
      onComplete: () => view.text.setColor('#ffffff'),
    });
    this.spawnBurst(view.face.x, view.face.y, view.definition.visual.color);
    return { x: view.face.x, y: view.face.y };
  }

  showHints(durationMs: number): void {
    this.views.forEach((view) => {
      if (view.activated) return;
      this.scene.tweens.killTweensOf(view.hint);
      view.hint.setAlpha(0).setY(view.face.y + 25);
      this.scene.tweens.add({
        targets: view.hint,
        alpha: 1,
        y: view.face.y + 29,
        duration: this.reducedMotion ? 80 : 220,
      });
      this.scene.time.delayedCall(durationMs, () => {
        if (view.hint.active) this.scene.tweens.add({ targets: view.hint, alpha: 0, duration: 240 });
      });
    });
  }

  flashFailure(wordId?: string): void {
    const targets = wordId ? [this.views.get(wordId)].filter(Boolean) as WordBlockView[] : [...this.views.values()].filter((view) => !view.activated);
    targets.forEach((view) => {
      const original = view.activated ? view.definition.visual.color : 0x081426;
      view.face.setFillStyle(0xff4968, .4).setStrokeStyle(3, 0xffd7de, .9);
      this.scene.time.delayedCall(260, () => {
        if (!view.face.active) return;
        view.face.setFillStyle(original, view.activated ? .34 : .96)
          .setStrokeStyle(view.activated ? 3 : 2, view.activated ? 0xffffff : this.arena.accent, view.activated ? .94 : .58);
      });
    });
  }

  destroy(): void {
    if (this.colliders.children) this.colliders.clear(false, false);
    this.views.forEach((view) => {
      [view.body, view.shadow, view.face, view.top, view.text, view.emoji, view.hint, view.check].forEach((object) => {
        if (object.active) object.destroy();
      });
    });
    this.views.clear();
  }

  private spawnBurst(x: number, y: number, color: number): void {
    const count = this.reducedMotion ? 8 : 22;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count;
      const particle = this.scene.add.circle(x, y, index % 4 === 0 ? 4 : 2, index % 3 === 0 ? 0xffffff : color, .9)
        .setDepth(35)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * (48 + index % 5 * 12),
        y: y + Math.sin(angle) * (28 + index % 4 * 9),
        alpha: 0,
        scale: .15,
        duration: this.reducedMotion ? 160 : 480,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
