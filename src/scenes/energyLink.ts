import type Phaser from 'phaser';
import { COLORS } from '../theme/theme';

interface Anchor { x: number; y: number; width: number; height: number }

export function drawEnergyLink(g: Phaser.GameObjects.Graphics, a: Anchor, b: Anchor, time: number, intensity: number): void {
  const unit = Math.min(a.width, b.width) / 64;
  const phase = time / 1800;
  const strength = intensity * (0.9 + Math.sin(phase) * 0.1);
  const lift = Math.min(64 * unit, Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
  const ax = a.x;
  const ay = a.y - a.height * 0.44;
  const bx = b.x;
  const by = b.y - b.height * 0.44;
  const at = (t: number, lane: number): { x: number; y: number } => {
    const envelope = Math.sin(t * Math.PI);
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t - envelope * lift
      + Math.sin(t * Math.PI * 4 + phase + lane * 2) * envelope * (lane === 0 ? 2 : 7) * unit;
    return { x, y };
  };
  const center = Array.from({ length: 49 }, (_, i) => at(i / 48, 0));
  for (const [width, opacity] of [[20, 0.025], [10, 0.065], [4, 0.16], [1.2, 0.8]] as const) {
    g.lineStyle(width * unit, COLORS.bond.thread, opacity * strength);
    g.strokePoints(center, false);
  }
  for (const lane of [-1, 1]) {
    const points = Array.from({ length: 49 }, (_, i) => at(i / 48, lane));
    g.lineStyle(5 * unit, COLORS.bond.echo, 0.045 * strength);
    g.strokePoints(points, false);
    g.lineStyle(0.8 * unit, COLORS.bond.echo, 0.5 * strength);
    g.strokePoints(points, false);
  }
  for (let i = 0; i < 12; i++) {
    const t = (i / 12 + time / 14000) % 1;
    const p = at(t, i % 2 === 0 ? -1 : 1);
    const shimmer = Math.sin(Math.PI * t) * strength;
    const drift = Math.sin(phase + i * 2.4) * 6 * unit;
    g.fillStyle(COLORS.bond.aura, shimmer * 0.08);
    g.fillCircle(p.x, p.y + drift, 5 * unit);
    g.fillStyle(i % 3 === 0 ? COLORS.bond.echo : COLORS.bond.core, shimmer * 0.8);
    g.fillCircle(p.x, p.y + drift, (i % 3 === 0 ? 1.4 : 0.8) * unit);
  }
  for (const p of [at(0, 0), at(1, 0)]) {
    for (const [radius, opacity] of [[15, 0.04], [9, 0.1], [4, 0.45], [1.5, 0.9]] as const) {
      g.fillStyle(COLORS.bond.thread, opacity * strength);
      g.fillCircle(p.x, p.y, radius * unit);
    }
  }
}
