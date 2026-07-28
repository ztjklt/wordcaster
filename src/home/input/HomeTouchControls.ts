import Phaser from 'phaser';
import type { HomeVector } from '../HomeTypes';

export class HomeTouchControls {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private activePointerId?: number;
  private current: HomeVector = { x: 0, y: 0 };
  private interactQueued = false;

  constructor(
    private readonly scene: Phaser.Scene,
    onOrientation: () => void,
  ) {
    this.base = scene.add.circle(125, 603, 61, 0x04101c, .58)
      .setStrokeStyle(2, 0x63f0d4, .54)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive(new Phaser.Geom.Circle(61, 61, 61), Phaser.Geom.Circle.Contains);
    const ring = scene.add.circle(125, 603, 43, 0x63f0d4, .025)
      .setStrokeStyle(1, 0xffffff, .16)
      .setScrollFactor(0)
      .setDepth(102);
    this.thumb = scene.add.circle(125, 603, 24, 0x63f0d4, .28)
      .setStrokeStyle(2, 0xcffff5, .86)
      .setScrollFactor(0)
      .setDepth(103);
    const caption = scene.add.text(125, 676, 'MOVE', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#84a49f',
      letterSpacing: 2,
    }).setOrigin(.5).setScrollFactor(0).setDepth(103);
    this.objects.push(this.base, ring, this.thumb, caption);

    this.base.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activePointerId = pointer.id;
      this.updateJoystick(pointer.x, pointer.y);
    });
    this.scene.input.on('pointermove', this.pointerMove);
    this.scene.input.on('pointerup', this.pointerUp);

    this.addActionButton(1162, 601, 'E', '交互', 0xffd477, () => {
      this.interactQueued = true;
      if (navigator.vibrate) navigator.vibrate(10);
    });
    this.addActionButton(1074, 626, '◉', '体感', 0x8f9cff, onOrientation);
  }

  get vector(): HomeVector { return { ...this.current }; }

  consumeInteract(): boolean {
    const value = this.interactQueued;
    this.interactQueued = false;
    return value;
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.pointerMove);
    this.scene.input.off('pointerup', this.pointerUp);
    this.objects.forEach((object) => object.destroy());
  }

  private readonly pointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.activePointerId) this.updateJoystick(pointer.x, pointer.y);
  };

  private readonly pointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = undefined;
    this.current = { x: 0, y: 0 };
    this.thumb.setPosition(125, 603);
  };

  private updateJoystick(x: number, y: number): void {
    const dx = x - 125;
    const dy = y - 603;
    const length = Math.hypot(dx, dy);
    const limited = Math.min(48, length);
    const direction = length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
    this.thumb.setPosition(125 + direction.x * limited, 603 + direction.y * limited);
    const strength = Phaser.Math.Clamp(length / 48, 0, 1);
    this.current = { x: direction.x * strength, y: direction.y * strength };
  }

  private addActionButton(
    x: number,
    y: number,
    glyph: string,
    label: string,
    color: number,
    callback: () => void,
  ): void {
    const shadow = this.scene.add.circle(x + 4, y + 7, 40, 0x010309, .5).setScrollFactor(0).setDepth(100);
    const face = this.scene.add.circle(x, y, 38, 0x071321, .72)
      .setStrokeStyle(2, color, .7)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(x, y - 6, glyph, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '23px',
      color: '#ffffff',
    }).setOrigin(.5).setScrollFactor(0).setDepth(102);
    const caption = this.scene.add.text(x, y + 22, label, {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#dce8f7',
    }).setOrigin(.5).setScrollFactor(0).setDepth(102);
    face.on('pointerdown', () => {
      callback();
      this.scene.tweens.add({ targets: [face, text, caption], scale: .88, duration: 60, yoyo: true });
    });
    this.objects.push(shadow, face, text, caption);
  }
}
