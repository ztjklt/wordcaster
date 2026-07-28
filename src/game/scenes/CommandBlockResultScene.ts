import Phaser from 'phaser';
import type { CommandBlockRunStats } from '../command-block/CommandBlockRoundController';
import { getArena } from '../arena/BattleContent';
import { addAtmosphericBackdrop, addGlassPanel } from './SceneArt';
import { addButton } from './SceneHelpers';

export class CommandBlockResultScene extends Phaser.Scene {
  private stats!: CommandBlockRunStats;

  constructor() { super('CommandBlockResultScene'); }
  init(data: CommandBlockRunStats): void { this.stats = data; }

  create(): void {
    const arena = getArena(this.stats.arenaId);
    addAtmosphericBackdrop(this, arena.id, .82);
    const accent = this.stats.won ? arena.accent : 0xff657d;
    const accentCss = this.stats.won ? arena.accentCss : '#ff657d';
    this.add.text(76, 48, 'COMMAND BLOCK REPORT', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 5,
    });
    this.add.text(73, 75, this.stats.won ? '方块共鸣完成' : '共鸣中断', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '52px',
      color: '#f8fbff',
    }).setShadow(0, 7, '#02040a', 14);
    this.add.text(76, 143, this.stats.perfect
      ? 'PERFECT · 十个名词全部通过语音激活'
      : `${this.stats.correctWords.length} / 10 已激活 · ${this.stats.playerSurvived ? '玩家幸存' : '生命耗尽'}`, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#a8b7ca',
    });

    addGlassPanel(this, 640, 274, 1120, 180, accent, .88);
    this.metric(132, 223, 'TOTAL SCORE', this.stats.score.toLocaleString(), accentCss);
    this.metric(395, 223, 'BEST COMBO', `× ${this.stats.bestCombo}`, '#f8d475');
    this.metric(650, 223, 'VOICE CLEAR', String(this.stats.voiceCorrect), '#72ddff');
    this.metric(902, 223, 'TEXT CLEAR', String(this.stats.textCorrect), '#c4a3ff');
    this.metric(1120, 223, 'AVG TIME', `${(this.stats.averageResponseMs / 1000).toFixed(1)}s`, '#f8fbff');

    this.add.text(82, 397, 'WORD REVIEW / 本局复盘', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#8293ad',
      letterSpacing: 4,
    });
    const all = [...this.stats.correctWords.map((word) => ({ word, ok: true })), ...this.stats.failedWords.map((word) => ({ word, ok: false }))];
    all.forEach((entry, index) => {
      const x = 154 + index % 5 * 242;
      const y = 420 + Math.floor(index / 5) * 82;
      this.add.text(x, y, entry.ok ? '✓' : '×', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '24px',
        color: entry.ok ? arena.accentCss : '#ff657d',
      }).setOrigin(.5);
      this.add.text(x, y + 29, entry.word.toUpperCase(), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: '#f7faff',
      }).setOrigin(.5);
      this.add.rectangle(x, y + 55, 174, 2, entry.ok ? arena.accent : 0xff657d, .58);
    });

    this.add.text(82, 590, `奖励  +${this.stats.rewardCoins} COINS   ·   +${this.stats.rewardXp} ENGLISH XP   ·   失误 ${this.stats.wrongCount}   超时 ${this.stats.timeoutCount}`, {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 2,
    });
    addButton(this, 466, 654, '返回家园', () => this.scene.start('HomeScene'), true).setScale(.84);
    addButton(this, 812, 654, '再来一局十词共鸣', () => this.scene.start('CommandBlockPrepareScene')).setScale(.84);
    this.cameras.main.fadeIn(380, 2, 4, 10);
  }

  private metric(x: number, y: number, label: string, value: string, color: string): void {
    this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#71819b',
      letterSpacing: 2,
    });
    this.add.text(x, y + 27, value, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '27px',
      color,
    });
  }
}
