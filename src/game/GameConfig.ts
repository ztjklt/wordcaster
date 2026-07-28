import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RestaurantScene } from './scenes/RestaurantScene';
import { BattlePrepareScene } from './scenes/BattlePrepareScene';
import { ResultScene } from './scenes/ResultScene';
import { TrainingScene } from './scenes/TrainingScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ModeSelectScene } from './scenes/ModeSelectScene';
import { CommandBlockPrepareScene } from './scenes/CommandBlockPrepareScene';
import { CommandBlockScene } from './scenes/CommandBlockScene';
import { CommandBlockResultScene } from './scenes/CommandBlockResultScene';
import { HospitalScene } from './scenes/HospitalScene';
import { BookshelfScene } from './scenes/BookshelfScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#090d19',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 1350 }, debug: false },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    HomeScene,
    HospitalScene,
    BookshelfScene,
    RestaurantScene,
    TrainingScene,
    SettingsScene,
    ModeSelectScene,
    BattlePrepareScene,
    BattleScene,
    ResultScene,
    CommandBlockPrepareScene,
    CommandBlockScene,
    CommandBlockResultScene,
  ],
  input: { gamepad: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  render: { antialias: true, pixelArt: false },
};
