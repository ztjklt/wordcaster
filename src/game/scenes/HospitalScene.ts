import Phaser from 'phaser';
import { ProgressionSystem } from '../../home/ProgressionSystem';
import { SaveManager } from '../../storage/SaveManager';
import { addGlassPanel, addIllustratedBackdrop } from './SceneArt';
import { addButton, addTitle } from './SceneHelpers';

export class HospitalScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;

  constructor() { super('HospitalScene'); }

  create(): void {
    const accent = 0x72e1ff;
    const save = SaveManager.load();
    addIllustratedBackdrop(this, 'scene-home-base-v2', accent, .68);
    this.add.rectangle(640, 360, 1280, 720, 0x03101a, .32).setDepth(-12);
    addTitle(this, 'Recovery clinic / 04', '生命诊所', '强化生命、体力与长期行动能力。');

    addGlassPanel(this, 640, 405, 1060, 360, accent, .86).setDepth(2);
    this.add.text(150, 256, 'OPERATIVE DIAGNOSTICS', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#72e1ff',
      letterSpacing: 4,
    }).setDepth(4);
    this.add.text(1130, 256, `COINS  ${save.player.coins}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '16px',
      color: '#ffdb7a',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(4);

    this.metric(190, 330, 'MAX HEALTH', save.player.maxHealth, 0x63f0d4);
    this.metric(430, 330, 'MAX STAMINA', save.player.maxStamina, 0xf2cc70);
    this.metric(670, 330, 'SKILL SLOTS', save.player.skillSlots, 0xbf9cff);
    this.metric(910, 330, 'OPERATIVE LEVEL', save.player.level, 0x72e1ff);

    const baseCost = 30 + (save.player.level - 1) * 10;
    addButton(this, 320, 492, `生命强化 +10 · ${baseCost}`, () => this.upgrade('health'), true).setScale(.76);
    addButton(this, 640, 492, `体力强化 +10 · ${baseCost}`, () => this.upgrade('stamina')).setScale(.76);
    addButton(this, 960, 492, '技能槽扩展 · 80', () => this.upgrade('skillSlot')).setScale(.76);
    this.status = this.add.text(640, 565, '选择一项强化 · 所有改造都会立即保存', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#91a4bd',
    }).setOrigin(.5).setDepth(5);
    addButton(this, 260, 650, '返回家园', () => this.scene.start('HomeScene')).setScale(.7);
  }

  private metric(x: number, y: number, label: string, value: number, color: number): void {
    this.add.circle(x, y, 58, color, .05).setStrokeStyle(2, color, .42).setDepth(4);
    this.add.text(x, y - 13, String(value), {
      fontFamily: 'Arial Black, Arial',
      fontSize: '31px',
      color: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(.5).setDepth(5);
    this.add.text(x, y + 32, label, {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8a9ab2',
      letterSpacing: 2,
    }).setOrigin(.5).setDepth(5);
  }

  private upgrade(id: 'health' | 'stamina' | 'skillSlot'): void {
    const result = new ProgressionSystem().upgrade(id);
    this.status.setText(result.message).setColor(result.success ? '#75f2d8' : '#ff9a91');
    if (result.success) this.time.delayedCall(480, () => this.scene.restart());
  }
}
