import { screenWidth, screenHeight, PIXEL_RATIO } from './viewport';
import Phaser from 'phaser';
import type { BoardLayout } from '../game/layout';
import { COLORS, cssColor, DURATION, durations, EASING, VICTORY, WORLD_ACCENTS } from '../theme/theme';
import type { TileView } from './TileView';
import { makeLabel } from './ui';

/** Fem effekter fra spec §4. Alle respekterer redusert bevegelse. */
export class Effects {
  private readonly d: Readonly<Record<keyof typeof DURATION, number>>;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly reduced: boolean
  ) {
    this.d = durations(reduced);
  }

  nudge(): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(this.d.snap, 0.003);
  }

  flash(color: number, alpha = 0.25): void {
    if (this.reduced) return;
    const g = this.scene.add.graphics().setDepth(900);
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, screenWidth(this.scene), screenHeight(this.scene));
    this.scene.tweens.add({ targets: g, alpha: 0, duration: this.d.normal, ease: EASING.fade, onComplete: () => g.destroy() });
  }

  /** Liten salve ved brikka som nettopp flyttet seg. Én per trekk, derfor kort og billig. */
  burst(x: number, y: number, color: number): void {
    if (this.reduced) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const dot = this.scene.add.circle(x, y, 3, color).setDepth(800);
      const angle = (i / count) * Math.PI * 2;
      const dist = 20 + Math.random() * 20;
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: this.d.normal,
        ease: EASING.move,
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Teksten bærer informasjonen også med redusert bevegelse; bevegelsen er pynt. */
  reward(x: number, y: number, label: string, color: number): void {
    const text = makeLabel(this.scene, x, y, label, { size: 18, color, font: 'body', bold: true })
      .setStroke(cssColor(COLORS.shadow), 5)
      .setDepth(850);
    if (this.reduced) {
      this.scene.time.delayedCall(500, () => text.destroy());
      return;
    }
    text.setScale(0.85);
    this.scene.tweens.add({
      targets: text,
      y: y - 22,
      scale: 1,
      alpha: 0,
      delay: this.d.snap,
      duration: this.d.calm,
      ease: EASING.move,
      onComplete: () => text.destroy(),
    });
  }

  /** Kort handlingsnavn som gjør retning og verktøy lesbart mens brikkene flytter seg. */
  toolCue(x: number, y: number, label: string, color: number, duration: number): void {
    const text = makeLabel(this.scene, x, y, label, { size: 16, color, font: 'body', bold: true })
      .setStroke(cssColor(COLORS.shadow), 6)
      .setDepth(850);
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      delay: Math.max(0, duration - DURATION.normal),
      duration: DURATION.normal,
      ease: EASING.fade,
      onComplete: () => text.destroy(),
    });
  }

  clearBoard(tiles: readonly TileView[], clear: boolean, onComplete: () => void): void {
    const timing = this.reduced ? VICTORY.reduced : clear ? VICTORY.clear : VICTORY.fast;
    let remaining = tiles.length;
    if (remaining === 0) {
      this.scene.time.delayedCall(timing.hold + timing.rest, onComplete);
      return;
    }
    tiles.forEach((tile, i) => {
      const pair = Math.floor(Math.abs(i - (tiles.length - 1) / 2));
      const delay = timing.hold + pair * timing.pairGap;
      if (!this.reduced) {
        const light = tile.addClearGlow();
        this.scene.tweens.add({ targets: light, alpha: 1, delay, duration: timing.glow, ease: EASING.fade });
      }
      this.scene.tweens.add({
        targets: tile,
        alpha: 0,
        ...(this.reduced ? {} : { scaleY: 0.04, scaleX: 1.12 }),
        delay: delay + timing.glow,
        duration: timing.dissolve,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          tile.setVisible(false);
          this.burst(tile.x, tile.y, COLORS.star);
          remaining--;
          if (remaining === 0) this.scene.time.delayedCall(timing.rest, onComplete);
        },
      });
    });
  }

  confetti(x: number, y: number, count = 40): void {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      const color = WORLD_ACCENTS[i % WORLD_ACCENTS.length] ?? COLORS.success;
      const piece = this.scene.add.rectangle(x, y, 6, 10, color).setDepth(800);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      this.scene.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 80,
        angle: Math.random() * 720,
        alpha: 0,
        duration: this.d.ceremony,
        ease: EASING.move,
        onComplete: () => piece.destroy(),
      });
    }
  }

  /** Bølge fra speillinja og ut, i skjermkoordinater. */
  mirrorWave(layout: BoardLayout, originX: number, originY: number, scale: number, duration?: number): void {
    const m = layout.mirror;
    const x1 = originX + m.x1 * scale;
    const y1 = originY + m.y1 * scale;
    const x2 = originX + m.x2 * scale;
    const y2 = originY + m.y2 * scale;
    const horizontal = y1 === y2;
    const len = horizontal ? x2 - x1 : y2 - y1;
    const bar = this.scene.add
      .rectangle((x1 + x2) / 2, (y1 + y2) / 2, horizontal ? len : 6, horizontal ? 6 : len, COLORS.success, 0.6)
      .setDepth(700);
    const grow = layout.tile * scale * (layout.kind === 'row' ? 3 : 1.6);
    this.scene.tweens.add({
      targets: bar,
      ...(horizontal ? { scaleY: grow / 6 } : { scaleX: grow / 6 }),
      alpha: 0,
      duration: duration ?? (this.reduced ? this.d.snap : this.d.calm),
      ease: EASING.fade,
      onComplete: () => bar.destroy(),
    });
  }

  starFall(count: number): void {
    if (this.reduced) return;
    const w = screenWidth(this.scene);
    for (let i = 0; i < count; i++) {
      const star = this.scene.add
        .text(Math.random() * w, -20, '★', { resolution: PIXEL_RATIO, fontSize: '24px', color: cssColor(COLORS.star) })
        .setDepth(800);
      this.scene.tweens.add({
        targets: star,
        y: screenHeight(this.scene) + 30,
        angle: 180,
        duration: this.d.ceremony + Math.random() * this.d.ceremony,
        delay: Math.random() * this.d.calm,
        ease: EASING.move,
        onComplete: () => star.destroy(),
      });
    }
  }
}
