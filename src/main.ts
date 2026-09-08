import Phaser from 'phaser';
import { BoardScene2 } from './scenes/BoardScene2';
import { BootScene2 } from './scenes/BootScene2';
import { MenuScene2 } from './scenes/MenuScene2';
import { ResultScene2 } from './scenes/ResultScene2';
import { SettingsScene2 } from './scenes/SettingsScene2';
import { WorldMapScene2 } from './scenes/WorldMapScene2';
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
  scene: [BootScene2, MenuScene2, WorldMapScene2, BoardScene2, ResultScene2, SettingsScene2],
};

new Phaser.Game(config);
