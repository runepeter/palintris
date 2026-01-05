import Phaser from 'phaser';
import { phaserConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { TutorialScene } from './scenes/TutorialScene';
import { SettingsScene } from './scenes/SettingsScene';

// Configure game with all scenes
const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    TutorialScene,
    SettingsScene,
  ],
};

// Start the game
new Phaser.Game(config);
