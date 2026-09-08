import { screenWidth, screenHeight, PIXEL_RATIO } from './viewport';
import Phaser from 'phaser';
import type { BoardLayout } from '../game/layout';
import { COLORS, cssColor, DURATION, durations, EASING, WORLD_ACCENTS } from '../theme/theme';

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
  mirrorWave(layout: BoardLayout, originX: number, originY: number, scale: number): void {
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
      duration: this.reduced ? this.d.snap : this.d.calm,
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
