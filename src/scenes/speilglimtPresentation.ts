import type { MoveCommand } from '../core/commands';
import type { Tile } from '../core/tiles';

export interface HandBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface SpeilglimtHand {
  readonly glimt: HandBox;
  readonly undo: HandBox;
  readonly reset: HandBox;
  readonly cards: readonly { kind: 'wild' | 'remove'; box: HandBox }[];
}
export interface SpeilglimtInstruction {
  readonly text: string;
  /** Kort nok for glimtknappens undertekst, nær tommelen. */
  readonly short: string;
  readonly indices: readonly number[];
  readonly gap: number | null;
  readonly glyph: string | null;
  /** Helbrettrotasjon som har egen knapp; knappen markeres i stedet for å be om et utsnitt. */
  readonly wholeBoard: 'left' | 'right' | null;
}
export const speilglimtHandLayout = (width: number, height: number, wild: boolean, remove: boolean): SpeilglimtHand => {
  const content = Math.min(width, 480);
  const left = (width - content) / 2 + 16;
  const available = content - 32;
  const kinds: ('wild' | 'remove')[] = [...(wild ? ['wild' as const] : []), ...(remove ? ['remove' as const] : [])];
  const glimtWidth = kinds.length === 0 ? available : (available - 8) / 2;
  const cardWidth = kinds.length === 0 ? 0 : (available - glimtWidth - kinds.length * 8) / kinds.length;
  const box = (x: number, y: number, width: number): HandBox => ({ x, y, width, height: 44 });
  const lowerWidth = (available - 8) / 2;
  return {
    glimt: box(left + glimtWidth / 2, height - 88, glimtWidth),
    undo: box(left + lowerWidth / 2, height - 34, lowerWidth),
    reset: box(left + available - lowerWidth / 2, height - 34, lowerWidth),
    cards: kinds.map((kind, i) => ({ kind, box: box(left + glimtWidth + 8 + cardWidth / 2 + i * (cardWidth + 8), height - 88, cardWidth) })),
  };
};

const span = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const speilglimtInstruction = (move: MoveCommand, tiles: readonly Tile[], wholeBoardButtons = false): SpeilglimtInstruction => {
  switch (move.type) {
    case 'swap': return { text: 'Bytt de to markerte brikkene.', short: 'Bytt de to markerte', indices: [move.a, move.b], gap: null, glyph: '⇄', wholeBoard: null };
    case 'rotate': {
      const glyph = move.dir === 'left' ? '⟲' : '⟳';
      const way = move.dir === 'left' ? 'Venstre' : 'Høyre';
      if (wholeBoardButtons && move.from === 0 && move.to === tiles.length - 1) {
        const arrow = move.dir === 'left' ? '←' : '→';
        return { text: `Trykk «Hele brettet ${arrow}».`, short: `Trykk Hele brettet ${arrow}`, indices: [], gap: null, glyph: null, wholeBoard: move.dir };
      }
      return { text: `Roter det markerte utsnittet: ${glyph} ${way}.`, short: `Roter markert: ${glyph} ${way}`, indices: span(move.from, move.to), gap: null, glyph, wholeBoard: null };
    }
    case 'mirror': return { text: 'Speil det markerte utsnittet: ⇋ Speil.', short: 'Speil markert: ⇋', indices: span(move.from, move.to), gap: null, glyph: '⇋', wholeBoard: null };
    case 'insertWild': return { text: 'Dra jokeren til +.', short: 'Dra jokeren til +', indices: [], gap: move.at, glyph: null, wholeBoard: null };
    case 'remove': return { text: 'Dra den markerte brikken til Fjern.', short: 'Dra markert til Fjern',
      indices: tiles.flatMap((tile, index) => tile.id === move.tileId ? [index] : []), gap: null, glyph: '✕', wholeBoard: null };
  }
};

export interface SpeilglimtResultLines { readonly balance: string; readonly progress: string; readonly compact: string }

export const speilglimtResultLines = (solved: number, balance: number, assisted: boolean): SpeilglimtResultLines => {
  const head = `Speilglimt · ${balance}${assisted ? ' · løst med hjelp' : ''}`;
  const done = solved >= 90;
  return {
    balance: head,
    progress: done ? 'Alle 30 glimt er opptjent' : `${solved % 3}/3 speil til neste glimt`,
    compact: `${head} · ${done ? 'alle opptjent' : `${solved % 3}/3 til neste`}`,
  };
};

/** Senter-y relativt til resultatseglet; null betyr at linjen ikke får plass. */
export interface ResultInfoRows { readonly best: number | null; readonly unlock: number | null; readonly glimt: readonly number[] }

const ROWS_START = 94;
const BEST_ROW = 22;
const UNLOCK_ROW = 52;
const GLIMT_ROW = 18;

/**
 * Plasserer linjene under «trekk · mål» innenfor `space` px fra seglets sentrum.
 * Verdensåpning vises alltid; så beholdes glimt (sammenslått om nødvendig) før personlig beste.
 */
export const resultInfoRows = (space: number, best: boolean, unlock: boolean): ResultInfoRows => {
  const options = [[best, 2], [best, 1], [false, 2], [false, 1], [false, 0]] as const;
  const [showBest, lines] = options.find(([b, n]) =>
    ROWS_START + (b ? BEST_ROW : 0) + (unlock ? UNLOCK_ROW : 0) + n * GLIMT_ROW <= space) ?? [false, 0];
  let y = ROWS_START;
  const bestY = showBest ? y + 10 : null;
  if (showBest) y += BEST_ROW;
  const unlockY = unlock ? y + 24 : null;
  if (unlock) y += UNLOCK_ROW;
  return { best: bestY, unlock: unlockY, glimt: Array.from({ length: lines }, (_, i) => y + 9 + i * GLIMT_ROW) };
};
