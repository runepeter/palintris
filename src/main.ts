import Phaser from 'phaser';
import { phaserConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { MechanicalGameScene } from './scenes/MechanicalGameScene';
import { CascadeScene } from './scenes/CascadeScene';
import { TimeAttackScene } from './scenes/TimeAttackScene';
import { TutorialScene } from './scenes/TutorialScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ZenModeScene } from './scenes/ZenModeScene';
import { VersusScene } from './scenes/VersusScene';
import { DailyChallengeScene } from './scenes/DailyChallengeScene';

// Configure game with all scenes
const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    MechanicalGameScene,
    CascadeScene,
    TimeAttackScene,
    TutorialScene,
    SettingsScene,
    ZenModeScene,
    VersusScene,
    DailyChallengeScene,
  ],
};

// Start the game
new Phaser.Game(config);
