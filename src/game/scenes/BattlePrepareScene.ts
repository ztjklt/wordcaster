import Phaser from 'phaser';
import { ARENAS, getArena, type ArenaId } from '../arena/BattleContent';
import { SaveManager } from '../../storage/SaveManager';
import { addButton } from './SceneHelpers';

const skillNames: Record<string, string> = {
  shield: 'SHIELD · 防御',
  sword: 'SWORD · 强攻',
  heal: 'HEAL · 恢复',
  push: 'STAY AWAY · 击退',
  help: 'HELP ME · 支援',
};

interface ArenaCardView {
  container: Phaser.GameObjects.Container;
  border: Phaser.GameObjects.Rectangle;
  tint: Phaser.GameObjects.Rectangle;
  marker: Phaser.GameObjects.Arc;
  state: Phaser.GameObjects.Text;
}

interface SkillView {
  box: Phaser.GameObjects.Rectangle;
  check: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  slot: Phaser.GameObjects.Text;
}

export class BattlePrepareScene extends Phaser.Scene {
  private selected: string[] = [];
  private selectedArena: ArenaId = 'neon-shrine';
  private skillViews = new Map<string, SkillView>();
  private arenaCards = new Map<ArenaId, ArenaCardView>();
  private lessonObjects: Phaser.GameObjects.GameObject[] = [];
  private sceneBackdrop!: Phaser.GameObjects.Image;
  private lessonBackdrop!: Phaser.GameObjects.Image;
  private lessonAccentLine!: Phaser.GameObjects.Rectangle;
  private arenaIndex!: Phaser.GameObjects.Text;
  private lessonTitle!: Phaser.GameObjects.Text;
  private reducedMotion = false;

  constructor() {
    super('BattlePrepareScene');
  }

