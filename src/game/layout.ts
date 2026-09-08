export const TILE_MIN = 44;
export const TILE_MAX = 84;
export const GAP = 4;
export const MARGIN = 8;
export const ROW_LIMIT = 6;
export const MIN_WIDTH = 360;

export type LayoutKind = 'row' | 'hairpin';

export interface TileSlot {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly row: 0 | 1 | 'mid';
}

export interface GapSlot {
  readonly at: number;
  readonly x: number;
  readonly y: number;
}

export interface Segment2D {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface BoardLayout {
  readonly kind: LayoutKind;
  readonly count: number;
  readonly tile: number;
  readonly gap: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly slots: readonly TileSlot[];
  readonly gaps: readonly GapSlot[];
  readonly mirror: Segment2D;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const layoutKind = (count: number): LayoutKind => (count <= ROW_LIMIT ? 'row' : 'hairpin');

export const columnsFor = (count: number): number =>
  layoutKind(count) === 'row' ? count : Math.ceil(count / 2);

export const tileSize = (width: number, columns: number): number =>
  clamp((width - 2 * MARGIN - GAP * (columns - 1)) / columns, TILE_MIN, TILE_MAX);

const gapsFor = (kind: LayoutKind, slots: readonly TileSlot[], pitch: number): GapSlot[] => {
  const n = slots.length;
  const first = slots[0];
  const last = slots[n - 1];
  if (first === undefined || last === undefined) return [];
  const gaps: GapSlot[] = [{ at: 0, x: first.x - pitch / 2, y: first.y }];
  for (let at = 1; at < n; at++) {
    const a = slots[at - 1];
    const b = slots[at];
    if (a === undefined || b === undefined) continue;
    gaps.push({ at, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  gaps.push({ at: n, x: kind === 'row' ? last.x + pitch / 2 : last.x - pitch / 2, y: last.y });
  return gaps;
};

/**
 * Regner brikkeposisjoner i layoutets eget rom. Bredder under MIN_WIDTH regnes som
 * MIN_WIDTH og får scale < 1, som scenen bruker til å skalere hele brettet.
 */
export const computeLayout = (input: { count: number; width: number; height: number }): BoardLayout => {
  const { count, height } = input;
  const width = Math.max(input.width, MIN_WIDTH);
  const scale = input.width / width;
  const kind = layoutKind(count);
  const cols = columnsFor(count);
  const tile = tileSize(width, cols);
  const pitch = tile + GAP;
  const totalW = cols * tile + (cols - 1) * GAP;
  const x0 = (width - totalW) / 2 + tile / 2;
  const cx = width / 2;
  const cy = height / 2;

  const slots: TileSlot[] = [];
  let mirror: Segment2D;

  if (kind === 'row') {
    for (let i = 0; i < count; i++) slots.push({ index: i, x: x0 + i * pitch, y: cy, row: 0 });
    mirror = { x1: cx, y1: cy - tile / 2 - GAP, x2: cx, y2: cy + tile / 2 + GAP };
  } else {
    const k = Math.floor(count / 2);
    const yTop = cy - pitch / 2;
    const yBot = cy + pitch / 2;
    for (let i = 0; i < k; i++) slots.push({ index: i, x: x0 + i * pitch, y: yTop, row: 0 });
    if (count % 2 === 1) slots.push({ index: k, x: x0 + k * pitch, y: cy, row: 'mid' });
    for (let i = count - k; i < count; i++) {
      const col = count - 1 - i;
      slots.push({ index: i, x: x0 + col * pitch, y: yBot, row: 1 });
    }
    slots.sort((a, b) => a.index - b.index);
    mirror = { x1: x0 - tile / 2, y1: cy, x2: x0 + (k - 1) * pitch + tile / 2, y2: cy };
  }

  return { kind, count, tile, gap: GAP, scale, width, height, slots, gaps: gapsFor(kind, slots, pitch), mirror };
};

export const hitTile = (layout: BoardLayout, x: number, y: number): number | null => {
  const half = layout.tile / 2;
  const hit = layout.slots.find((s) => Math.abs(x - s.x) <= half && Math.abs(y - s.y) <= half);
  return hit === undefined ? null : hit.index;
};

export const hitGap = (layout: BoardLayout, x: number, y: number): number | null => {
  const maxDist = layout.tile * 0.6;
  let best: GapSlot | null = null;
  let bestDist = Infinity;
  for (const g of layout.gaps) {
    const d = Math.hypot(x - g.x, y - g.y);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best !== null && bestDist <= maxDist ? best.at : null;
};
