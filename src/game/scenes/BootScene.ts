import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.cameras.main.setBackgroundColor('#02050d');

    for (let index = 0; index < 7; index += 1) {
      this.add.rectangle(640, 116 + index * 82, 1180, 1, 0x7b91b0, index === 3 ? .09 : .035);
    }
    for (let index = 0; index < 11; index += 1) {
      this.add.rectangle(90 + index * 110, 360, 1, 610, 0x7b91b0, index === 5 ? .09 : .025);
    }

    const glow = this.add.circle(640, 328, 144, 0x63f0d4, .025)
      .setStrokeStyle(2, 0x63f0d4, .2)
      .setBlendMode(Phaser.BlendModes.ADD);
    const outer = this.add.circle(640, 328, 112, 0x02050d, .7)
      .setStrokeStyle(1, 0xe8fff9, .18);
    const inner = this.add.circle(640, 328, 74, 0x63f0d4, .055)
      .setStrokeStyle(2, 0x63f0d4, .72);
    const slashA = this.add.rectangle(640, 328, 5, 104, 0x63f0d4, .92).setRotation(Math.PI / 4);
    const slashB = this.add.rectangle(640, 328, 2, 104, 0xffffff, .56).setRotation(-Math.PI / 4);
    const core = this.add.circle(640, 328, 7, 0xf7fffd, 1);

    const title = this.add.text(640, 474, 'SPEAK  TO  FIGHT', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#f4f8ff',
      letterSpacing: 7,
    }).setOrigin(.5);
    const sub = this.add.text(640, 513, 'VOICE BECOMES POWER', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#63f0d4',
      letterSpacing: 5,
    }).setOrigin(.5);
    const status = this.add.text(640, 650, 'INITIALIZING  /  言灵系统启动中', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#71809a',
      letterSpacing: 3,
    }).setOrigin(.5);
    const rail = this.add.rectangle(640, 676, 240, 1, 0x475875, .5);
    const progress = this.add.rectangle(520, 676, 0, 2, 0x63f0d4, .94).setOrigin(0, .5);

    if (!reducedMotion) {
      [outer, inner, slashA, slashB, title, sub, status, rail].forEach((object) => object.setAlpha(0));
      glow.setScale(.72).setAlpha(0);
      core?.setAlpha(0);
      this.tweens.add({ targets: glow, alpha: .6, scale: 1, duration: 520, ease: 'Cubic.out' });
      this.tweens.add({ targets: [outer, inner], alpha: 1, scale: { from: 1.12, to: 1 }, duration: 450, delay: 90, ease: 'Cubic.out' });
      this.tweens.add({ targets: [slashA, slashB, core], alpha: 1, duration: 260, delay: 220 });
      this.tweens.add({ targets: [title, sub], alpha: 1, y: '-=5', duration: 360, delay: 330, ease: 'Cubic.out' });
      this.tweens.add({ targets: [status, rail], alpha: 1, duration: 260, delay: 470 });
      this.tweens.add({ targets: progress, width: 240, duration: 700, delay: 160, ease: 'Sine.inOut' });
      this.tweens.add({ targets: glow, alpha: .28, scale: 1.05, duration: 720, delay: 520, yoyo: true, repeat: -1 });
    } else {
      progress.width = 240;
    }

    const duration = reducedMotion ? 80 : 980;
    this.time.delayedCall(duration, () => {
      this.cameras.main.fadeOut(reducedMotion ? 0 : 160, 2, 5, 13);
      this.time.delayedCall(reducedMotion ? 0 : 145, () => this.scene.start('PreloadScene'));
    });
  }
}
