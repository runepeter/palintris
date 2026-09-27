import Phaser from 'phaser';
import { COLORS } from '../theme/theme';
import { makeBackdrop } from './art';
import { makeButton, makeLabel, SCENE } from './ui';
import { screenHeight, screenWidth } from './viewport';

export class ChallengesScene extends Phaser.Scene {
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() { super(SCENE.challenges); }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private build(): void {
    const w = screenWidth(this);
    const h = screenHeight(this);
    const cx = w / 2;
    const landscape = h < 560 && w > h * 1.25;
    makeBackdrop(this, 'quiet', landscape ? 1000 : 500);
    makeLabel(this, cx, landscape ? 48 : h * 0.105, 'UTFORDRINGER', { size: landscape ? 28 : 32, color: COLORS.ink, bold: true }).setLetterSpacing(1.4);
    if (landscape) {
      const entries = [
        { x: w * 0.2, label: 'Speilekspedisjonen', description: 'Ni rom og relikvier', accent: COLORS.glow, scene: SCENE.expedition },
        { x: w * 0.5, label: 'Daglig', description: 'Dagens speil', accent: COLORS.star, scene: SCENE.daily },
        { x: w * 0.8, label: 'Blitz', description: 'Flest mulig før tiden går ut', accent: COLORS.danger, scene: SCENE.board },
      ];
      for (const entry of entries) {
        makeButton(this, { x: entry.x, y: h * 0.43, width: Math.min(220, w * 0.27), height: 52,
          label: entry.label, labelSize: 17, accent: entry.accent,
          onClick: () => this.scene.start(entry.scene, entry.scene === SCENE.board ? { mode: 'blitz' } : undefined) });
        makeLabel(this, entry.x, h * 0.43 + 40, entry.description, { size: 11, color: COLORS.inkMuted, font: 'body' });
      }
      if (import.meta.env.DEV) this.sticky(cx, h * 0.74, 180);
      makeButton(this, { x: cx, y: h - 43, width: 180, height: 44, label: 'Tilbake', labelSize: 15, accent: COLORS.line,
        onClick: () => this.scene.start(SCENE.menu) });
      return;
    }
    const width = Math.min(w - 48, 330);
    const entries = [
      { y: h * 0.29, label: 'Speilekspedisjonen', description: 'Ni rom, relikvier og én sammenhengende reise.', accent: COLORS.glow, scene: SCENE.expedition },
      { y: h * 0.46, label: 'Daglig', description: 'Ett nytt speil hver dag.', accent: COLORS.star, scene: SCENE.daily },
      { y: h * 0.63, label: 'Blitz', description: 'Løs flest mulig før tiden går ut.', accent: COLORS.danger, scene: SCENE.board },
    ];
    for (const entry of entries) {
      makeButton(this, { x: cx, y: entry.y, width, height: 52, label: entry.label, labelSize: 18, accent: entry.accent,
        onClick: () => this.scene.start(entry.scene, entry.scene === SCENE.board ? { mode: 'blitz' } : undefined) });
      makeLabel(this, cx, entry.y + 39, entry.description, { size: 11, color: COLORS.inkMuted, font: 'body' })
        .setWordWrapWidth(width, true);
    }
    if (import.meta.env.DEV) this.sticky(cx, h * 0.785, width);
    makeButton(this, { x: cx, y: h - 43, width: 180, height: 44, label: 'Tilbake', labelSize: 15, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.menu) });
  }

  private sticky(cx: number, y: number, width: number): void {
    makeButton(this, { x: cx, y, width, height: 44, label: 'Sticky · prøve', labelSize: 14, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.board, { mode: 'sticky' }) });
  }
}
