import Phaser from 'phaser';

export class AudioDuckingController {
  private previousVolume = 1;
  constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {}
  duck(): void { this.previousVolume = this.sound.volume; this.sound.volume = Math.min(this.previousVolume, 0.18); }
  restore(): void { this.sound.volume = this.previousVolume; }
}
