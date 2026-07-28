import Phaser from 'phaser';
import type { HomeBuildingDefinition, HomeEntranceDefinition, HomeInputMode, HomePlayerState, HomeVector } from '../HomeTypes';

export class HomeDebugOverlay {
  private readonly worldGraphics: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(
    scene: Phaser.Scene,
    buildings: readonly HomeBuildingDefinition[],
    entrances: readonly HomeEntranceDefinition[],
    initialVisible = false,
  ) {
    this.worldGraphics = scene.add.graphics().setDepth(90);
    buildings.forEach((building) => {
      this.worldGraphics.lineStyle(2, 0xff5577, .7)
        .strokeRect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height);
    });
    entrances.forEach((entrance) => {
      this.worldGraphics.lineStyle(2, 0x67f0d5, .65).strokeCircle(entrance.x, entrance.y, entrance.radius);
    });
    for (let x = 0; x <= 2200; x += 220) this.worldGraphics.lineStyle(1, 0x69a3ff, .12).lineBetween(x, 0, x, 1200);
    for (let y = 0; y <= 1200; y += 220) this.worldGraphics.lineStyle(1, 0x69a3ff, .12).lineBetween(0, y, 2200, y);
    this.text = scene.add.text(18, 95, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#d9fff7',
      backgroundColor: 'rgba(2,7,15,.82)',
      padding: { x: 8, y: 7 },
      lineSpacing: 4,
    }).setScrollFactor(0).setDepth(120);
    this.setVisible(initialVisible);
  }

  get enabled(): boolean { return this.visible; }

  toggle(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  update(data: {
    fps: number;
    position: HomeVector;
    velocity: HomeVector;
    state: HomePlayerState;
    inputMode: HomeInputMode;
    inputSource: string;
    orientation: { beta: number; gamma: number };
    target?: string;
  }): void {
    if (!this.visible) return;
    this.text.setText([
      `FPS ${data.fps.toFixed(1)}`,
      `POS ${data.position.x.toFixed(0)}, ${data.position.y.toFixed(0)}`,
      `VEL ${data.velocity.x.toFixed(0)}, ${data.velocity.y.toFixed(0)}`,
      `STATE ${data.state}`,
      `INPUT ${data.inputMode} / ${data.inputSource}`,
      `TILT β${data.orientation.beta.toFixed(1)} γ${data.orientation.gamma.toFixed(1)}`,
      `TARGET ${data.target ?? 'none'}`,
    ]);
  }

  destroy(): void {
    this.worldGraphics.destroy();
    this.text.destroy();
  }

  private setVisible(value: boolean): void {
    this.visible = value;
    this.worldGraphics.setVisible(value);
    this.text.setVisible(value);
  }
}
