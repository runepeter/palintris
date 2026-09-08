import { PIXEL_RATIO } from './viewport';
import Phaser from 'phaser';
import type { Tile } from '../core/tiles';
import type { TilePattern } from '../theme/theme';
import { COLORS, cssColor, FONTS, RADIUS, symbolColor, symbolPattern, WORLD_ACCENTS } from '../theme/theme';
import { ART, jewelFrame } from './art';

export interface TileFlags {
  matched: boolean;
  /** Par som ikke matcher ennå. Gir dempet kant, i motsetning til matched-ringen. */
  unmatched: boolean;
  selected: boolean;
  segment: boolean;
  ghost: boolean;
  cursor: boolean;
}

/**
 * Én diagonal av stripemønsteret, klippet mot kvadratet [-h, h]². Linjen går fra
 * (-h + d, h) til (h + d, -h), så y holder seg innenfor av seg selv og bare x må klippes.
 * Uten klippingen stakk strekene halvannen brikkebredde ut i bakgrunnen.
 */
const drawStripe = (g: Phaser.GameObjects.Graphics, d: number, h: number): void => {
  const span = 2 * h;
  const t0 = Math.max(0, -d / span);
  const t1 = Math.min(1, (span - d) / span);
  if (t0 >= t1) return;
  const at = (t: number): { x: number; y: number } => ({ x: -h + d + span * t, y: h - span * t });
  const a = at(t0);
  const b = at(t1);
  g.lineBetween(a.x, a.y, b.x, b.y);
};

const drawPattern = (g: Phaser.GameObjects.Graphics, pattern: TilePattern, size: number): void => {
  const h = size / 2;
  const step = size / 5;
  g.lineStyle(2, COLORS.ink, 0.18);
  g.fillStyle(COLORS.ink, 0.18);
  switch (pattern) {
    case 'dots':
      for (let y = -h + step; y < h; y += step) for (let x = -h + step; x < h; x += step) g.fillCircle(x, y, size * 0.04);
      break;
    case 'stripes':
      for (let d = -size; d < size; d += step) drawStripe(g, d, h);
      break;
    case 'rings':
      for (let r = step; r < h; r += step) g.strokeCircle(0, 0, r);
      break;
    case 'cross':
      g.lineBetween(-h, -h, h, h);
      g.lineBetween(-h, h, h, -h);
      break;
    case 'checks':
      for (let y = -h; y < h; y += step)
        for (let x = -h; x < h; x += step) if (((x + h) / step + (y + h) / step) % 2 < 1) g.fillRect(x, y, step, step);
      break;
    case 'waves':
      for (let y = -h + step; y < h; y += step) {
        g.beginPath();
        for (let x = -h; x <= h; x += 2) g.lineTo(x, y + Math.sin((x / size) * Math.PI * 4) * step * 0.3);
        g.strokePath();
      }
      break;
  }
};