  create(): void {
    const save = SaveManager.load();
    this.selected = [...save.equippedSkills];
    this.selectedArena = save.selectedArenaId ?? 'neon-shrine';
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const initialArena = getArena(this.selectedArena);

    this.cameras.main.setBackgroundColor('#030611');
    this.cameras.main.fadeIn(this.reducedMotion ? 0 : 420, 3, 6, 15);
    this.sceneBackdrop = this.add.image(640, 360, initialArena.textureKey).setDisplaySize(1310, 740).setAlpha(.2);
    this.add.rectangle(640, 360, 1280, 720, 0x030711, .84);
    this.add.circle(1120, 72, 330, initialArena.accent, .055).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(20, 720, 300, 0x2e7d77, .055).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(640, 4, 1172, 2, initialArena.accent, .55);
    this.add.rectangle(40, 120, 3, 550, initialArena.accent, .2);

    this.add.text(58, 25, 'BATTLE PROTOCOL  /  01', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: initialArena.accentCss,
      letterSpacing: 4,
    });
    this.add.text(58, 45, '战前言灵', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '35px',
      color: '#f6f8ff',
    }).setShadow(0, 5, '#01030a', 12);
    this.add.text(58, 90, '选择战场 · 阅读本局词库 · 装备战斗言灵', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#9aa8bf',
      letterSpacing: 1,
    });
    this.add.text(1222, 27, 'PREPARE YOUR WORDS', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7889a5',
      letterSpacing: 3,
    }).setOrigin(1, 0);
    this.add.rectangle(908, 49, 314, 1, 0x91a5c3, .17).setOrigin(0, .5);

    ARENAS.forEach((arena, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      this.addArenaCard(arena.id, 58 + column * 250, 112 + row * 62, arena.name, arena.subtitle, arena.accent, index);
    });

    this.add.rectangle(423, 452, 738, 424, 0x01030a, .42);
    this.lessonBackdrop = this.add.image(423, 448, initialArena.textureKey).setDisplaySize(730, 416).setAlpha(.31);
    this.add.rectangle(423, 448, 730, 416, 0x06101d, .76).setStrokeStyle(1, 0x657797, .46);
    this.add.rectangle(423, 448, 706, 392, 0x07101f, .12).setStrokeStyle(1, 0x96a9c6, .1);
    this.lessonAccentLine = this.add.rectangle(423, 241, 730, 3, initialArena.accent, .88);
    this.arenaIndex = this.add.text(760, 259, '', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#a9b6ca',
      letterSpacing: 3,
    }).setOrigin(1, 0);
    this.lessonTitle = this.add.text(76, 258, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: initialArena.accentCss,
      letterSpacing: 3,
    });

    this.add.rectangle(1023, 452, 418, 424, 0x01030a, .42);
    this.add.rectangle(1023, 448, 410, 416, 0x07101f, .91).setStrokeStyle(1, 0x657797, .42);
    this.add.rectangle(1023, 241, 410, 3, initialArena.accent, .74).setName('loadout-accent');
    this.add.text(842, 259, 'LOADOUT / 装备言灵', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f6f8ff',
      letterSpacing: 3,
    });
    this.add.text(1204, 260, `${this.selected.length} / ${save.player.skillSlots}`, {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: initialArena.accentCss,
      letterSpacing: 2,
    }).setOrigin(1, 0).setName('loadout-count');
    this.add.text(842, 284, '选择本局可立即触发的能力', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#7f8ca4',
    });

    save.unlockedSkills.forEach((id, index) => {
      this.addSkillCard(id, 318 + index * 41, index + 1, save.player.skillSlots);
    });

    addButton(this, 1023, 552, '踏入战场', () => {
      save.equippedSkills = [...this.selected];
      save.selectedArenaId = this.selectedArena;
      SaveManager.save(save);
      this.cameras.main.fadeOut(this.reducedMotion ? 0 : 180, 2, 4, 10);
      this.time.delayedCall(this.reducedMotion ? 0 : 160, () => this.scene.start('BattleScene'));
    }, true);
    addButton(this, 1023, 624, '返回行动基地', () => this.scene.start('HomeScene')).setScale(.91);

    this.add.text(58, 690, 'STEP 01  SELECT ARENA', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: initialArena.accentCss,
      letterSpacing: 2,
    });
    this.add.rectangle(230, 695, 150, 1, initialArena.accent, .28);
    this.add.text(396, 690, 'STEP 02  LEARN WORDS', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#71809a',
      letterSpacing: 2,
    });
    this.add.text(1218, 690, 'STEP 03  ENTER BATTLE', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#71809a',
      letterSpacing: 2,
    }).setOrigin(1, 0);

    this.refreshSkills();
    this.selectArena(this.selectedArena);
  }

  private addArenaCard(
    id: ArenaId,
    x: number,
    y: number,
    name: string,
    subtitle: string,
    accent: number,
    index: number,
  ): void {
    const arena = getArena(id);
    const image = this.add.image(116, 29, arena.textureKey).setDisplaySize(232, 58).setAlpha(.72);
    const tint = this.add.rectangle(116, 29, 232, 58, 0x030710, .5);
    const border = this.add.rectangle(116, 29, 232, 58, 0x07101f, .08)
      .setStrokeStyle(1, 0x5c6f8d, .58)
      .setInteractive({ useHandCursor: true });
    const rail = this.add.rectangle(4, 29, 4, 46, accent, .62);
    const number = this.add.text(14, 7, String(index + 1).padStart(2, '0'), {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#c6d0e2',
      letterSpacing: 2,
    }).setShadow(0, 2, '#000000', 4);
    const title = this.add.text(14, 18, name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setShadow(0, 3, '#000000', 7);
    const copy = this.add.text(14, 39, subtitle, {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#c7d1e2',
    }).setShadow(0, 2, '#000000', 5);
    const marker = this.add.circle(211, 12, 5, 0x030710, .84).setStrokeStyle(1, accent, .82);
    const state = this.add.text(211, 47, '', {
      fontFamily: 'Arial',
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1,
    }).setOrigin(1, .5);
    const container = this.add.container(x, y, [image, tint, border, rail, number, title, copy, marker, state]);
    this.arenaCards.set(id, { container, border, tint, marker, state });

    border.on('pointerover', () => {
      if (id !== this.selectedArena) {
        border.setStrokeStyle(1, accent, .9);
        tint.setAlpha(.25);
      }
      if (!this.reducedMotion) this.tweens.add({ targets: container, y: y - 2, duration: 130, ease: 'Sine.out' });
    });
    border.on('pointerout', () => {
      if (id !== this.selectedArena) {
        border.setStrokeStyle(1, 0x5c6f8d, .58);
        tint.setAlpha(.48);
      }
      if (!this.reducedMotion) this.tweens.add({ targets: container, y, duration: 160, ease: 'Sine.out' });
    });
    border.on('pointerdown', () => this.selectArena(id));
  }

  private addSkillCard(id: string, y: number, slotNumber: number, max: number): void {
    const box = this.add.rectangle(1023, y, 362, 35, 0x111c30, .88)
      .setStrokeStyle(1, 0x354764, .8)
      .setInteractive({ useHandCursor: true });
    const check = this.add.circle(858, y, 9, 0x050a14, .85).setStrokeStyle(1, 0x7385a2, .85);
    const label = this.add.text(878, y, skillNames[id] ?? id.toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#dce4f2',
      letterSpacing: 1,
    }).setOrigin(0, .5);
    const slot = this.add.text(1190, y, `SLOT 0${slotNumber}`, {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#667690',
      letterSpacing: 2,
    }).setOrigin(1, .5);
    this.skillViews.set(id, { box, check, label, slot });
    box.on('pointerover', () => box.setStrokeStyle(1, 0x63f0d4, .82));
    box.on('pointerout', () => this.refreshSkillView(id));
    box.on('pointerdown', () => this.toggleSkill(id, max));
  }

  private selectArena(id: ArenaId): void {
    this.selectedArena = id;
    const arena = getArena(id);
    this.sceneBackdrop?.setTexture(arena.textureKey);
    this.lessonBackdrop?.setTexture(arena.textureKey).setAlpha(.31);
    this.lessonAccentLine?.setFillStyle(arena.accent, .88);
    this.lessonTitle?.setText(`${arena.name.toUpperCase()}  /  本局词库`).setColor(arena.accentCss);
    this.arenaIndex?.setText(
      `${String(ARENAS.findIndex((entry) => entry.id === id) + 1).padStart(2, '0')}  /  ${String(ARENAS.length).padStart(2, '0')}  ·  ${arena.lesson.words.length}W  ${arena.lesson.patterns.length}P`,
    );

    this.arenaCards.forEach((view, arenaId) => {
      const active = arenaId === id;
      const definition = getArena(arenaId);
      view.border.setStrokeStyle(active ? 2 : 1, active ? definition.accent : 0x5c6f8d, active ? 1 : .58);
      view.tint.setFillStyle(active ? definition.accent : 0x030710, active ? .08 : .48);
      view.marker.setFillStyle(active ? definition.accent : 0x030710, active ? 1 : .84);
      view.state.setText(active ? 'SELECTED' : '');
      view.container.setDepth(active ? 2 : 1);
    });
    const loadoutAccent = this.children.getByName('loadout-accent') as Phaser.GameObjects.Rectangle | null;
    loadoutAccent?.setFillStyle(arena.accent, .74);
    const loadoutCount = this.children.getByName('loadout-count') as Phaser.GameObjects.Text | null;
    loadoutCount?.setColor(arena.accentCss);

    this.lessonObjects.forEach((object) => object.destroy());
    this.lessonObjects = [];
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.lessonObjects.push(object);
      return object;
    };

    arena.lesson.words.forEach((word, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 76 + column * 194;
      const y = 292 + row * 63;
      const card = add(this.add.rectangle(x, y, 182, 54, 0x0b1728, .78)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x647797, .28));
      add(this.add.rectangle(x, y, 3, 54, arena.accent, .72).setOrigin(0, 0));
      add(this.add.text(x + 12, y + 8, word.english.toUpperCase(), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '13px',
        color: '#ffffff',
        letterSpacing: 1,
      }));
      add(this.add.text(x + 173, y + 9, word.pronunciation, {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: arena.accentCss,
      }).setOrigin(1, 0));
      add(this.add.text(x + 12, y + 32, `${word.chinese} · ${word.gameEffect}`, {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: '#98a7bd',
        fixedWidth: 160,
      }));
      if (!this.reducedMotion) {
        card.setAlpha(0);
        this.tweens.add({ targets: card, alpha: 1, duration: 220, delay: index * 45 });
      }
    });

    add(this.add.text(476, 292, `PATTERNS / ${arena.lesson.patterns.length} 种句式`, {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#f6f8ff',
      letterSpacing: 3,
    }));
    arena.lesson.patterns.forEach((pattern, index) => {
      const y = 320 + index * 51;
      add(this.add.text(476, y, String(index + 1).padStart(2, '0'), {
        fontFamily: 'Arial',
        fontSize: '9px',
        fontStyle: 'bold',
        color: arena.accentCss,
        letterSpacing: 1,
      }));
      add(this.add.text(507, y - 3, pattern.example, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        fixedWidth: 250,
      }));
      add(this.add.text(507, y + 16, `${pattern.chinese}  /  ${pattern.effect}`, {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: '#8f9db4',
        fixedWidth: 250,
      }));
      add(this.add.rectangle(476, y + 38, 280, 1, 0x8ba0bf, .12).setOrigin(0, .5));
    });
    this.refreshSkills();
  }

  private toggleSkill(id: string, max: number): void {
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter((item) => item !== id);
    } else if (this.selected.length < max) {
      this.selected.push(id);
    } else {
      const view = this.skillViews.get(id);
      if (view && !this.reducedMotion) {
        this.tweens.add({ targets: view.box, x: '+=5', duration: 50, yoyo: true, repeat: 2 });
      }
    }
    this.refreshSkills();
  }

  private refreshSkills(): void {
    this.skillViews.forEach((_view, id) => this.refreshSkillView(id));
    const count = this.children.getByName('loadout-count') as Phaser.GameObjects.Text | null;
    count?.setText(`${this.selected.length} / ${SaveManager.load().player.skillSlots}`);
  }

  private refreshSkillView(id: string): void {
    const view = this.skillViews.get(id);
    if (!view) return;
    const active = this.selected.includes(id);
    const arena = getArena(this.selectedArena);
    view.box.setFillStyle(active ? 0x14283a : 0x111c30, active ? .96 : .88)
      .setStrokeStyle(active ? 2 : 1, active ? arena.accent : 0x354764, active ? .88 : .8);
    view.check.setFillStyle(active ? arena.accent : 0x050a14, active ? 1 : .85)
      .setStrokeStyle(1, active ? 0xffffff : 0x7385a2, active ? .72 : .85);
    view.label.setColor(active ? '#ffffff' : '#aeb9cb');
    view.slot.setColor(active ? arena.accentCss : '#667690');
  }
}
