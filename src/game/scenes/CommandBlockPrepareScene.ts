import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { ARENAS, getArena, type ArenaId } from '../arena/BattleContent';
import { getCommandWords } from '../command-block/CommandBlockContent';
import { addButton } from './SceneHelpers';

export class CommandBlockPrepareScene extends Phaser.Scene {
  private selected: ArenaId = 'neon-shrine';
  private backdrop?: Phaser.GameObjects.Image;
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private lessonObjects: Phaser.GameObjects.GameObject[] = [];
  private arenaCards = new Map<ArenaId, { border: Phaser.GameObjects.Rectangle; marker: Phaser.GameObjects.Arc }>();

  constructor() { super('CommandBlockPrepareScene'); }

  create(): void {
    this.selected = SaveManager.load().selectedArenaId ?? 'neon-shrine';
    const arena = getArena(this.selected);
    this.cameras.main.setBackgroundColor('#030610');
    this.backdrop = this.add.image(640, 360, arena.textureKey).setDisplaySize(1310, 738).setAlpha(.78).setDepth(-20);
    this.add.rectangle(640, 360, 1280, 720, 0x030611, .72).setDepth(-19);
    this.add.rectangle(250, 360, 500, 720, 0x02050d, .58).setDepth(-18);

    this.add.text(58, 36, 'COMMAND BLOCK / PREPARE', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 4,
    });
    this.add.text(55, 59, '命令方块 · 战前选择', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '36px',
      color: '#f7faff',
    });
    this.add.text(58, 106, '十个完整名词同时化为浮空方块。读出任意未点亮单词，让它释放专属效果。', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#9dacbf',
    });

    ARENAS.forEach((entry, index) => {
      const x = 147 + index % 3 * 210;
      const y = 176 + Math.floor(index / 3) * 76;
      const border = this.add.rectangle(x, y, 190, 58, 0x091426, .84)
        .setStrokeStyle(1, 0x60718c, .52)
        .setInteractive({ useHandCursor: true });
      const marker = this.add.circle(x - 76, y, 4, 0x28344a, .9);
      this.add.text(x - 62, y - 11, entry.name, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f8ff',
      });
      this.add.text(x - 62, y + 8, `${getCommandWords(entry.id).length} WORD BLOCKS`, {
        fontFamily: 'Arial',
        fontSize: '7px',
        color: entry.accentCss,
        letterSpacing: 2,
      });
      border.on('pointerdown', () => this.selectArena(entry.id));
      this.arenaCards.set(entry.id, { border, marker });
    });

    this.title = this.add.text(58, 316, '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '25px',
      color: '#ffffff',
    });
    this.subtitle = this.add.text(58, 352, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#7f91ad',
      letterSpacing: 2,
    });
    this.add.text(884, 42, 'ROUND RULES', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#7d8faa',
      letterSpacing: 3,
    });
    this.add.text(884, 68, '10 个方块 · 全部激活通关 · 完美共鸣 +500', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#eef5ff',
    });
    this.add.text(884, 97, '语音正确额外 +20 · 念写不增加口语熟练度', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#93a4bd',
    });
    addButton(this, 1052, 652, '开始十词共鸣', () => this.startRun(), true).setScale(.86);
    addButton(this, 230, 652, '返回模式选择', () => this.scene.start('ModeSelectScene')).setScale(.72);
    this.selectArena(this.selected);
    this.cameras.main.fadeIn(340, 2, 4, 10);
  }

  private selectArena(id: ArenaId): void {
    this.selected = id;
    const arena = getArena(id);
    this.backdrop?.setTexture(arena.textureKey);
    this.title?.setText(`${arena.name} · 本局名词池`).setColor(arena.accentCss);
    this.subtitle?.setText(`${arena.subtitle.toUpperCase()}  //  10 WORDS`);
    this.arenaCards.forEach((view, key) => {
      const active = key === id;
      const definition = getArena(key);
      view.border.setStrokeStyle(active ? 2 : 1, active ? definition.accent : 0x60718c, active ? .95 : .52);
      view.marker.setFillStyle(active ? definition.accent : 0x28344a, active ? 1 : .9);
    });
    this.lessonObjects.forEach((object) => object.destroy());
    this.lessonObjects = [];
    getCommandWords(id).forEach((entry, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 72 + column * 238;
      const y = 420 + row * 103;
      const emoji = this.add.text(x, y, entry.emoji ?? '✦', {
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: '38px',
      }).setOrigin(.5);
      const english = this.add.text(x + 31, y - 22, entry.word.toUpperCase(), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '14px',
        color: '#ffffff',
        letterSpacing: 1,
      });
      const pronunciation = this.add.text(x + 31, y - 2, entry.pronunciation, {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: arena.accentCss,
      });
      const chinese = this.add.text(x + 31, y + 14, `${entry.chinese} · ${entry.effectLabel}`, {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: '#9aa9bd',
        fixedWidth: 188,
      });
      const rail = this.add.rectangle(x + 31, y + 39, 188, 1, arena.accent, .28).setOrigin(0, .5);
      this.lessonObjects.push(emoji, english, pronunciation, chinese, rail);
    });
  }

  private startRun(): void {
    const save = SaveManager.load();
    save.selectedArenaId = this.selected;
    SaveManager.save(save);
    this.scene.start('CommandBlockScene', { seed: Date.now() & 0x7fffffff });
  }
}
