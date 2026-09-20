import { screenWidth, screenHeight } from './viewport';
import { makeBackdrop } from './art';
import Phaser from 'phaser';
import type { Settings } from '../core/storage';
import { audio } from '../audio/sound';
import { COLORS, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';

const ROWS: ReadonlyArray<{ key: keyof Settings; label: string }> = [
  { key: 'sound', label: 'Lyd' },
  { key: 'music', label: 'Musikk' },
  { key: 'reducedMotion', label: 'Redusert bevegelse' },
  { key: 'clearAnimations', label: 'Tydelige trekk' },
  { key: 'colorBlind', label: 'Fargeblind-mønster' },
];

export class SettingsScene extends Phaser.Scene {
  /** Fast referanse, så SHUTDOWN kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => this.rebuild();

  constructor() {
    super(SCENE.settings);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private rebuild(): void {
    this.children.removeAll(true);
    this.build();
  }

  private build(): void {
    makeBackdrop(this);
    const s = services(this);
    const cx = screenWidth(this) / 2;
    const compact = screenHeight(this) < 560;
    const titleY = compact ? 34 : 60;
    const rowTop = compact ? 82 : 130;
    const rowGap = compact ? 44 : 64;
    const rowHeight = compact ? 34 : 40;
    makeLabel(this, cx, titleY, 'Innstillinger', { size: compact ? 25 : 32, bold: true });
    ROWS.forEach((row, i) => {
      const y = rowTop + i * rowGap;
      const on = s.settings()[row.key];
      makeLabel(this, cx - 120, y, row.label, { size: compact ? 15 : 18, font: 'body', align: 'left' });
      makeButton(this, {
        x: cx + 100, y, width: 96, height: rowHeight, label: on ? 'På' : 'Av', accent: on ? COLORS.success : COLORS.locked,
        onClick: () => {
          s.store.setSettings({ [row.key]: !on });
          audio.configure({ sound: s.settings().sound, music: s.settings().music });
          this.rebuild();
        },
      });
    });
    makeButton(this, { x: cx, y: screenHeight(this) - (compact ? 48 : 80), width: 180, height: 48, label: 'Tilbake', accent: worldAccent(1), onClick: () => this.scene.start(SCENE.menu) });
  }
}
