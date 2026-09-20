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
      const lift = Math.max(a.width, b.width) * 0.75;
      this.links.lineStyle(2, COLORS.glow, 0.7);
      this.links.beginPath();
      this.links.moveTo(a.x, a.y);
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        this.links.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * lift);
      }
      this.links.strokePath();
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

  private arrow(x: number, y: number, tx: number, ty: number): void {
    this.preview.lineBetween(x, y, tx, ty);
    const direction = Math.sign(tx - x);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty - 4);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty + 4);
  }
}
