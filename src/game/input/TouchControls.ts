import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';

interface TouchState {
  left: boolean;
  right: boolean;
  block: boolean;
  jumpQueued: boolean;
  attackQueued: boolean;
}

type HoldKey = 'left' | 'right' | 'block';
type TapKey = 'jumpQueued' | 'attackQueued';
type ControlIcon = 'left' | 'right' | 'jump' | 'attack' | 'block';

export class TouchControls {
  private readonly state: TouchState = {
    left: false,
    right: false,
    block: false,
    jumpQueued: false,
    attackQueued: false,
  };
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly hapticsEnabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.hapticsEnabled = SaveManager.load().settings.hapticsEnabled !== false;
    this.addHoldButton(scene, 94, 620, 'left', 'left', 0x4e73ba, '移动');
    this.addHoldButton(scene, 184, 620, 'right', 'right', 0x4e73ba, '移动');
    this.addTapButton(scene, 1000, 620, 'jump', 'jumpQueued', 0x4b82ca, '跃');
    this.addTapButton(scene, 1092, 592, 'attack', 'attackQueued', 0xcf5268, '斩');
    this.addHoldButton(scene, 1182, 620, 'block', 'block', 0x36a88f, '御');
  }

  get movement(): -1 | 0 | 1 {
    if (this.state.left) return -1;
    if (this.state.right) return 1;
    return 0;
  }

  get blocking(): boolean {
    return this.state.block;
  }

  consumeJump(): boolean {
    const value = this.state.jumpQueued;
    this.state.jumpQueued = false;
    return value;
  }

  consumeAttack(): boolean {
    const value = this.state.attackQueued;
    this.state.attackQueued = false;
    return value;
  }

  destroy(): void {
    this.objects.forEach((object) => object.destroy());
  }

  private addHoldButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    icon: ControlIcon,
    key: HoldKey,
    color: number,
    caption: string,
  ): void {
    const button = this.createButton(scene, x, y, icon, color, caption);
    const release = () => {
      this.state[key] = false;
      this.setPressed(scene, button.container, button.inner, button.ring, false, color);
    };
    button.container.on('pointerdown', () => {
      this.state[key] = true;
      this.setPressed(scene, button.container, button.inner, button.ring, true, color);
      this.buzz(key === 'block' ? 10 : 6);
    });
    button.container
      .on('pointerup', release)
      .on('pointerout', release)
      .on('pointerupoutside', release);
  }

  private addTapButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    icon: ControlIcon,
    key: TapKey,
    color: number,
    caption: string,
  ): void {
    const button = this.createButton(scene, x, y, icon, color, caption);
    const release = () => this.setPressed(scene, button.container, button.inner, button.ring, false, color);
    button.container.on('pointerdown', () => {
      this.state[key] = true;
      this.setPressed(scene, button.container, button.inner, button.ring, true, color);
      this.buzz(key === 'attackQueued' ? 11 : 8);
    });
    button.container
      .on('pointerup', release)
      .on('pointerout', release)
      .on('pointerupoutside', release);
  }

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    icon: ControlIcon,
    color: number,
    caption: string,
  ): {
    container: Phaser.GameObjects.Container;
    inner: Phaser.GameObjects.Arc;
    ring: Phaser.GameObjects.Graphics;
  } {
    const shadow = scene.add.ellipse(0, 8, 82, 74, 0x010309, 0.5);
    const outer = scene.add.circle(0, 0, 43, 0x020610, 0.68)
      .setStrokeStyle(1, 0xffffff, 0.16);
    const rim = scene.add.graphics();
    rim.lineStyle(3, color, 0.46)
      .beginPath()
      .arc(0, 0, 39, -2.82, 0.25)
      .strokePath();
    rim.lineStyle(2, 0xffffff, 0.22)
      .beginPath()
      .arc(0, 0, 39, -2.52, -1.02)
      .strokePath();
    const inner = scene.add.circle(0, 0, 34, 0x101827, 0.8)
      .setStrokeStyle(2, color, 0.76);
    const glass = scene.add.graphics();
    glass.fillStyle(0xffffff, 0.045)
      .beginPath()
      .arc(0, -1, 30, Math.PI, Math.PI * 2)
      .closePath()
      .fillPath();
    glass.lineStyle(1, 0xffffff, 0.16)
      .beginPath()
      .arc(0, 0, 29, -2.65, -0.55)
      .strokePath();
    const ring = scene.add.graphics().setAlpha(0.36).setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(6, color, 0.3).strokeCircle(0, 0, 37);
    const iconArt = scene.add.graphics();
    this.drawIcon(iconArt, icon, color);
    const captionText = scene.add.text(0, 25, caption, {
      fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#dcecff',
      letterSpacing: 1.1,
    }).setOrigin(0.5).setAlpha(0.72).setShadow(0, 2, '#000000', 3);
    const notchLeft = scene.add.circle(-30, 27, 1.8, color, 0.78);
    const notchRight = scene.add.circle(30, 27, 1.8, color, 0.78);
    const container = scene.add
      .container(x, y, [shadow, outer, rim, inner, glass, ring, iconArt, captionText, notchLeft, notchRight])
      .setScrollFactor(0)
      .setDepth(20)
      .setSize(88, 88)
      .setInteractive(new Phaser.Geom.Circle(44, 44, 43), Phaser.Geom.Circle.Contains);
    this.objects.push(container);
    return { container, inner, ring };
  }

  private drawIcon(graphics: Phaser.GameObjects.Graphics, icon: ControlIcon, color: number): void {
    graphics.lineStyle(7, 0x02050c, 0.9);
    this.drawIconShape(graphics, icon, 0, 1);
    graphics.lineStyle(3, 0xf4fbff, 0.92);
    this.drawIconShape(graphics, icon, 0, 0);
    graphics.lineStyle(1, color, 0.9);
    this.drawIconShape(graphics, icon, 0, -2);
  }

  private drawIconShape(
    graphics: Phaser.GameObjects.Graphics,
    icon: ControlIcon,
    offsetX: number,
    offsetY: number,
  ): void {
    if (icon === 'left' || icon === 'right') {
      const direction = icon === 'left' ? -1 : 1;
      graphics
        .beginPath()
        .moveTo(offsetX + direction * 15, offsetY - 10)
        .lineTo(offsetX - direction * 4, offsetY)
        .lineTo(offsetX + direction * 15, offsetY + 10)
        .strokePath();
      graphics.lineBetween(
        offsetX - direction * 3,
        offsetY,
        offsetX - direction * 15,
        offsetY,
      );
      return;
    }
    if (icon === 'jump') {
      graphics
        .beginPath()
        .moveTo(offsetX - 15, offsetY + 8)
        .lineTo(offsetX, offsetY - 8)
        .lineTo(offsetX + 15, offsetY + 8)
        .strokePath();
      graphics
        .beginPath()
        .moveTo(offsetX - 9, offsetY + 15)
        .lineTo(offsetX, offsetY + 6)
        .lineTo(offsetX + 9, offsetY + 15)
        .strokePath();
      return;
    }
    if (icon === 'attack') {
      graphics.lineBetween(offsetX - 12, offsetY + 13, offsetX + 13, offsetY - 12);
      graphics.lineBetween(offsetX - 8, offsetY + 8, offsetX - 14, offsetY + 2);
      graphics.lineBetween(offsetX - 8, offsetY + 8, offsetX - 2, offsetY + 14);
      graphics
        .beginPath()
        .moveTo(offsetX + 13, offsetY - 12)
        .lineTo(offsetX + 17, offsetY - 16)
        .lineTo(offsetX + 15, offsetY - 8)
        .strokePath();
      return;
    }
    graphics
      .beginPath()
      .moveTo(offsetX, offsetY - 15)
      .lineTo(offsetX + 14, offsetY - 9)
      .lineTo(offsetX + 13, offsetY + 6)
      .lineTo(offsetX, offsetY + 16)
      .lineTo(offsetX - 13, offsetY + 6)
      .lineTo(offsetX - 14, offsetY - 9)
      .closePath()
      .strokePath();
    graphics.lineBetween(offsetX, offsetY - 10, offsetX, offsetY + 10);
  }

  private setPressed(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    inner: Phaser.GameObjects.Arc,
    ring: Phaser.GameObjects.Graphics,
    pressed: boolean,
    color: number,
  ): void {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: pressed ? 0.9 : 1,
      scaleY: pressed ? 0.9 : 1,
      duration: pressed ? 55 : 110,
      ease: pressed ? 'Quad.In' : 'Back.Out',
    });
    inner.setFillStyle(pressed ? color : 0x101827, pressed ? 0.48 : 0.8);
    inner.setStrokeStyle(pressed ? 3 : 2, pressed ? 0xffffff : color, pressed ? 0.9 : 0.76);
    ring.setAlpha(pressed ? 1 : 0.36).setScale(pressed ? 1.12 : 1);
  }

  private buzz(duration: number): void {
    if (!this.hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    navigator.vibrate(duration);
  }
}
