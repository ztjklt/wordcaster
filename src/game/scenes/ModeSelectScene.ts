import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { getArena } from '../arena/BattleContent';
import { addAtmosphericBackdrop } from './SceneArt';
import { addButton } from './SceneHelpers';

export class ModeSelectScene extends Phaser.Scene {
  constructor() { super('ModeSelectScene'); }

  create(): void {
    const arena = addAtmosphericBackdrop(this, SaveManager.load().selectedArenaId, .68);
    this.add.text(76, 50, 'SELECT GAME MODE', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 5,
    });
    this.add.text(73, 74, '选择战斗方式', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '48px',
      color: '#f8fbff',
    }).setShadow(0, 7, '#02040a', 14);
    this.add.text(76, 137, '同一片战场，两种英语驱动方式。进度与场景选择会自动保留。', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#9aaac2',
    });

    this.addModeCard(
      350,
      365,
      '01',
      '言灵决斗',
      'VOICE DUEL',
      '自由移动、攻击与格挡。用完整英语指令召唤装备、改变物件并回应敌人的语言挑战。',
      ['实时口语', '动作战斗', 'AI 意图理解'],
      arena.accent,
      arena.accentCss,
      () => this.scene.start('BattlePrepareScene'),
    );
    this.addModeCard(
      930,
      365,
      '02',
      '命令方块',
      'COMMAND BLOCK',
      '十个完整单词化为浮空平台。朗读任意未点亮名词，释放它独有的战场效果并完成十词共鸣。',
      ['十词共鸣', '专属效果', '语音 / 念写'],
      0x72ddff,
      '#72ddff',
      () => this.scene.start('CommandBlockPrepareScene'),
    );
    addButton(this, 216, 662, '返回主菜单', () => this.scene.start('MainMenuScene')).setScale(.72);
    this.add.text(1198, 678, `${getArena(arena.id).name.toUpperCase()}  //  HORIZONTAL`, {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#60718d',
      letterSpacing: 3,
    }).setOrigin(1, .5);
    this.cameras.main.fadeIn(320, 2, 4, 10);
  }

  private addModeCard(
    x: number,
    y: number,
    index: string,
    title: string,
    english: string,
    copy: string,
    tags: string[],
    accent: number,
    accentCss: string,
    onClick: () => void,
  ): void {
    const shadow = this.add.rectangle(9, 12, 516, 360, 0x010309, .55);
    const surface = this.add.rectangle(0, 0, 506, 350, 0x07101f, .87)
      .setStrokeStyle(1, 0x6d7f9b, .42)
      .setInteractive({ useHandCursor: true });
    const glow = this.add.rectangle(0, -170, 480, 3, accent, .78);
    const numeral = this.add.text(-216, -139, index, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '54px',
      color: accentCss,
    }).setAlpha(.18);
    const code = this.add.text(-212, -78, english, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 4,
    });
    const heading = this.add.text(-214, -48, title, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '34px',
      color: '#f7faff',
    });
    const divider = this.add.rectangle(-214, 6, 426, 1, 0x7c8ea8, .2).setOrigin(0, .5);
    const body = this.add.text(-214, 28, copy, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a9b6ca',
      fixedWidth: 426,
      lineSpacing: 8,
      wordWrap: { width: 426 },
    });
    const tagObjects = tags.flatMap((tag, tagIndex) => {
      const tagX = -157 + tagIndex * 146;
      return [
        this.add.circle(tagX - 48, 118, 3, accent, .85),
        this.add.text(tagX - 37, 118, tag, {
          fontFamily: 'Arial',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#dce6f5',
        }).setOrigin(0, .5),
      ];
    });
    const action = this.add.text(214, 153, '进入  →', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 2,
    }).setOrigin(1, .5);
    const container = this.add.container(x, y, [shadow, surface, glow, numeral, code, heading, divider, body, ...tagObjects, action]);
    surface.on('pointerover', () => {
      surface.setStrokeStyle(2, accent, .9);
      this.tweens.add({ targets: container, y: y - 7, duration: 160, ease: 'Sine.out' });
      this.tweens.add({ targets: action, x: 222, duration: 160 });
    });
    surface.on('pointerout', () => {
      surface.setStrokeStyle(1, 0x6d7f9b, .42);
      this.tweens.add({ targets: container, y, duration: 180, ease: 'Sine.out' });
      this.tweens.add({ targets: action, x: 214, duration: 180 });
    });
    surface.on('pointerdown', onClick);
  }
}
