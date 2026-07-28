import Phaser from 'phaser';

export class CommandBlockTouchControls {
  private left = false;
  private right = false;
  private jumpQueued = false;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, accent: number) {
    this.addHold(scene, 86, 625, '‹', accent, (value) => { this.left = value; });
    this.addHold(scene, 176, 625, '›', accent, (value) => { this.right = value; });
    this.addTap(scene, 1178, 618, '↑', accent);
  }

  get movement(): -1 | 0 | 1 {
    if (this.left) return -1;
    if (this.right) return 1;
    return 0;
  }

  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  destroy(): void {
    this.objects.forEach((object) => object.destroy());
  }

  private create(scene: Phaser.Scene, x: number, y: number, label: string, accent: number): Phaser.GameObjects.Container {
    const shadow = scene.add.circle(4, 7, 38, 0x010309, .5);
    const face = scene.add.circle(0, 0, 36, 0x07101f, .72).setStrokeStyle(2, accent, .68);
    const text = scene.add.text(0, -2, label, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '35px',
      color: '#f8fbff',
    }).setOrigin(.5);
    const container = scene.add.container(x, y, [shadow, face, text])
      .setDepth(50)
      .setScrollFactor(0)
      .setSize(78, 78)
      .setInteractive(new Phaser.Geom.Circle(39, 39, 38), Phaser.Geom.Circle.Contains);
    this.objects.push(container);
    return container;
  }

  private addHold(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    accent: number,
    update: (value: boolean) => void,
  ): void {
    const button = this.create(scene, x, y, label, accent);
    const release = () => { update(false); button.setScale(1); };
    button.on('pointerdown', () => { update(true); button.setScale(.92); });
    button.on('pointerup', release).on('pointerout', release).on('pointerupoutside', release);
  }

  private addTap(scene: Phaser.Scene, x: number, y: number, label: string, accent: number): void {
    const button = this.create(scene, x, y, label, accent);
    const release = () => button.setScale(1);
    button.on('pointerdown', () => { this.jumpQueued = true; button.setScale(.92); });
    button.on('pointerup', release).on('pointerout', release).on('pointerupoutside', release);
  }
}

