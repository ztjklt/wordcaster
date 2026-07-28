import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { addButton, addTitle } from './SceneHelpers';
import { addAtmosphericBackdrop, addGlassPanel } from './SceneArt';

export class SettingsScene extends Phaser.Scene {
  private message!: Phaser.GameObjects.Text;

  constructor() { super('SettingsScene'); }

  create(): void {
    const save = SaveManager.load();
    const arena = addAtmosphericBackdrop(this, save.selectedArenaId, .84);

    this.addCircuitField(arena.accent);
    addTitle(this, 'System Calibration', '设置', '校准声音、触感与战斗表现。');

    const readout = addGlassPanel(this, 372, 421, 592, 376, arena.accent, .9);
    const controls = addGlassPanel(this, 958, 421, 414, 376, arena.accent, .88);
    readout.setAlpha(0).setX(344);
    controls.setAlpha(0).setX(986);
    this.tweens.add({ targets: readout, alpha: 1, x: 372, duration: 420, ease: 'Cubic.out' });
    this.tweens.add({ targets: controls, alpha: 1, x: 958, duration: 480, delay: 70, ease: 'Cubic.out' });

    this.add.text(106, 246, 'SYSTEM READOUT', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 4,
    });
    this.add.text(106, 268, '当前设备配置', {
      fontFamily: 'Arial',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    });
    this.add.circle(620, 258, 4, 0x63f0d4, .95).setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(632, 251, 'ONLINE', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#63f0d4',
      letterSpacing: 2,
    });

    this.addVolumeReadout(116, 313, 'MUSIC', '音乐音量', save.settings.musicVolume, arena.accent);
    this.addVolumeReadout(116, 374, 'SFX', '音效音量', save.settings.soundVolume, arena.accent);
    this.addSwitchReadout(
      116,
      435,
      'HAPTICS',
      '触感震动',
      save.settings.hapticsEnabled !== false,
      arena.accent,
      'ON',
      'OFF',
    );
    this.addSwitchReadout(
      116,
      496,
      'VFX',
      '特效质量',
      save.settings.effectsQuality !== 'low',
      arena.accent,
      'HIGH',
      'LITE',
    );

    this.add.rectangle(372, 548, 522, 1, 0x7384a2, .24);
    this.add.text(116, 563, 'SAVE PROTOCOL', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#63708a',
      letterSpacing: 2,
    });
    this.add.text(116, 580, `存档版本  v${save.saveVersion}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aab7cc',
    });
    this.add.text(620, 570, 'AUTO-SYNC', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 1,
    }).setOrigin(1, 0);

    this.add.text(787, 246, 'CONTROL DECK', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 4,
    });
    this.add.text(787, 268, '快速调整', {
      fontFamily: 'Arial',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    });

    addButton(this, 958, 322, '切换静音', () => {
      const current = SaveManager.load();
      const muted = current.settings.soundVolume === 0;
      current.settings.soundVolume = muted ? .8 : 0;
      current.settings.musicVolume = muted ? .7 : 0;
      SaveManager.save(current);
      this.scene.restart();
    }, true).setScale(.94);
    addButton(this, 958, 388, `震动：${save.settings.hapticsEnabled !== false ? '开' : '关'}`, () => {
      const current = SaveManager.load();
      current.settings.hapticsEnabled = current.settings.hapticsEnabled === false;
      SaveManager.save(current);
      this.scene.restart();
    }).setScale(.94);
    addButton(this, 958, 454, `特效：${save.settings.effectsQuality === 'low' ? '流畅' : '高品质'}`, () => {
      const current = SaveManager.load();
      current.settings.effectsQuality = current.settings.effectsQuality === 'low' ? 'high' : 'low';
      SaveManager.save(current);
      this.scene.restart();
    }).setScale(.94);
    addButton(this, 958, 520, '重新查看教程', () => {
      const current = SaveManager.load();
      current.settings.tutorialSeen = false;
      SaveManager.save(current);
      this.showMessage('下次战斗将显示教程', arena.accentCss);
    }).setScale(.94);
    addButton(this, 958, 586, '重置存档', () => {
      SaveManager.reset();
      this.showMessage('存档已重置', '#ffcf70');
    }).setScale(.94);

    this.message = this.add.text(640, 620, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffcf70',
      letterSpacing: 1,
    }).setOrigin(.5).setAlpha(0);

    addButton(this, 216, 665, '返回主菜单', () => this.scene.start('MainMenuScene')).setScale(.76);
    this.add.text(1180, 655, 'S — F  /  CONFIG 02', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#52617b',
      letterSpacing: 2,
    }).setOrigin(1, .5);

    this.cameras.main.fadeIn(380, 2, 5, 12);
  }

  private addCircuitField(accent: number): void {
    const grid = this.add.graphics().setDepth(-26).setAlpha(.24);
    grid.lineStyle(1, 0x60708b, .18);
    for (let x = 48; x < 1280; x += 64) grid.lineBetween(x, 226, x, 700);
    for (let y = 226; y < 720; y += 48) grid.lineBetween(0, y, 1280, y);

    const horizon = this.add.graphics().setDepth(-25);
    horizon.lineStyle(1, accent, .23);
    horizon.lineBetween(56, 216, 1224, 216);
    horizon.lineStyle(2, accent, .42);
    horizon.lineBetween(56, 216, 252, 216);
    horizon.lineBetween(1028, 216, 1224, 216);

    for (let i = 0; i < 8; i += 1) {
      const dot = this.add.circle(92 + i * 157, 680 - (i % 3) * 14, 2 + (i % 2), accent, .28)
        .setDepth(-24)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        alpha: { from: .12, to: .48 },
        y: dot.y - 8,
        duration: 1800 + i * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private addVolumeReadout(
    x: number,
    y: number,
    code: string,
    label: string,
    value: number,
    accent: number,
  ): void {
    const percent = Math.round(value * 100);
    this.add.text(x, y, code, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#66758f',
      letterSpacing: 2,
    });
    this.add.text(x, y + 17, label, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#c6d1e3',
    });
    this.add.text(620, y + 10, `${percent.toString().padStart(2, '0')}%`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '18px',
      color: value > 0 ? '#f5f8ff' : '#6e7b92',
    }).setOrigin(1, 0);

    const startX = 310;
    for (let index = 0; index < 12; index += 1) {
      const active = index < Math.round(value * 12);
      this.add.rectangle(startX + index * 20, y + 27, 14, 4, active ? accent : 0x26334a, active ? .8 : .7)
        .setOrigin(0, .5);
    }
    this.add.rectangle(372, y + 51, 512, 1, 0x7384a2, .17);
  }

  private addSwitchReadout(
    x: number,
    y: number,
    code: string,
    label: string,
    enabled: boolean,
    accent: number,
    enabledLabel: string,
    disabledLabel: string,
  ): void {
    this.add.text(x, y, code, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#66758f',
      letterSpacing: 2,
    });
    this.add.text(x, y + 17, label, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#c6d1e3',
    });
    this.add.rectangle(563, y + 24, 112, 30, 0x111c30, .94)
      .setStrokeStyle(1, enabled ? accent : 0x5b6880, enabled ? .62 : .4);
    const indicator = this.add.circle(enabled ? 600 : 526, y + 24, 9, enabled ? accent : 0x5d687b, .9);
    if (enabled) indicator.setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(563, y + 24, enabled ? enabledLabel : disabledLabel, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: enabled ? '#eafffa' : '#8c98ad',
      letterSpacing: 1,
    }).setOrigin(.5);
    this.add.rectangle(372, y + 51, 512, 1, 0x7384a2, .17);
  }

  private showMessage(text: string, color: string): void {
    this.message.setText(text).setColor(color).setAlpha(0).setY(630);
    this.tweens.killTweensOf(this.message);
    this.tweens.add({
      targets: this.message,
      alpha: 1,
      y: 620,
      duration: 180,
      yoyo: true,
      hold: 1200,
      ease: 'Sine.out',
    });
  }
}
