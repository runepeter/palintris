import { screenWidth, screenHeight, prepareViewport } from './viewport';
import Phaser from 'phaser';
import { COLORS } from '../theme/theme';

export const ART = { realm: 'mirror-realm', jewels: 'jewel-tiles', wild: 'wild-jewel' } as const;

export const registerJewelFrames = (scene: Phaser.Scene): void => {
  const texture = scene.textures.get(ART.jewels);
  if (texture.key === '__MISSING') return;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    texture.add(i, 0, col * 512 + 50, row * 512 + (row === 0 ? 62 : 38), 416, 408);
  }
  if (scene.textures.exists(ART.wild)) scene.textures.get(ART.wild).add('trimmed', 0, 31, 42, 449, 434);
};

export const jewelFrame = (symbol: string): number => ((symbol.charCodeAt(0) - 65) % 6 + 6) % 6;

/** Bakgrunn og ramme gjenbygges samlet ved resize, uten egne event-lyttere. */
export const makeBackdrop = (scene: Phaser.Scene, mode: 'hero' | 'board' | 'quiet' = 'quiet'): Phaser.GameObjects.Container => {
  prepareViewport(scene);
  const w = screenWidth(scene);
  const h = screenHeight(scene);
  const root = scene.add.container(0, 0).setDepth(-20).setName('realm-backdrop');
  if (scene.textures.exists(ART.realm)) {
    const art = scene.add.image(w / 2, h / 2, ART.realm);
    art.setScale(Math.max(w / art.width, h / art.height));
    root.add(art);
    if (w > h * 0.8) {
      art.setAlpha(0.3);
      const portrait = scene.add.image(w / 2, h / 2, ART.realm);
      portrait.setScale(h / portrait.height);
      root.add(portrait);
      const edges = scene.add.graphics();
      const fade = Math.min(100, portrait.displayWidth / 4);
      const left = (w - portrait.displayWidth) / 2;
      edges.fillGradientStyle(COLORS.background, COLORS.background, COLORS.background, COLORS.background, 1, 0, 1, 0);
      edges.fillRect(left, 0, fade, h);
      edges.fillGradientStyle(COLORS.background, COLORS.background, COLORS.background, COLORS.background, 0, 1, 0, 1);
      edges.fillRect(left + portrait.displayWidth - fade, 0, fade, h);
      root.add(edges);
    }
  }
  const shade = scene.add.graphics();
  shade.fillStyle(COLORS.background, mode === 'hero' ? 0.12 : mode === 'board' ? 0.77 : 0.88);
  shade.fillRect(0, 0, w, h);
  if (mode === 'hero') {
    shade.fillGradientStyle(COLORS.shadow, COLORS.shadow, COLORS.shadow, COLORS.shadow, 0, 0, 0.92, 0.92);
    shade.fillRect(0, h * 0.42, w, h * 0.58);
    shade.fillGradientStyle(COLORS.shadow, COLORS.shadow, COLORS.shadow, COLORS.shadow, 0.7, 0.7, 0, 0);
    shade.fillRect(0, 0, w, h * 0.25);
  }
  const inset = Math.max(10, (w - 480) / 2);
  shade.lineStyle(1, COLORS.gold, 0.35);
  shade.strokeRoundedRect(inset, 12, w - inset * 2, h - 24, 18);
  for (const x of [inset + 10, w - inset - 10]) {
    for (const y of [24, h - 24]) {
      shade.fillStyle(COLORS.star, 0.8);
      shade.fillPoints([{ x, y: y - 4 }, { x: x + 3, y }, { x, y: y + 4 }, { x: x - 3, y }], true);
    }
  }
  root.add(shade);
  return root;
};

export const drawMedallion = (scene: Phaser.Scene, x: number, y: number, radius: number, accent: number): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.shadow, 0.7);
  g.fillCircle(x, y + 4, radius + 3);
  g.fillStyle(COLORS.panel, 1);
  g.fillCircle(x, y, radius);
  g.lineStyle(2, accent, 0.8);
  g.strokeCircle(x, y, radius);
  g.lineStyle(1, accent, 0.25);
  g.strokeCircle(x, y, radius - 5);
  return g;
};
