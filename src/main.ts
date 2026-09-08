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
import { PIXEL_RATIO } from './scenes/viewport';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: cssColor(COLORS.background),
  render: { pixelArt: false, antialias: true },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * PIXEL_RATIO,
    height: window.innerHeight * PIXEL_RATIO,
    zoom: 1 / PIXEL_RATIO,
  },
  input: { mouse: true, touch: true },
  scene: [BootScene, MenuScene, WorldMapScene, BoardScene, ResultScene, DailyScene, BlitzResultScene, SettingsScene],
};

const game = new Phaser.Game(config);
const resize = (): void => {
  game.scale.resize(window.innerWidth * PIXEL_RATIO, window.innerHeight * PIXEL_RATIO);
};
window.addEventListener('resize', resize);
game.events.once(Phaser.Core.Events.DESTROY, () => window.removeEventListener('resize', resize));
