import Phaser from 'phaser';
import { addButton, addTitle } from './SceneHelpers';
import { getArena } from '../arena/BattleContent';
import { SaveManager } from '../../storage/SaveManager';
import { StickFigureRig } from '../entities/StickFigureRig';

export class MainMenuScene extends Phaser.Scene {
  private heroRig?: StickFigureRig;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    const arena = getArena(SaveManager.load().selectedArenaId);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.cameras.main.setBackgroundColor('#030610');
    this.cameras.main.fadeIn(reducedMotion ? 0 : 520, 3, 6, 16);

    const backdrop = this.add.image(640, 360, arena.textureKey).setDisplaySize(1314, 740).setAlpha(.92);
    if (!reducedMotion) {
      this.tweens.add({
        targets: backdrop,
        x: 649,
        y: 356,
        duration: 15000,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.rectangle(318, 360, 636, 720, 0x02050e, .91);
    this.add.rectangle(668, 360, 116, 720, 0x030711, .52);
    this.add.rectangle(640, 695, 1280, 90, 0x02040a, .72);
    this.add.rectangle(632, 360, 2, 720, arena.accent, .26).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(636, 360, 24, 720, arena.accent, .025).setBlendMode(Phaser.BlendModes.ADD);

    for (let index = 0; index < 6; index += 1) {
      const line = this.add.rectangle(704 + index * 96, 360, 1, 720, 0xb4c6df, .035);
      if (index % 2 === 0) line.setAlpha(.055);
    }
    for (let index = 0; index < 5; index += 1) {
      this.add.rectangle(968, 205 + index * 92, 504, 1, arena.accent, .035);
    }

    const halo = this.add.circle(1005, 407, 232, 0x02050e, .56)
      .setStrokeStyle(2, arena.accent, .28)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(1005, 407, 188, arena.accent, .035).setStrokeStyle(1, 0xffffff, .12);
    this.add.circle(1005, 407, 134, 0x02050e, .2).setStrokeStyle(1, arena.accent, .16);
    this.add.rectangle(1005, 407, 520, 1, arena.accent, .13);
    this.add.rectangle(1005, 407, 1, 520, arena.accent, .13);
    if (!reducedMotion) {
      this.tweens.add({ targets: halo, alpha: .72, scale: 1.035, duration: 2800, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    }

    this.addAtmosphere(arena.accent, reducedMotion);
    addTitle(this, 'Voice becomes power', 'SPEAK TO FIGHT', '让英语成为武器，让每一句话改变战场。');

    this.add.text(92, 226, 'VOICE COMBAT  /  LIVE ENGLISH  /  STORY WORLD', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#71819d',
      letterSpacing: 2,
    });

    addButton(this, 250, 303, '选择战斗模式', () => this.scene.start('ModeSelectScene'), true);
    addButton(this, 250, 376, '进入行动基地', () => this.scene.start('HomeScene'));
    addButton(this, 250, 449, '语音训练场', () => this.scene.start('TrainingScene')).setScale(.92);
    addButton(this, 250, 518, '游戏设置', () => this.scene.start('SettingsScene')).setScale(.92);

    this.add.rectangle(92, 588, 396, 1, 0x91a5c3, .16).setOrigin(0, .5);
    this.add.text(92, 605, `${arena.name.toUpperCase()}  /  CURRENT ARENA`, {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 3,
    });
    this.add.text(92, 629, arena.subtitle, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#7f8da7',
    });

    this.add.text(760, 64, 'INCANTATION // 01', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 4,
    });
    this.add.rectangle(760, 86, 432, 1, arena.accent, .38).setOrigin(0, .5);
    this.add.text(1188, 68, '横屏体验', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#c3cde0',
      letterSpacing: 2,
    }).setOrigin(1, 0);

    this.add.text(1005, 588, '言 灵 驱 动', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 10,
    }).setOrigin(.5).setAlpha(.88);
    this.add.text(1005, 615, 'VOICE  /  BLADE  /  INTENT', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: arena.accentCss,
      letterSpacing: 4,
    }).setOrigin(.5).setAlpha(.72);

    this.add.text(92, 692, '© SPEAK TO FIGHT', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#52617b',
      letterSpacing: 2,
    }).setOrigin(0, 1);
    this.add.text(1188, 692, 'L / 言灵   ·   N / 念写', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#687894',
      letterSpacing: 2,
    }).setOrigin(1, 1);

    this.heroRig = new StickFigureRig(this, 0x63f0d4, 4);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.heroRig?.destroy();
      this.heroRig = undefined;
    });
  }

  update(time: number, delta: number): void {
    this.heroRig?.update(1005, 526, -1, 0, 0, false, true, time, delta);
  }

  private addAtmosphere(accent: number, reducedMotion: boolean): void {
    const colors = [accent, 0xffffff, 0x63f0d4];
    for (let index = 0; index < 18; index += 1) {
      const x = 686 + (index * 83) % 558;
      const y = 104 + (index * 137) % 500;
      const mote = this.add.circle(x, y, index % 4 === 0 ? 2 : 1, colors[index % colors.length], .18 + (index % 3) * .08)
        .setBlendMode(Phaser.BlendModes.ADD);
      if (!reducedMotion) {
        this.tweens.add({
          targets: mote,
          y: y - 24 - (index % 4) * 8,
          alpha: .04,
          duration: 2600 + (index % 5) * 480,
          delay: index * 80,
          ease: 'Sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }
}
