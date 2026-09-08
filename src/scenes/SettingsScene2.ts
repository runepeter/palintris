import Phaser from 'phaser';
import type { Settings } from '../core/storage';
import { audio } from '../audio/sound';
import { COLORS, SPACE, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';

const ROWS: ReadonlyArray<{ key: keyof Settings; label: string }> = [
  { key: 'sound', label: 'Lyd' },
  { key: 'music', label: 'Musikk' },
  { key: 'reducedMotion', label: 'Redusert bevegelse' },
  { key: 'colorBlind', label: 'Fargeblind-mønster' },
];

export class SettingsScene2 extends Phaser.Scene {
  constructor() {
    super(SCENE.settings);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.rebuild());
  }

  private rebuild(): void {
    this.children.removeAll(true);
    this.build();
  }

  private build(): void {
    const s = services(this);
    const cx = this.scale.width / 2;
    makeLabel(this, cx, 60, 'Innstillinger', { size: 32, bold: true });
    ROWS.forEach((row, i) => {
      const y = 130 + i * (48 + SPACE.lg);
      const on = s.settings()[row.key];
      makeLabel(this, cx - 120, y, row.label, { size: 18, font: 'body', align: 'left' });
      makeButton(this, {
        x: cx + 100, y, width: 96, height: 40, label: on ? 'På' : 'Av', accent: on ? COLORS.success : COLORS.locked,
        onClick: () => {
          s.store.setSettings({ [row.key]: !on });
          audio.configure({ sound: s.settings().sound, music: s.settings().music });
          this.rebuild();
        },
      });
    });
    makeButton(this, { x: cx, y: this.scale.height - 80, width: 180, height: 48, label: 'Tilbake', accent: worldAccent(1), onClick: () => this.scene.start(SCENE.menu) });
  }
}
