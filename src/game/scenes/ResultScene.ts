import Phaser from 'phaser';
import type { BattleStats } from '../combat/BattleStats';
import { addButton } from './SceneHelpers';
import { addAtmosphericBackdrop, addGlassPanel } from './SceneArt';

interface ResultMetric {
  label: string;
  value: string;
  ratio: number;
}

export class ResultScene extends Phaser.Scene {
  private stats!: BattleStats;

  constructor() { super('ResultScene'); }
  init(data: BattleStats): void { this.stats = data; }

  create(): void {
    const won = this.stats.won;
    addAtmosphericBackdrop(this, undefined, .84);
    const accent = won ? 0x63f0d4 : 0xff6279;
    const accentCss = won ? '#63f0d4' : '#ff6279';
    const grade = this.calculateGrade();

    this.addCinematicField(accent);

    this.add.text(84, 45, 'BATTLE REPORT', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 5,
    });
    this.add.rectangle(84, 68, 118, 2, accent, .82).setOrigin(0, .5);
    this.add.rectangle(210, 68, 380, 2, 0x8291aa, .18).setOrigin(0, .5);
    this.add.text(82, 73, won ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '64px',
      color: '#f7f9ff',
      letterSpacing: 2,
    }).setShadow(0, 7, '#02040a', 16);
    this.add.text(84, 144, won ? '战斗胜利 · 言灵同步完成' : '战斗结束 · 重整言灵再出发', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#aebbd0',
      letterSpacing: 1,
    });

    this.addGradeSeal(1094, 105, grade, accent, accentCss);
    this.addRewardRail(accent, accentCss);

    const outgoing = Math.max(1, this.stats.damageDealt + this.stats.damageTaken);
    const voiceBase = Math.max(1, this.stats.voiceUses);
    this.addMetricPanel(336, 383, 'COMBAT', '战斗表现', [
      { label: '造成伤害', value: `${this.stats.damageDealt}`, ratio: this.stats.damageDealt / outgoing },
      { label: '承受伤害', value: `${this.stats.damageTaken}`, ratio: 1 - this.stats.damageTaken / outgoing },
      { label: '语音次数', value: `${this.stats.voiceUses}`, ratio: Math.min(1, this.stats.voiceUses / 8) },
      { label: '正确表达', value: `${this.stats.correctExpressions}`, ratio: this.stats.correctExpressions / voiceBase },
    ], accent);
    this.addMetricPanel(944, 383, 'LINGUA', '英语复盘', [
      { label: '独立表达', value: `${this.stats.independentExpressions}`, ratio: Math.min(1, this.stats.independentExpressions / 5) },
      { label: '错误召唤', value: `${this.stats.wrongSummons}`, ratio: 1 - Math.min(1, this.stats.wrongSummons / 4) },
      { label: '快速重试', value: `${this.stats.retries}`, ratio: 1 - Math.min(1, this.stats.retries / 5) },
      { label: '使用提示', value: `${this.stats.hintsUsed}`, ratio: 1 - Math.min(1, this.stats.hintsUsed / 4) },
    ], 0x83a7ff);

    this.addReviewRail(accent, accentCss);

    addButton(this, 470, 654, '返回家园', () => this.scene.start('HomeScene'), true).setScale(.86);
    addButton(this, 810, 654, '再次挑战', () => this.scene.start('BattlePrepareScene')).setScale(.86);

    this.cameras.main.fadeIn(460, 2, 4, 10);
    if (won) {
      this.time.delayedCall(180, () => this.cameras.main.flash(220, 60, 210, 180, false));
    }
  }

  private addCinematicField(accent: number): void {
    const lines = this.add.graphics().setDepth(-25);
    lines.lineStyle(1, 0x7f91ad, .13);
    for (let x = 32; x < 1280; x += 80) lines.lineBetween(x, 190, x, 680);
    for (let y = 190; y < 690; y += 56) lines.lineBetween(0, y, 1280, y);

    const ring = this.add.graphics().setDepth(-24).setAlpha(.38);
    ring.lineStyle(1, accent, .38);
    ring.strokeCircle(1094, 105, 72);
    ring.lineStyle(1, 0xffffff, .12);
    ring.strokeCircle(1094, 105, 86);
    this.tweens.add({ targets: ring, angle: 360, duration: 28000, repeat: -1 });

    for (let index = 0; index < 12; index += 1) {
      const x = 70 + index * 108;
      const streak = this.add.rectangle(x, 198 + (index % 3) * 11, 32 + (index % 4) * 14, 1, accent, .22)
        .setRotation(-.18)
        .setDepth(-23);
      this.tweens.add({
        targets: streak,
        x: x + 38,
        alpha: { from: .08, to: .34 },
        duration: 2200 + index * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private addGradeSeal(
    x: number,
    y: number,
    grade: string,
    accent: number,
    accentCss: string,
  ): void {
    const glow = this.add.circle(x, y, 56, accent, .12).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(x, y, 49, 0x06101d, .92).setStrokeStyle(2, accent, .8);
    this.add.circle(x, y, 39, accent, .07).setStrokeStyle(1, 0xffffff, .2);
    this.add.text(x, y - 8, grade, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '48px',
      color: '#f7f9ff',
    }).setOrigin(.5).setShadow(0, 0, accentCss, 12);
    this.add.text(x, y + 31, 'SYNC RANK', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: accentCss,
      letterSpacing: 2,
    }).setOrigin(.5);
    this.tweens.add({
      targets: glow,
      scale: { from: .9, to: 1.18 },
      alpha: { from: .08, to: .22 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private addRewardRail(accent: number, accentCss: string): void {
    addGlassPanel(this, 640, 213, 1112, 72, accent, .9);
    this.add.text(108, 190, 'MISSION TIME', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#6f7f99',
      letterSpacing: 2,
    });
    this.add.text(108, 209, `${this.stats.durationSeconds}s`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#f5f8ff',
    });

    this.add.rectangle(414, 213, 1, 40, 0x72829d, .25);
    this.add.text(454, 190, 'COIN REWARD', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#6f7f99',
      letterSpacing: 2,
    });
    this.add.circle(466, 222, 9, 0xffcf70, .14).setStrokeStyle(1, 0xffcf70, .8);
    this.add.text(488, 209, `+${this.stats.rewardCoins}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#ffda85',
    });

    this.add.rectangle(804, 213, 1, 40, 0x72829d, .25);
    this.add.text(846, 190, 'ENGLISH EXPERIENCE', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#6f7f99',
      letterSpacing: 2,
    });
    this.add.text(846, 209, `+${this.stats.rewardXp} XP`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: accentCss,
    }).setShadow(0, 0, accentCss, 7);
  }

  private addMetricPanel(
    x: number,
    y: number,
    code: string,
    title: string,
    rows: ResultMetric[],
    color: number,
  ): void {
    const panel = addGlassPanel(this, x, y, 560, 276, color, .9);
    panel.setAlpha(0).setY(y + 22);
    this.tweens.add({ targets: panel, alpha: 1, y, duration: 430, delay: x > 640 ? 150 : 80, ease: 'Cubic.out' });

    this.add.text(x - 244, y - 112, code, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#71819c',
      letterSpacing: 3,
    });
    this.add.text(x - 244, y - 94, title, {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    });
    this.add.text(x + 244, y - 104, '◈', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(1, .5);

    rows.forEach((row, index) => {
      const rowY = y - 51 + index * 47;
      const ratio = Phaser.Math.Clamp(row.ratio, 0, 1);
      this.add.text(x - 244, rowY, row.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#afbdd2',
      });
      this.add.text(x + 240, rowY - 2, row.value, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: '#f5f8ff',
      }).setOrigin(1, 0);
      this.add.rectangle(x - 88, rowY + 11, 216, 4, 0x1b2940, .95).setOrigin(0, .5);
      const bar = this.add.rectangle(x - 88, rowY + 11, Math.max(4, 216 * ratio), 4, color, .82)
        .setOrigin(0, .5)
        .setScale(0, 1);
      this.tweens.add({
        targets: bar,
        scaleX: 1,
        duration: 560,
        delay: 180 + index * 70,
        ease: 'Cubic.out',
      });
      if (index < rows.length - 1) {
        this.add.rectangle(x, rowY + 33, 488, 1, 0x71819b, .12);
      }
    });
  }

  private addReviewRail(accent: number, accentCss: string): void {
    const y = 556;
    this.add.rectangle(640, y, 1112, 54, 0x060d1a, .9)
      .setStrokeStyle(1, this.stats.lastMistake ? 0xffcf70 : accent, .42);
    this.add.rectangle(85, y, 3, 34, this.stats.lastMistake ? 0xffcf70 : accent, .8);
    this.add.text(108, y - 14, this.stats.lastMistake ? 'NEXT FOCUS' : 'LANGUAGE SYNC', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: this.stats.lastMistake ? '#ffcf70' : accentCss,
      letterSpacing: 3,
    });
    this.add.text(108, y + 3, this.stats.lastMistake
      ? `需要复习：${this.stats.lastMistake}  ·  Try again with the correct key word.`
      : '表达稳定，本次战斗未记录需要复习的关键词。', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#c3cee0',
    });
    this.add.text(1172, y, this.stats.lastMistake ? 'REVIEW' : 'CLEAR', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '12px',
      color: this.stats.lastMistake ? '#ffcf70' : accentCss,
      letterSpacing: 2,
    }).setOrigin(1, .5);
  }

  private calculateGrade(): string {
    const voiceBase = Math.max(1, this.stats.voiceUses);
    const accuracy = this.stats.correctExpressions / voiceBase;
    const score = Phaser.Math.Clamp(
      (this.stats.won ? 48 : 24)
      + accuracy * 24
      + Math.min(18, this.stats.independentExpressions * 5)
      - this.stats.wrongSummons * 5
      - this.stats.hintsUsed * 2
      - this.stats.retries,
      0,
      100,
    );
    if (score >= 88) return 'S';
    if (score >= 74) return 'A';
    if (score >= 58) return 'B';
    return 'C';
  }
}
