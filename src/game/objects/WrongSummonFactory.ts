import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';

const labels: Record<string, { label: string; color: number; width: number; height: number }> = {
  ship: { label: 'SHIP', color: 0x3182a8, width: 150, height: 58 },
  dictionary: { label: 'WORD', color: 0xa83e4a, width: 100, height: 72 },
  bed: { label: 'BED', color: 0x8b69b6, width: 145, height: 55 },
  heel: { label: 'HEEL', color: 0xe25b91, width: 95, height: 65 },
  eyes: { label: 'EYES', color: 0xe9d85f, width: 115, height: 58 },
};

export class WrongSummonFactory {
  private readonly highEffects: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly platforms: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.highEffects = SaveManager.load().settings.effectsQuality !== 'low';
  }

  spawn(itemId: string, x: number): Phaser.Physics.Arcade.Image {
    const data = labels[itemId]
      ?? { label: itemId.toUpperCase(), color: 0xff6279, width: 100, height: 60 };
    const key = `wrong-${itemId}-v3`;
    if (!this.scene.textures.exists(key)) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false);
      this.drawWrongItem(graphics, itemId, data.color, data.width, data.height);
      graphics.generateTexture(key, data.width, data.height).destroy();
    }

    this.spawnRift(x, 80, data.color);
    const item = this.scene.physics.add
      .image(x, 80, key)
      .setBounce(0.45)
      .setAngularVelocity(Phaser.Math.Between(-140, 140))
      .setDepth(8);
    item.setData('wrongItem', itemId);
    item.setData('damage', 18);

    const tag = this.createErrorTag(data.label, data.color);
    const anomaly = this.scene.add.graphics().setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    let pulse = 0;
    const syncDecoration = (_time: number, delta: number) => {
      if (!item.active) return;
      pulse += delta * 0.006;
      tag.setPosition(item.x, item.y - data.height * 0.56 - 15);
      anomaly.clear().setPosition(item.x, item.y);
      anomaly.lineStyle(2, data.color, 0.2 + Math.sin(pulse) * 0.08)
        .strokeEllipse(0, 0, data.width * 0.9, data.height * 0.86);
      if (this.highEffects) {
        anomaly.lineStyle(1, 0xffffff, 0.16)
          .beginPath()
          .arc(0, 0, data.width * 0.48, pulse, pulse + 1.25)
          .strokePath();
      }
    };
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, syncDecoration);
    item.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, syncDecoration);
      tag.destroy();
      anomaly.destroy();
    });

    this.scene.physics.add.collider(item, this.platforms);
    this.scene.time.delayedCall(10000, () => item.destroy());
    return item;
  }

  private drawWrongItem(
    graphics: Phaser.GameObjects.Graphics,
    itemId: string,
    color: number,
    width: number,
    height: number,
  ): void {
    graphics.fillStyle(0x010309, 0.42).fillEllipse(width / 2, height - 4, width * 0.82, 9);
    if (itemId === 'ship') {
      graphics.fillStyle(0x030913, 1)
        .beginPath()
        .moveTo(3, 28)
        .lineTo(146, 28)
        .lineTo(121, 55)
        .lineTo(27, 55)
        .closePath()
        .fillPath();
      graphics.fillStyle(color, 0.92)
        .beginPath()
        .moveTo(8, 31)
        .lineTo(140, 31)
        .lineTo(116, 50)
        .lineTo(31, 50)
        .closePath()
        .fillPath();
      graphics.fillStyle(0x0b2131, 1).fillRoundedRect(40, 22, 70, 11, 3);
      graphics.lineStyle(2, 0x7ce7ff, 0.75).lineBetween(15, 35, 132, 35);
      graphics.lineStyle(2, 0xff6f8d, 0.6).lineBetween(34, 47, 114, 47);
      graphics.fillStyle(0xe8c46f, 1).fillRect(65, 5, 5, 24);
      graphics.fillStyle(0x3a2714, 1).fillRect(67, 5, 2, 24);
      graphics.fillStyle(0xdffaff, 0.88)
        .beginPath()
        .moveTo(73, 7)
        .lineTo(73, 26)
        .lineTo(116, 26)
        .closePath()
        .fillPath();
      graphics.fillStyle(0x66d5e9, 0.45)
        .beginPath()
        .moveTo(75, 10)
        .lineTo(75, 23)
        .lineTo(105, 23)
        .closePath()
        .fillPath();
      for (let index = 0; index < 4; index += 1) {
        graphics.fillStyle(0xf4d477, 0.9).fillCircle(45 + index * 19, 38, 2);
      }
    } else if (itemId === 'dictionary') {
      graphics.fillStyle(0x17060c, 1).fillRoundedRect(4, 3, 92, 66, 8);
      graphics.fillStyle(color, 0.94).fillRoundedRect(8, 6, 84, 60, 6);
      graphics.fillStyle(0x641e29, 0.9).fillRoundedRect(8, 6, 12, 60, 5);
      graphics.lineStyle(2, 0xffa4af, 0.7).lineBetween(21, 8, 21, 64);
      graphics.fillStyle(0xf5e8d0, 1).fillRoundedRect(25, 12, 59, 45, 3);
      graphics.fillStyle(0xe3d4bd, 1).fillRoundedRect(28, 15, 25, 39, 2);
      graphics.fillStyle(0xf8eddc, 1).fillRoundedRect(55, 15, 26, 39, 2);
      graphics.lineStyle(2, 0xbead94, 0.7)
        .lineBetween(54, 15, 54, 55)
        .lineBetween(32, 25, 49, 25)
        .lineBetween(59, 25, 76, 25)
        .lineBetween(32, 33, 49, 33)
        .lineBetween(59, 33, 76, 33)
        .lineBetween(32, 41, 46, 41)
        .lineBetween(59, 41, 73, 41);
      graphics.fillStyle(0xffd66d, 0.92).fillCircle(14, 17, 3);
      graphics.lineStyle(2, 0xffffff, 0.34).strokeRoundedRect(4, 3, 92, 66, 8);
    } else if (itemId === 'bed') {
      graphics.fillStyle(0x08060e, 1).fillRoundedRect(3, 15, 139, 36, 8);
      graphics.fillStyle(0x281a38, 1).fillRoundedRect(8, 18, 128, 27, 6);
      graphics.fillStyle(color, 0.92).fillRoundedRect(12, 20, 121, 22, 5);
      graphics.fillStyle(0xe9e7ff, 0.94).fillRoundedRect(16, 21, 37, 18, 7);
      graphics.fillStyle(0xffffff, 0.35).fillRoundedRect(19, 23, 26, 4, 3);
      graphics.fillStyle(0x6f50a1, 0.58)
        .beginPath()
        .moveTo(54, 22)
        .lineTo(130, 22)
        .lineTo(130, 40)
        .lineTo(75, 40)
        .closePath()
        .fillPath();
      graphics.lineStyle(6, 0x0d0813, 1)
        .lineBetween(8, 13, 8, 54)
        .lineBetween(137, 10, 137, 54);
      graphics.lineStyle(3, 0xb99be5, 0.72)
        .lineBetween(9, 14, 9, 52)
        .lineBetween(136, 11, 136, 52);
      graphics.fillStyle(0xffd66d, 0.7).fillCircle(137, 9, 3);
    } else if (itemId === 'heel') {
      graphics.fillStyle(0x160812, 1)
        .beginPath()
        .moveTo(5, 42)
        .lineTo(35, 31)
        .lineTo(55, 5)
        .lineTo(73, 11)
        .lineTo(65, 35)
        .lineTo(92, 49)
        .lineTo(87, 62)
        .lineTo(26, 61)
        .closePath()
        .fillPath();
      graphics.fillStyle(color, 0.96)
        .beginPath()
        .moveTo(9, 43)
        .lineTo(38, 34)
        .lineTo(58, 9)
        .lineTo(69, 13)
        .lineTo(61, 38)
        .lineTo(88, 51)
        .lineTo(84, 58)
        .lineTo(29, 57)
        .closePath()
        .fillPath();
      graphics.fillStyle(0xffa7ce, 0.46)
        .beginPath()
        .moveTo(39, 35)
        .lineTo(59, 12)
        .lineTo(64, 14)
        .lineTo(57, 37)
        .closePath()
        .fillPath();
      graphics.fillStyle(0x42152a, 1).fillRoundedRect(61, 39, 8, 25, 2);
      graphics.fillStyle(0xe8a4c2, 0.82).fillRect(62, 40, 3, 20);
      graphics.lineStyle(2, 0xffd6e8, 0.78).lineBetween(12, 44, 83, 54);
      graphics.fillStyle(0xffd66d, 0.82).fillCircle(21, 46, 2);
    } else {
      graphics.fillStyle(0x090813, 1).fillRoundedRect(2, 13, width - 4, 35, 12);
      graphics.fillStyle(0xe9d85f, 0.94).fillEllipse(30, 29, 43, 28);
      graphics.fillStyle(0xe9d85f, 0.94).fillEllipse(85, 29, 43, 28);
      graphics.fillStyle(0xffef9b, 0.28).fillEllipse(26, 25, 27, 15);
      graphics.fillStyle(0xffef9b, 0.28).fillEllipse(81, 25, 27, 15);
      graphics.fillStyle(0x07101c, 1).fillCircle(30, 29, 10).fillCircle(85, 29, 10);
      graphics.fillStyle(color, 0.72).fillCircle(30, 29, 5).fillCircle(85, 29, 5);
      graphics.fillStyle(0xffffff, 0.95).fillCircle(27, 26, 3).fillCircle(82, 26, 3);
      graphics.lineStyle(3, color, 0.85)
        .strokeEllipse(30, 29, 44, 29)
        .strokeEllipse(85, 29, 44, 29);
      graphics.lineStyle(2, 0xff6f8d, 0.58)
        .lineBetween(4, 15, 20, 5)
        .lineBetween(111, 15, 95, 5);
    }
  }

  private createErrorTag(label: string, color: number): Phaser.GameObjects.Container {
    const background = this.scene.add.graphics();
    background.fillStyle(0x02040a, 0.78).fillRoundedRect(-38, -10, 76, 20, 9);
    background.lineStyle(1, color, 0.82).strokeRoundedRect(-38, -10, 76, 20, 9);
    background.fillStyle(color, 0.82).fillCircle(-29, 0, 2);
    const text = this.scene.add.text(3, 0, `误召  ${label}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.4,
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4);
    return this.scene.add.container(0, 0, [background, text]).setDepth(10);
  }

  private spawnRift(x: number, y: number, color: number): void {
    const rift = this.scene.add.graphics().setPosition(x, y).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    rift.lineStyle(5, 0xff5c78, 0.78).strokeEllipse(0, 0, 104, 29);
    rift.lineStyle(2, color, 0.92).strokeEllipse(0, 0, 82, 21);
    rift.fillStyle(0x7f274f, 0.14).fillEllipse(0, 0, 74, 18);
    if (this.highEffects) {
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        rift.lineStyle(2, index % 2 ? color : 0xffffff, 0.62)
          .lineBetween(
            Math.cos(angle) * 50,
            Math.sin(angle) * 14,
            Math.cos(angle) * 67,
            Math.sin(angle) * 22,
          );
      }
    }
    this.scene.tweens.add({
      targets: rift,
      scaleX: 1.6,
      scaleY: 0.3,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.Out',
      onComplete: () => rift.destroy(),
    });
  }
}
