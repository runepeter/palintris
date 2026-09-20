/** Eneste kilde for farger, fonter, avstander og animasjonstider. Ingen hex i scener. */

export const COLORS = {
  background: 0x061920,
  panel: 0x102d37,
  line: 0x44616a,
  ink: 0xfff2d6,
  inkMuted: 0xa8c2c5,
  tiles: [0xf25f70, 0xffa83f, 0xf5d65d, 0x49d49b, 0x57cafa, 0xba89f5] as const,
  wild: 0xe8ddff,
  locked: 0x526b73,
  success: 0x7cecc5,
  danger: 0xf28489,
  star: 0xf3cd80,
  gold: 0xc39b53,
  shadow: 0x020d14,
  glow: 0x6ddcda,
  bond: { aura: 0x27bda8, thread: 0x8df5dd, echo: 0xab8cf2, core: 0xe0fff5 },
  white: 0xffffff,
} as const;

/** Gull, jade, turkis, ametyst, korall, safir. Indeks 0 er verden 1. */
export const WORLD_ACCENTS: readonly number[] = [0xf3cd80, 0x7cecc5, 0x65d5ed, 0xba89f5, 0xf2a385, 0x99b8fa];

export const FONTS = {
  display: '"Cinzel", Georgia, serif',
  body: '"Nunito", Arial, sans-serif',
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const RADIUS = { tile: 9, button: 10, panel: 16 } as const;

export const DURATION = { snap: 120, normal: 220, calm: 400, ceremony: 800 } as const;

export const VICTORY = {
  clear: { hold: 700, pairGap: 140, glow: 200, dissolve: 300, rest: 320 },
  fast: { hold: 180, pairGap: 60, glow: 100, dissolve: 180, rest: 160 },
  reduced: { hold: 700, pairGap: 0, glow: 0, dissolve: 220, rest: 240 },
} as const;

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