export class TileView extends Phaser.GameObjects.Container {
  tileId: number;
  private tile: Tile;
  private size = 60;
  private colorBlind = false;
  private current: TileFlags = { matched: false, unmatched: false, selected: false, segment: false, ghost: false, cursor: false };
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly jewel: Phaser.GameObjects.Image;
  private readonly pattern: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly lock: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tile: Tile) {
    super(scene, 0, 0);
    this.tile = tile;
    this.tileId = tile.id;
    this.bg = scene.add.graphics();
    this.jewel = scene.add.image(0, 0, scene.textures.exists(ART.jewels) ? ART.jewels : '__WHITE');
    this.pattern = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', { resolution: PIXEL_RATIO, fontFamily: FONTS.display, fontStyle: 'bold', color: cssColor(COLORS.ink) })
      .setOrigin(0.5, 0.55);
    this.lock = scene.add.graphics();
    this.add([this.bg, this.jewel, this.pattern, this.ring, this.label, this.lock]);
    scene.add.existing(this);
  }

  get flags(): TileFlags {
    return { ...this.current };
  }

  setTile(tile: Tile, size: number, colorBlind: boolean): void {
    this.tile = tile;
    this.tileId = tile.id;
    this.size = size;
    this.colorBlind = colorBlind;
    this.redraw();
  }

  setFlags(f: Partial<TileFlags>): void {
    this.current = { ...this.current, ...f };
    this.redraw();
  }

  pulse(accent: number, reducedMotion: boolean): void {
    if (reducedMotion) return;
    const halo = this.scene.add.graphics();
    halo.lineStyle(5, accent, 0.9);
    halo.strokeRoundedRect(-this.size / 2 - 6, -this.size / 2 - 6, this.size + 12, this.size + 12, RADIUS.tile + 5);
    this.add(halo);
    halo.setScale(0.82);
    this.scene.tweens.add({
      targets: halo,
      scale: 1.18,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => halo.destroy(),
    });
  }

  private redraw(): void {
    const s = this.size;
    const r = RADIUS.tile * (s / 60);
    const t = this.tile;
    const fill = t.wild ? COLORS.wild : t.locked ? COLORS.locked : symbolColor(t.symbol);

    this.bg.clear();
    this.bg.fillStyle(COLORS.shadow, 0.65);
    this.bg.fillRoundedRect(-s / 2 + 2, -s / 2 + 4, s, s, r);
    const texture = t.wild ? ART.wild : ART.jewels;
    const hasSprite = this.scene.textures.exists(texture);
    this.jewel.setVisible(hasSprite);
    if (hasSprite) {
      this.jewel.setTexture(texture, t.wild ? 'trimmed' : jewelFrame(t.symbol)).setDisplaySize(s, s);
      this.jewel.setTint(t.locked ? COLORS.locked : COLORS.white);
    } else {
      this.bg.fillGradientStyle(fill, fill, COLORS.panel, COLORS.panel, 1);
      this.bg.fillRoundedRect(-s / 2, -s / 2, s, s, r);
      this.bg.lineStyle(2, COLORS.star, 0.9);
      this.bg.strokeRoundedRect(-s / 2, -s / 2, s, s, r);
    }
    if (t.wild && !hasSprite) {
      WORLD_ACCENTS.forEach((c, i) => {
        this.bg.lineStyle(4, c, 1);
        const a0 = (i / WORLD_ACCENTS.length) * Math.PI * 2;
        const a1 = ((i + 1) / WORLD_ACCENTS.length) * Math.PI * 2;
        this.bg.beginPath();
        this.bg.arc(0, 0, s / 2 - 3, a0, a1);
        this.bg.strokePath();
      });
    }

    this.pattern.clear();
    if (this.colorBlind && !t.wild) drawPattern(this.pattern, symbolPattern(t.symbol), s * 0.8);

    this.label.setText(t.wild ? (hasSprite ? '' : '★') : t.symbol);
    this.label.setFontSize(Math.round(s * (hasSprite ? 0.2 : 0.5)));
    this.label.setPosition(0, hasSprite ? s * 0.31 : 0);
    this.label.setColor(cssColor(COLORS.ink));
    this.label.setStroke(cssColor(COLORS.shadow), hasSprite ? 3 : 0);

    this.lock.clear();
    if (t.locked) {
      const k = s * 0.14;
      this.lock.fillStyle(COLORS.star, 1);
      this.lock.fillRoundedRect(s / 2 - k * 2.2, -s / 2 + k * 0.6, k * 1.6, k * 1.2, k * 0.2);
      this.lock.lineStyle(k * 0.3, COLORS.star, 1);
      this.lock.beginPath();
      this.lock.arc(s / 2 - k * 1.4, -s / 2 + k * 0.6, k * 0.5, Math.PI, 0);
      this.lock.strokePath();
    }

    this.ring.clear();
    const f = this.current;
    if (f.segment) {
      this.ring.fillStyle(COLORS.glow, 0.23);
      this.ring.fillRoundedRect(-s / 2, -s / 2, s, s, r);
    }
    if (f.matched) {
      this.ring.lineStyle(6, COLORS.success, 0.15);
      this.ring.strokeRoundedRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4, r + 2);
      this.ring.lineStyle(2, COLORS.success, 0.95);
      this.ring.strokeRoundedRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4, r + 2);
    } else if (f.unmatched && !t.wild) {
      this.ring.lineStyle(1, COLORS.gold, 0.3);
      this.ring.strokeRoundedRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4, r + 2);
    }
    if (f.selected || f.cursor) {
      this.ring.lineStyle(3, COLORS.ink, f.selected ? 1 : 0.5);
      this.ring.strokeRoundedRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8, r + 3);
    }
    this.setAlpha(f.ghost ? 0.5 : 1);
  }
}
