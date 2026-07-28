import Phaser from 'phaser';

const WHITE = 0xf5f7ff;
const INK = 0x06101d;
const MINT = 0x63f0d4;

export function addTitle(scene: Phaser.Scene, eyebrow: string, title: string, subtitle: string): void {
  const seal = scene.add.container(64, 94);
  seal.add([
    scene.add.circle(0, 0, 17, INK, .9).setStrokeStyle(1, MINT, .7),
    scene.add.circle(0, 0, 11, MINT, .12).setStrokeStyle(1, WHITE, .2),
    scene.add.rectangle(0, 0, 2, 19, MINT, .9).setRotation(Math.PI / 4),
    scene.add.rectangle(0, 0, 2, 19, MINT, .42).setRotation(-Math.PI / 4),
  ]);

  scene.add.text(92, 73, eyebrow.toUpperCase(), {
    fontFamily: 'Arial',
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#63f0d4',
    letterSpacing: 5,
  });
  scene.add.rectangle(92, 101, 86, 2, MINT, .68).setOrigin(0, .5);
  scene.add.rectangle(184, 101, 34, 2, WHITE, .15).setOrigin(0, .5);
  scene.add.text(88, 111, title, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '56px',
    color: '#f5f7ff',
    letterSpacing: 1,
  }).setShadow(0, 5, '#02040a', 12);
  scene.add.text(92, 182, subtitle, {
    fontFamily: 'Arial',
    fontSize: '19px',
    color: '#aab6ca',
    letterSpacing: 1,
  });
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  primary = false,
): Phaser.GameObjects.Container {
  const accent = primary ? 0x63f0d4 : 0x89a0c3;
  const shadow = scene.add.rectangle(7, 8, 320, 66, 0x01030a, .54);
  const bg = scene.add.rectangle(0, 0, 314, 62, primary ? 0x55e0c4 : 0x0b1425, primary ? .96 : .92)
    .setStrokeStyle(1, primary ? 0xb9fff1 : 0x435573, primary ? .8 : .72)
    .setInteractive({ useHandCursor: true });
  const inner = scene.add.rectangle(0, 0, 300, 50, primary ? 0x8effe8 : 0x15223a, primary ? .08 : .44)
    .setStrokeStyle(1, primary ? 0xffffff : 0x7890b4, primary ? .18 : .16);
  const edge = scene.add.rectangle(-154, 0, 3, 42, primary ? 0x071713 : MINT, primary ? .72 : .85);
  const capTop = scene.add.rectangle(-143, -29, 19, 2, accent, .9).setRotation(-.2);
  const capBottom = scene.add.rectangle(143, 29, 19, 2, accent, .48).setRotation(-.2);
  const text = scene.add.text(-119, 0, label, {
    fontFamily: 'Arial',
    fontSize: '19px',
    fontStyle: 'bold',
    color: primary ? '#061612' : '#f5f7ff',
    letterSpacing: 1,
  }).setOrigin(0, .5);
  const arrow = scene.add.text(119, -1, '→', {
    fontFamily: 'Arial',
    fontSize: '21px',
    fontStyle: 'bold',
    color: primary ? '#061612' : '#63f0d4',
  }).setOrigin(.5);
  const scan = scene.add.rectangle(-144, 26, 56, 1, accent, .28).setOrigin(0, .5);
  const container = scene.add.container(x, y, [shadow, bg, inner, edge, capTop, capBottom, scan, text, arrow]);

  bg.on('pointerover', () => {
    scene.tweens.killTweensOf([text, arrow, inner]);
    scene.tweens.add({ targets: text, x: -113, duration: 150, ease: 'Sine.out' });
    scene.tweens.add({ targets: arrow, x: 126, duration: 150, ease: 'Sine.out' });
    scene.tweens.add({ targets: inner, alpha: .74, duration: 150 });
    bg.setStrokeStyle(2, primary ? 0xe7fff9 : MINT, .92);
  });
  bg.on('pointerout', () => {
    scene.tweens.killTweensOf([text, arrow, inner]);
    scene.tweens.add({ targets: text, x: -119, duration: 180, ease: 'Sine.out' });
    scene.tweens.add({ targets: arrow, x: 119, duration: 180, ease: 'Sine.out' });
    scene.tweens.add({ targets: inner, alpha: 1, duration: 180 });
    bg.setStrokeStyle(1, primary ? 0xb9fff1 : 0x435573, primary ? .8 : .72);
  });
  bg.on('pointerdown', () => {
    if (!bg.input?.enabled) return;
    scene.tweens.add({
      targets: [inner, text, arrow],
      alpha: .45,
      duration: 55,
      yoyo: true,
      onComplete: onClick,
    });
  });
  return container;
}
