import Phaser from 'phaser';
import { COLORS, cssColor, DURATION, EASING, FONTS, RADIUS } from '../theme/theme';

export const SCENE = {
  boot: 'Boot2',
  menu: 'Menu2',
  worldMap: 'WorldMap2',
  board: 'Board2',
  result: 'Result2',
  settings: 'Settings2',
} as const;

export interface LabelOpts {
  readonly size: number;
  readonly color?: number;
  readonly font?: 'display' | 'body';
  readonly align?: 'left' | 'center' | 'right';
  readonly bold?: boolean;
}

export const makeLabel = (scene: Phaser.Scene, x: number, y: number, text: string, opts: LabelOpts): Phaser.GameObjects.Text => {
  const t = scene.add.text(x, y, text, {
    fontFamily: opts.font === 'body' ? FONTS.body : FONTS.display,
    fontSize: `${opts.size}px`,
    fontStyle: opts.bold === true ? 'bold' : 'normal',
    color: cssColor(opts.color ?? COLORS.ink),
    align: opts.align ?? 'center',
  });
  t.setOrigin(opts.align === 'left' ? 0 : opts.align === 'right' ? 1 : 0.5, 0.5);
  return t;
};

export interface ButtonOpts {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly accent: number;
  readonly onClick: () => void;
  readonly enabled?: boolean;
}

/** Avrundet knapp med tekst. Hover/trykk skalerer lett; deaktivert er dempet og ikke interaktiv. */
export const makeButton = (scene: Phaser.Scene, opts: ButtonOpts): Phaser.GameObjects.Container => {
  const enabled = opts.enabled ?? true;
  const g = scene.add.graphics();
  g.fillStyle(enabled ? opts.accent : COLORS.locked, 1);
  g.fillRoundedRect(-opts.width / 2, -opts.height / 2, opts.width, opts.height, RADIUS.button);
  const label = makeLabel(scene, 0, 0, opts.label, { size: Math.round(opts.height * 0.42), color: COLORS.panel, bold: true });
  const c = scene.add.container(opts.x, opts.y, [g, label]);
  c.setSize(opts.width, opts.height);
  if (enabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.04, duration: DURATION.snap, ease: EASING.pop }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: DURATION.snap, ease: EASING.pop }));
    c.on('pointerup', () => opts.onClick());
  }
  return c;
};

/** Maks brettbredde i landskap; sentrert. */
export const contentWidth = (scene: Phaser.Scene): number => Math.min(scene.scale.width, 480);
export const contentLeft = (scene: Phaser.Scene): number => (scene.scale.width - contentWidth(scene)) / 2;
