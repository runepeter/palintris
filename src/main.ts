import Phaser from 'phaser';
import { BlitzResultScene } from './scenes/BlitzResultScene';
import { BoardScene } from './scenes/BoardScene';
import { BootScene } from './scenes/BootScene';
import { DailyScene } from './scenes/DailyScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { SettingsScene } from './scenes/SettingsScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { COLORS, cssColor } from './theme/theme';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: cssColor(COLORS.background),
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  input: { mouse: true, touch: true },
  scene: [BootScene, MenuScene, WorldMapScene, BoardScene, ResultScene, DailyScene, BlitzResultScene, SettingsScene],
};

new Phaser.Game(config);
