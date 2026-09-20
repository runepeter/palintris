import Phaser from 'phaser';
import type { Tile } from '../core/tiles';
import { planSwap } from '../core/sticky';
import { COLORS } from '../theme/theme';
import type { TileView } from './TileView';

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
    const unit = Math.min(a.width, b.width) / 64;
    const time = this.reduced ? 0 : this.scene.time.now;
    const phase = time / 1800;
    const strength = (active ? 1 : 0.72) * (0.9 + Math.sin(phase) * 0.1);
    const lift = Math.min(64 * unit, Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
    const at = (t: number, lane: number): { x: number; y: number } => {
      const envelope = Math.sin(t * Math.PI);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y - a.height * 0.44 + (b.y - b.height * 0.44 - a.y + a.height * 0.44) * t
          - envelope * lift + Math.sin(t * Math.PI * 4 + phase + lane * 2) * envelope * (lane === 0 ? 2 : 7) * unit,
      };
    };
    const center = Array.from({ length: 49 }, (_, i) => at(i / 48, 0));
    for (const [width, opacity] of [[20, 0.025], [10, 0.065], [4, 0.16], [1.2, 0.8]] as const) {
      this.links.lineStyle(width * unit, COLORS.bond.thread, opacity * strength);
      this.links.strokePoints(center, false);
    }
    for (const lane of [-1, 1]) {
      const points = Array.from({ length: 49 }, (_, i) => at(i / 48, lane));
      this.links.lineStyle(5 * unit, COLORS.bond.echo, 0.045 * strength);
      this.links.strokePoints(points, false);
      this.links.lineStyle(0.8 * unit, COLORS.bond.echo, 0.5 * strength);
      this.links.strokePoints(points, false);
    }
    for (let i = 0; i < 12; i++) {
      const t = (i / 12 + time / 14000) % 1;
      const p = at(t, i % 2 === 0 ? -1 : 1);
      const shimmer = Math.sin(Math.PI * t) * strength;
      const drift = Math.sin(phase + i * 2.4) * 6 * unit;
      this.links.fillStyle(COLORS.bond.aura, shimmer * 0.08);
      this.links.fillCircle(p.x, p.y + drift, 5 * unit);
      this.links.fillStyle(i % 3 === 0 ? COLORS.bond.echo : COLORS.bond.core, shimmer * 0.8);
      this.links.fillCircle(p.x, p.y + drift, (i % 3 === 0 ? 1.4 : 0.8) * unit);
    }
    for (const p of [at(0, 0), at(1, 0)]) {
      for (const [radius, opacity] of [[15, 0.04], [9, 0.1], [4, 0.45], [1.5, 0.9]] as const) {
        this.links.fillStyle(COLORS.bond.thread, opacity * strength);
        this.links.fillCircle(p.x, p.y, radius * unit);
      }
    }
  }

  private arrow(x: number, y: number, tx: number, ty: number): void {
    this.preview.lineBetween(x, y, tx, ty);
    const direction = Math.sign(tx - x);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty - 4);
    this.preview.lineBetween(tx, ty, tx - direction * 6, ty + 4);
  }
}
