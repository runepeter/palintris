import { screenWidth, PIXEL_RATIO } from './viewport';
import Phaser from 'phaser';
import { COLORS, cssColor, DURATION, EASING, FONTS, RADIUS } from '../theme/theme';

export const SCENE = {
  boot: 'Boot',
  menu: 'Menu',
  worldMap: 'WorldMap',
  board: 'Board',
  result: 'Result',
  daily: 'Daily',
  blitzResult: 'BlitzResult',
  settings: 'Settings',
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
    resolution: PIXEL_RATIO,
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
  /** Overstyrer teksthøyden når etiketten er for lang for knappebredden. */
  readonly labelSize?: number;
}

/** Avrundet knapp med tekst. Hover/trykk skalerer lett; deaktivert er dempet og ikke interaktiv. */
export const makeButton = (scene: Phaser.Scene, opts: ButtonOpts): Phaser.GameObjects.Container => {
  const enabled = opts.enabled ?? true;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.shadow, 0.8);
  g.fillRoundedRect(-opts.width / 2, -opts.height / 2 + 5, opts.width, opts.height, RADIUS.button);
  g.fillStyle(COLORS.panel, 1);
  g.fillRoundedRect(-opts.width / 2, -opts.height / 2, opts.width, opts.height, RADIUS.button);
  g.fillStyle(opts.accent, enabled ? 0.13 : 0.03);
  g.fillRoundedRect(-opts.width / 2, -opts.height / 2, opts.width, opts.height, RADIUS.button);
  g.fillStyle(COLORS.white, enabled ? 0.04 : 0.015);
  g.fillRoundedRect(-opts.width / 2 + 3, -opts.height / 2 + 3, opts.width - 6, opts.height * 0.42, RADIUS.button - 3);
  g.lineStyle(1.5, enabled ? opts.accent : COLORS.line, enabled ? 0.85 : 0.5);
  g.strokeRoundedRect(-opts.width / 2, -opts.height / 2, opts.width, opts.height, RADIUS.button);
  g.lineStyle(1, enabled ? COLORS.ink : COLORS.line, 0.2);
  g.lineBetween(-opts.width / 2 + 12, -opts.height / 2 + 4, opts.width / 2 - 12, -opts.height / 2 + 4);
  const label = makeLabel(scene, 0, 0, opts.label, {
    size: opts.labelSize ?? Math.round(opts.height * 0.34),
    color: enabled ? COLORS.ink : COLORS.inkMuted,
    font: 'body',
    bold: true,
  });
  const c = scene.add.container(opts.x, opts.y, [g, label]);
  c.setSize(opts.width, opts.height);
  if (enabled) {
    c.setInteractive({ useHandCursor: true });
    // Phaser fyrer pointerup på knappen uansett hvor pointerdown skjedde. Uten armeringen
    // ville et drag som slippes over Angre eller Reset utføre kommandoen.
    let armed = false;
    // Rask inn/ut-hovring kunne stable opp konkurrerende skaleringstweens; drep forrige først.
    c.on('pointerover', () => {
      scene.tweens.killTweensOf(c);
      scene.tweens.add({ targets: c, scale: 1.04, duration: DURATION.snap, ease: EASING.pop });
    });
    c.on('pointerout', () => {
      armed = false;
      scene.tweens.killTweensOf(c);
      scene.tweens.add({ targets: c, scale: 1, duration: DURATION.snap, ease: EASING.pop });
    });
    c.on('pointerdown', () => {
      armed = true;
    });
    c.on('pointerup', () => {
      if (!armed) return;
      armed = false;
      opts.onClick();
    });
  }
  return c;
};

/** Maks brettbredde i landskap; sentrert. */
export const contentWidth = (scene: Phaser.Scene): number => Math.min(screenWidth(scene), 480);
export const contentLeft = (scene: Phaser.Scene): number => (screenWidth(scene) - contentWidth(scene)) / 2;

/** Kopierer til utklippstavla. Usant når nettleseren nekter eller mangler API-et. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
