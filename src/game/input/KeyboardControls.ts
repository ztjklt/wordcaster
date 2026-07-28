import Phaser from 'phaser';

export class KeyboardControls {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; jump: Phaser.Input.Keyboard.Key; attack: Phaser.Input.Keyboard.Key; block: Phaser.Input.Keyboard.Key };
  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) throw new Error('键盘输入不可用');
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({ left: 'A', right: 'D', jump: 'W', attack: 'J', block: 'K' }) as typeof this.keys;
  }
  get movement(): -1 | 0 | 1 { if (this.cursors.left.isDown || this.keys.left.isDown) return -1; if (this.cursors.right.isDown || this.keys.right.isDown) return 1; return 0; }
  get jumpPressed(): boolean { return Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.jump); }
  get attackPressed(): boolean { return Phaser.Input.Keyboard.JustDown(this.keys.attack) || Phaser.Input.Keyboard.JustDown(this.cursors.space); }
  get blocking(): boolean { return this.keys.block.isDown || this.cursors.down.isDown; }
}
