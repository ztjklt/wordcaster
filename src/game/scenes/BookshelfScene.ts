import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { addGlassPanel, addIllustratedBackdrop } from './SceneArt';
import { addButton, addTitle } from './SceneHelpers';

interface MasteryEntry {
  key: string;
  value: number;
  type: 'WORD' | 'PATTERN';
}

export class BookshelfScene extends Phaser.Scene {
  constructor() { super('BookshelfScene'); }

  create(): void {
    const accent = 0xc69bff;
    const save = SaveManager.load();
    addIllustratedBackdrop(this, 'scene-home-base-v2', accent, .68);
    this.add.rectangle(640, 360, 1280, 720, 0x11071d, .28).setDepth(-12);
    addTitle(this, 'Memory archive / 05', '记忆书库', '查看单词、句式与口语练习留下的掌握度。');

    const entries: MasteryEntry[] = [
      ...Object.entries(save.vocabularyMastery).map(([key, value]) => ({ key, value, type: 'WORD' as const })),
      ...Object.entries(save.sentenceMastery).map(([key, value]) => ({ key, value, type: 'PATTERN' as const })),
    ].sort((a, b) => b.value - a.value).slice(0, 10);

    addGlassPanel(this, 640, 405, 1080, 390, accent, .87).setDepth(2);
    this.add.text(140, 237, 'MASTERY INDEX', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#c69bff',
      letterSpacing: 4,
    }).setDepth(4);
    this.add.text(1140, 237, `${Object.keys(save.vocabularyMastery).length} WORDS · ${Object.keys(save.sentenceMastery).length} PATTERNS`, {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8593ad',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(4);

    if (!entries.length) {
      this.add.text(640, 390, '书库尚未记录掌握度\n完成战斗、训练或命令方块后，学习轨迹会出现在这里。', {
        fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
        fontSize: '18px',
        color: '#abb7ca',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(.5).setDepth(5);
    } else {
      entries.forEach((entry, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 360 + column * 520;
        const y = 296 + row * 58;
        const color = entry.type === 'WORD' ? 0x72e1ff : 0xffcc72;
        this.add.text(x - 222, y - 11, entry.type, {
          fontFamily: 'Arial',
          fontSize: '7px',
          fontStyle: 'bold',
          color: `#${color.toString(16).padStart(6, '0')}`,
          letterSpacing: 2,
        }).setDepth(5);
        this.add.text(x - 142, y - 13, entry.key.toUpperCase(), {
          fontFamily: 'Arial Black, Arial',
          fontSize: '13px',
          color: '#f5f8ff',
        }).setDepth(5);
        this.add.rectangle(x + 54, y + 9, 196, 6, 0x152036, .92).setOrigin(0, .5).setDepth(5);
        this.add.rectangle(x + 54, y + 9, 196 * Phaser.Math.Clamp(entry.value / 100, 0, 1), 3, color, .92).setOrigin(0, .5).setDepth(6);
        this.add.text(x + 254, y - 5, `${Math.round(entry.value)}%`, {
          fontFamily: 'Arial Black, Arial',
          fontSize: '11px',
          color: '#e8eff9',
        }).setOrigin(1, 0).setDepth(6);
      });
    }

    addButton(this, 320, 622, '进入语音训练', () => this.scene.start('TrainingScene'), true).setScale(.74);
    addButton(this, 640, 622, '练习场景名词', () => this.scene.start('CommandBlockPrepareScene')).setScale(.74);
    addButton(this, 960, 622, '返回家园', () => this.scene.start('HomeScene')).setScale(.74);
  }
}
