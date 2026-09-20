import { bindStickyPairs } from './sticky';

export const WILD_SYMBOL = '*';

export interface Tile {
  readonly id: number;
  readonly symbol: string;
  readonly locked: boolean;
  readonly wild: boolean;
  readonly sticky?: boolean;
  readonly bondedTo?: number;
}

export interface Hand {
  readonly wild: number;
  readonly remove: number;
}

export interface Snapshot {
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly movesUsed: number;
  readonly nextId: number;
}

export const makeTile = (
  id: number,
  symbol: string,
  opts: { locked?: boolean; wild?: boolean; sticky?: boolean } = {}
): Tile => {
  const wild = opts.wild === true;
  const locked = opts.locked === true;
  // symbolKey har ikke noe eget tegn for kombinasjonen, så to ulike tilstander
  // ville fått samme søkenøkkel i løseren.
  if (wild && locked) throw new Error('makeTile: en brikke kan ikke være både wild og locked');
  return {
    id,
    symbol: wild ? WILD_SYMBOL : symbol,
    locked,
    wild,
    ...(opts.sticky === true ? { sticky: true } : {}),
  };
};

/** 'AB*c' -> A, B, joker, låst C. */
export const tilesFromString = (s: string): Tile[] =>
  [...s].map((ch, i) => {
    if (ch === WILD_SYMBOL) return makeTile(i, ch, { wild: true });
    const upper = ch.toUpperCase();
    return makeTile(i, upper, { locked: ch !== upper });
  });

/** Invers av tilesFromString. Brukes som søkenøkkel og duplikatsjekk. */
export const symbolKey = (tiles: readonly Tile[]): string =>
  tiles
    .map((t) => (t.wild ? WILD_SYMBOL : t.locked ? t.symbol.toLowerCase() : t.symbol))
    .join('');

export const makeSnapshot = (tiles: readonly Tile[], hand: Hand): Snapshot => ({
  tiles: bindStickyPairs(tiles),
  hand,
  movesUsed: 0,
  nextId: tiles.reduce((max, t) => Math.max(max, t.id), -1) + 1,
});
