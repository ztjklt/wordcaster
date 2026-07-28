import Phaser from 'phaser';
import { ARENAS } from '../arena/BattleContent';

export class PreloadScene extends Phaser.Scene {
  private reducedMotion = false;

  constructor() { super('PreloadScene'); }

  preload(): void {
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.cameras.main.setBackgroundColor('#02050d');

    const background = this.add.graphics();
    background.fillGradientStyle(0x030713, 0x030713, 0x07101e, 0x02040b, 1);
    background.fillRect(0, 0, 1280, 720);
    background.fillStyle(0x59efd1, .035);
    background.fillCircle(640, 298, 244);
    background.lineStyle(1, 0x6f83a3, .055);
    for (let x = 90; x <= 1190; x += 100) background.lineBetween(x, 72, x, 650);
    for (let y = 90; y <= 650; y += 70) background.lineBetween(80, y, 1200, y);

    const halo = this.add.circle(640, 288, 116, 0x06101d, .78)
      .setStrokeStyle(1, 0x7e95b8, .22);
    const ring = this.add.circle(640, 288, 82, 0x59efd1, .025)
      .setStrokeStyle(2, 0x59efd1, .72)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.circle(640, 288, 10, 0xeafffb, .95)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(640, 288, 3, 104, 0x59efd1, .82).setRotation(Math.PI / 4);
    this.add.rectangle(640, 288, 1, 104, 0xffffff, .42).setRotation(-Math.PI / 4);

    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      this.add.rectangle(
        640 + Math.cos(angle) * 102,
        288 + Math.sin(angle) * 102,
        index % 3 === 0 ? 12 : 6,
        1,
        index % 3 === 0 ? 0x59efd1 : 0x7c8ba5,
        index % 3 === 0 ? .72 : .36,
      ).setRotation(angle);
    }

    this.add.text(640, 426, 'AWAKENING  THE  WORLD', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '17px',
      color: '#f3f8ff',
      letterSpacing: 5,
    }).setOrigin(.5);
    this.add.text(640, 454, '世界同步中  ·  SCENE ASSETS ONLINE', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#71839f',
      letterSpacing: 3,
    }).setOrigin(.5);

    this.add.rectangle(640, 512, 506, 5, 0x0a1424, .96)
      .setStrokeStyle(1, 0x667a99, .3);
    const barGlow = this.add.rectangle(387, 512, 0, 9, 0x59efd1, .16)
      .setOrigin(0, .5)
      .setBlendMode(Phaser.BlendModes.ADD);
    const bar = this.add.rectangle(387, 512, 0, 3, 0x59efd1, .98).setOrigin(0, .5);
    const percent = this.add.text(640, 542, '00%', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#9cb0cd',
      letterSpacing: 2,
    }).setOrigin(.5);
    const assetLabel = this.add.text(640, 578, 'PREPARING ARENAS', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#52627c',
      letterSpacing: 3,
    }).setOrigin(.5);

    if (!this.reducedMotion) {
      this.tweens.add({ targets: ring, angle: 360, duration: 7200, repeat: -1, ease: 'Linear' });
      this.tweens.add({ targets: [halo, core], scale: 1.08, alpha: .72, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      for (let index = 0; index < 9; index += 1) {
        const mote = this.add.circle(438 + index * 50, 622 + (index % 2) * 7, 1.5, index % 2 ? 0x59efd1 : 0x8ea2c0, .22);
        this.tweens.add({
          targets: mote,
          y: mote.y - 14,
          alpha: .7,
          duration: 1100 + index * 90,
          delay: index * 65,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }

    this.load.on('progress', (value: number) => {
      bar.width = 506 * value;
      barGlow.width = 506 * value;
      percent.setText(`${String(Math.round(value * 100)).padStart(2, '0')}%`);
    });
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      const cleanKey = String(file.key).replace(/[-_]/g, ' ').toUpperCase();
      assetLabel.setText(`SYNCING  /  ${cleanKey.slice(0, 34)}`);
    });
    this.load.on('complete', () => {
      assetLabel.setText('ALL SYSTEMS READY  /  同步完成');
      percent.setColor('#59efd1');
    });

    ARENAS.forEach((arena) => {
      this.load.image(arena.textureKey, arena.asset);
      this.load.image(arena.platformTextureKey, arena.platformAsset);
    });
    this.load.image('scene-home-base-v2', '/assets/scenes/home-base-v2.webp');
    this.load.image('scene-restaurant-v2', '/assets/scenes/restaurant-v2.webp');
    this.load.image('scene-training-dojo-v2', '/assets/scenes/training-dojo-v2.webp');
    this.load.image('vfx-anime-slash-v1', '/assets/vfx/anime-slash-v1.webp');
    this.load.image('vfx-anime-impact-v1', '/assets/vfx/anime-impact-v1.webp');
  }

  create(): void {
    this.cameras.main.fadeOut(this.reducedMotion ? 0 : 180, 2, 5, 13);
    this.time.delayedCall(this.reducedMotion ? 0 : 165, () => this.scene.start('MainMenuScene'));
  }
}
