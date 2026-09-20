import Phaser from 'phaser';
import type { Tile } from '../core/tiles';
import { planSwap } from '../core/sticky';
import { COLORS } from '../theme/theme';
import type { TileView } from './TileView';

export class StickyLinks {
  private readonly links: Phaser.GameObjects.Graphics;
  private readonly preview: Phaser.GameObjects.Graphics;
  swaps: readonly { a: number; b: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.links = scene.add.graphics().setDepth(4);
    this.preview = scene.add.graphics().setDepth(18);
  }

  draw(tiles: readonly Tile[], views: ReadonlyMap<number, TileView>, slots: readonly { x: number; y: number }[], from: number | null, to: number | null, hidden: boolean): void {
    this.links.clear();
    this.preview.clear();
    this.swaps = [];
    if (hidden) return;
    tiles.forEach((tile) => {
      if (tile.bondedTo === undefined || tile.id > tile.bondedTo) return;
      const a = views.get(tile.id);
      const b = views.get(tile.bondedTo);
      if (a === undefined || b === undefined) return;
      this.chain(a, b);
    });
    if (from === null || to === null || from === to) return;
    const plan = planSwap(tiles, from, to);
    if (!plan.ok || plan.value.length < 2) return;
    this.swaps = plan.value;
    for (const swap of plan.value) {
      const a = tiles[swap.a];
      const b = tiles[swap.b];
      if (a === undefined || b === undefined) continue;
      const av = views.get(a.id);
      const bv = views.get(b.id);
      const ap = slots[swap.a];
      const bp = slots[swap.b];
      if (av === undefined || bv === undefined || ap === undefined || bp === undefined) continue;
      this.preview.lineStyle(3, COLORS.star, 0.95);
      for (const [v, p] of [[av, ap], [bv, bp]] as const) this.preview.strokeRoundedRect(p.x - v.width / 2 - 3, p.y - v.height / 2 - 3, v.width + 6, v.height + 6, 10);
      const y = Math.min(ap.y, bp.y) - Math.max(av.height, bv.height) * 0.65;
      this.arrow(ap.x, y, bp.x, y);
      this.arrow(bp.x, y - 10, ap.x, y - 10);
    }
  }

  private chain(a: TileView, b: TileView): void {
    const unit = Math.min(a.width, b.width) / 64;
    const ax = a.x;
    const ay = a.y - a.height * 0.48;
    const bx = b.x;
    const by = b.y - b.height * 0.48;
    const lift = Math.min(32 * unit, Math.hypot(bx - ax, by - ay) * 0.18);
    const count = Math.max(2, Math.ceil((Math.hypot(bx - ax, by - ay) + lift) / (8 * unit)));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t - Math.sin(t * Math.PI) * lift;
      const angle = Math.atan2(by - ay - Math.PI * lift * Math.cos(t * Math.PI), bx - ax);
      const rx = 5.6 * unit;
      const ry = (i % 2 === 0 ? 2.8 : 1.5) * unit;
      const points = Array.from({ length: 17 }, (_, step) => {
        const theta = step / 16 * Math.PI * 2;
        const px = Math.cos(theta) * rx;
        const py = Math.sin(theta) * ry;
        return { x: x + px * Math.cos(angle) - py * Math.sin(angle), y: y + px * Math.sin(angle) + py * Math.cos(angle) };
      });
      this.links.lineStyle(4 * unit, COLORS.shadow, 0.9);
      this.links.strokePoints(points, true);
      this.links.lineStyle(2.3 * unit, COLORS.gold, 1);
      this.links.strokePoints(points, true);
      this.links.lineStyle(0.9 * unit, COLORS.star, 0.95);
      this.links.strokePoints(points.slice(8), false);
    }
    for (const p of [{ x: ax, y: ay }, { x: bx, y: by }]) {
      this.links.fillStyle(COLORS.shadow, 1);
      this.links.fillCircle(p.x, p.y, 4 * unit);
      this.links.lineStyle(1.5 * unit, COLORS.star, 1);
      this.links.strokeCircle(p.x, p.y, 3 * unit);
    }
  }

  private arrow(x: number, y: number, tx: number, ty: number): void {
    this.preview.lineBetween(x, y, tx, ty);
    const direction = Math.sign(tx - x);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty - 4);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty + 4);
  }
}
