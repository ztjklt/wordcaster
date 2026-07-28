import Phaser from 'phaser';
import type { HomePlayerState, HomeVector } from '../HomeTypes';

export class HomePlayerController {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly directionMark: Phaser.GameObjects.Triangle;
  private readonly cloak: Phaser.GameObjects.Arc;
  private state: HomePlayerState = 'idle';
  private facing: HomeVector = { x: 1, y: 0 };
  private interactingUntil = 0;
  private elapsed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    facing: HomeVector,
  ) {
    this.facing = { ...facing };
    this.body = scene.add.rectangle(x, y, 38, 46, 0xffffff, .001).setDepth(20);
    scene.physics.add.existing(this.body);
    const physicsBody = this.body.body as Phaser.Physics.Arcade.Body;
    physicsBody
      .setSize(36, 42)
      .setAllowGravity(false)
      .setCollideWorldBounds(true)
      .setMaxVelocity(330, 330)
      .setDrag(1300, 1300);

    this.shadow = scene.add.ellipse(0, 17, 42, 17, 0x010309, .55);
    this.aura = scene.add.circle(0, 0, 28, 0x63f0d4, .035).setStrokeStyle(1, 0x63f0d4, .42);
    this.cloak = scene.add.arc(0, 5, 17, 205, 335, false, 0x112c38, .98).setStrokeStyle(2, 0x63f0d4, .72);
    const torso = scene.add.rectangle(0, 1, 9, 24, 0x071019, 1).setStrokeStyle(3, 0x63f0d4, .95);
    const head = scene.add.circle(0, -15, 8, 0x061019, 1).setStrokeStyle(3, 0xc7fff4, .92);
    const eye = scene.add.circle(4, -16, 1.6, 0xffffff, .95).setBlendMode(Phaser.BlendModes.ADD);
    const sash = scene.add.rectangle(0, 5, 23, 3, 0xffd477, .86).setRotation(-.28);
    this.directionMark = scene.add.triangle(0, -34, 0, 7, 5, -3, -5, -3, 0x63f0d4, .82);
    this.visual = scene.add.container(x, y, [this.shadow, this.aura, this.cloak, torso, head, eye, sash, this.directionMark]).setDepth(21);
  }

  get position(): HomeVector { return { x: this.body.x, y: this.body.y }; }
  get facingVector(): HomeVector { return { ...this.facing }; }
  get currentState(): HomePlayerState { return this.state; }
  get velocity(): HomeVector {
    const physicsBody = this.body.body as Phaser.Physics.Arcade.Body;
    return { x: physicsBody.velocity.x, y: physicsBody.velocity.y };
  }

  update(input: HomeVector, deltaMs: number, now: number): void {
    const physicsBody = this.body.body as Phaser.Physics.Arcade.Body;
    const inputLength = Math.hypot(input.x, input.y);
    const normalized = inputLength > 1 ? { x: input.x / inputLength, y: input.y / inputLength } : input;
    const speed = 265;
    const blend = 1 - Math.exp(-Math.max(0, deltaMs) / 72);
    physicsBody.velocity.x = Phaser.Math.Linear(physicsBody.velocity.x, normalized.x * speed, blend);
    physicsBody.velocity.y = Phaser.Math.Linear(physicsBody.velocity.y, normalized.y * speed, blend);
    if (inputLength > .12) {
      this.facing = { x: normalized.x, y: normalized.y };
      if (now >= this.interactingUntil) this.state = 'moving';
    } else if (now >= this.interactingUntil) {
      this.state = 'idle';
    }

    this.elapsed += deltaMs;
    const moving = Math.hypot(physicsBody.velocity.x, physicsBody.velocity.y) > 26;
    const bob = moving ? Math.sin(this.elapsed * .022) * 3 : Math.sin(this.elapsed * .004) * 1.2;
    this.visual.setPosition(this.body.x, this.body.y + bob);
    this.shadow.setScale(moving ? 1.08 : 1, moving ? .86 : 1);
    this.aura.setScale(this.state === 'interacting' ? 1.28 : 1 + Math.sin(this.elapsed * .003) * .05);
    this.cloak.setRotation(Phaser.Math.Angle.Between(0, 0, this.facing.x, this.facing.y) + Math.PI / 2);
    this.directionMark.setRotation(Phaser.Math.Angle.Between(0, 0, this.facing.x, this.facing.y) + Math.PI / 2);
    this.directionMark.setAlpha(moving ? .84 : .35);
  }

  playInteract(now: number): void {
    this.state = 'interacting';
    this.interactingUntil = now + 520;
    this.scene.tweens.killTweensOf([this.aura, this.cloak]);
    this.scene.tweens.add({
      targets: [this.aura, this.cloak],
      scale: { from: 1.35, to: 1 },
      alpha: { from: .45, to: 1 },
      duration: 460,
      ease: 'Cubic.out',
    });
  }

  setPosition(x: number, y: number): void {
    this.body.setPosition(x, y);
    (this.body.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.visual.setPosition(x, y);
  }

  destroy(): void {
    this.body.destroy();
    this.visual.destroy(true);
  }
}
