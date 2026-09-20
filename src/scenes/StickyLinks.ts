import Phaser from 'phaser';
import type { Tile } from '../core/tiles';
import { planSwap } from '../core/sticky';
import { COLORS } from '../theme/theme';
import type { TileView } from './TileView';
import { drawEnergyLink } from './energyLink';

export class StickyLinks {
  private readonly links: Phaser.GameObjects.Graphics;
  private readonly preview: Phaser.GameObjects.Graphics;
  swaps: readonly { a: number; b: number }[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly reduced: boolean) {
    this.links = scene.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
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
      this.energy(a, b, tiles[from ?? -1]?.id === tile.id || tiles[from ?? -1]?.id === tile.bondedTo);
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

  private energy(a: TileView, b: TileView, active: boolean): void {
    drawEnergyLink(this.links, a, b, this.reduced ? 0 : this.scene.time.now, active ? 1 : 0.72);
  }

  private arrow(x: number, y: number, tx: number, ty: number): void {
    this.preview.lineBetween(x, y, tx, ty);
    const direction = Math.sign(tx - x);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty - 4);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty + 4);
  }
}
