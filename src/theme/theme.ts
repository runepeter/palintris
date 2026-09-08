/** Eneste kilde for farger, fonter, avstander og animasjonstider. Ingen hex i scener. */

export const COLORS = {
  background: 0xfff8ef,
  panel: 0xffffff,
  line: 0xe6ded2,
  ink: 0x2b2b3a,
  inkMuted: 0x7a7a8c,
  tiles: [0xff6b6b, 0xffb347, 0xffe66d, 0x6bd6a1, 0x4fc3f7, 0xb388ff] as const,
  wild: 0xffffff,
  locked: 0xb9b3ad,
  success: 0x3fbf7f,
  danger: 0xe0555b,
  star: 0xffd166,
} as const;

/** Korall, solgul, turkis, lilla, lime, dyp blå. Indeks 0 er verden 1. */
export const WORLD_ACCENTS: readonly number[] = [0xff6b6b, 0xffc857, 0x2ec4b6, 0x9b5de5, 0xa3e635, 0x1e5bd8];

export const FONTS = {
  display: '"Fredoka", Arial, sans-serif',
  body: '"Nunito", Arial, sans-serif',
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const RADIUS = { tile: 12, button: 14, panel: 20 } as const;

export const DURATION = { snap: 120, normal: 220, calm: 400, ceremony: 800 } as const;

/** Phaser-easing som strenger, så tema-fila ikke importerer Phaser. */
export const EASING = { move: 'Cubic.easeOut', pop: 'Back.easeOut', fade: 'Sine.easeInOut' } as const;

const ALPHA_BASE = 'A'.charCodeAt(0);

export const symbolColor = (symbol: string): number => {
  if (symbol === '*') return COLORS.wild;
  const i = symbol.charCodeAt(0) - ALPHA_BASE;
  const idx = ((i % COLORS.tiles.length) + COLORS.tiles.length) % COLORS.tiles.length;
  return COLORS.tiles[idx] ?? COLORS.tiles[0];
};

/** Fargeblind-modus legger dette mønsteret bak brikkefargen. */
export type TilePattern = 'dots' | 'stripes' | 'rings' | 'cross' | 'checks' | 'waves';

export const PATTERNS: readonly TilePattern[] = ['dots', 'stripes', 'rings', 'cross', 'checks', 'waves'];

export const symbolPattern = (symbol: string): TilePattern => {
  if (symbol === '*') return 'rings';
  const i = symbol.charCodeAt(0) - ALPHA_BASE;
  const idx = ((i % PATTERNS.length) + PATTERNS.length) % PATTERNS.length;
  return PATTERNS[idx] ?? 'dots';
};

export const worldAccent = (world: number): number => WORLD_ACCENTS[world - 1] ?? WORLD_ACCENTS[0] ?? 0;

export const durations = (reducedMotion: boolean): Readonly<Record<keyof typeof DURATION, number>> =>
  reducedMotion
    ? { snap: DURATION.snap, normal: DURATION.snap, calm: DURATION.snap, ceremony: DURATION.snap }
    : DURATION;

export const cssColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
