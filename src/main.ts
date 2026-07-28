import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import './styles/main.css';
import './styles/orientation.css';
import './styles/safe-area.css';

const container = document.querySelector('#game-container');
if (!container) throw new Error('无法找到游戏容器 #game-container');

new Phaser.Game(gameConfig);
