# Palintris brettlogikk – implementasjonsplan (plan 2a av 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygge den rene, testede logikken som brettet trenger før Phaser-scenene skrives: tema-tokens, layoutgeometri for rad og hårnål, gest-tilstandsmaskin, brettsesjon med løser-status og blindgate, og kampanjemodus med lagring.

**Architecture:** Alt i denne planen er ren TypeScript uten Phaser-import, i `src/theme` og `src/game`. Scenene i plan 2b konsumerer disse modulene: layout gir koordinater, gest-maskinen oversetter pekerhendelser til intensjoner, sesjonen kjører kjernen og løseren, og modusen bestemmer nivå og hva som skjer ved løsning.

**Tech Stack:** TypeScript 5 (strict, `noUncheckedIndexedAccess`), vitest, fast-check. Ingen nye avhengigheter.

**Spec:** `docs/superpowers/specs/2026-09-07-palintris-redesign-design.md` §2 (Layout, Gester, Tastatur), §4 (tokens, animasjonstider, redusert bevegelse), §5 (BoardScene og modus, Testing). Etterslep fra plan 1 nederst i `docs/superpowers/plans/2026-09-08-palintris-core.md`. Plan 2b dekker Phaser-scener, tegning, animasjon, lyd og Playwright.

## Global Constraints

- `src/theme` og `src/game` importerer aldri fra `phaser`, `src/scenes`, `src/ui`, `src/config`, `src/utils`. Kun fra `src/core`, `src/content` og hverandre.
- Tester ligger i `src/theme/__tests__/` og `src/game/__tests__/`, navn `*.test.ts`. `npm test` og `npm run typecheck` må være grønne før hver commit. `npm run lint:core` utvides til også å dekke `src/theme` og `src/game` i Task 1 og må være grønn ved hver commit etterpå.
- Layout: marg 8 px per side, gap 4 px, brikke `clamp((bredde − 16 − 4·(k−1)) / k, 44, 84)`, k = brikker per rad, maks 7. Én rad for ≤ 6 brikker, hårnål for 7–14. Minste støttede bredde 360 px; smalere skalerer proporsjonalt (`scale < 1`).
- Hårnål: første halvdel venstre→høyre på øverste rad, andre halvdel høyre→venstre på nederste, par `i` og `n−1−i` rett over hverandre. Midtbrikke ved oddetall ytterst til høyre mellom radene. Speillinje horisontal mellom radene. Naboskap og segmenter følger alltid sekvensrekkefølge, også over folden.
- Gester: drag-terskel 12 px, hold-terskel 250 ms. Drag slippes på sekvensnabo → swap; på hånden med fjern tilgjengelig → remove; ellers sprett tilbake. Hold → segment; slipp viser meny (roter venstre, speil, roter høyre). Speil krever segment ≥ 3.
- Animasjonstokens: snapp 120, normal 220, rolig 400, seremoni 800 ms. Redusert bevegelse setter alle til snapp.
- Verdensaksenter i rekkefølge: korall, solgul, turkis, lilla, lime, dyp blå.
- Løser i klient: `limits.states` 50 000, aldri `ms`. `unknown` vises aldri som blindgate.
- Ingen push. Commit lokalt på branch `redesign`. Hver commit avsluttes med trailerne `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` og `Claude-Session: https://claude.ai/code/session_018VMa2K13QmbxtwcDwXsQ1w`.

---

### Task 1: Tema-tokens

**Files:**
- Create: `src/theme/theme.ts`
- Test: `src/theme/__tests__/theme.test.ts`
- Modify: `package.json` (`lint:core`-glob)

**Interfaces:**
- Produces:
  - `COLORS` (bakgrunn, tekst, panel, linje, `tiles` seks brikkefarger, `wild`, `locked`, `success`, `danger`)
  - `WORLD_ACCENTS: readonly number[]` (6)
  - `FONTS = { display, body }` (CSS font-family-strenger)
  - `SPACE`, `RADIUS`
  - `DURATION = { snap: 120, normal: 220, calm: 400, ceremony: 800 }`
  - `EASING = { move: 'Cubic.easeOut', pop: 'Back.easeOut', fade: 'Sine.easeInOut' }`
  - `symbolColor(symbol: string): number` — deterministisk, A→tiles[0], B→tiles[1], …, sykler etter 6; `'*'` → `COLORS.wild`
  - `worldAccent(world: number): number`
  - `durations(reducedMotion: boolean): Readonly<typeof DURATION>`
  - `cssColor(n: number): string` — `'#rrggbb'`

- [ ] **Step 1: Skriv failing test**

`src/theme/__tests__/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { COLORS, cssColor, DURATION, durations, symbolColor, WORLD_ACCENTS, worldAccent } from '../theme';

describe('symbolColor', () => {
  it('gir seks ulike farger for A–F og sykler etter det', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map(symbolColor);
    expect(new Set(six).size).toBe(6);
    expect(symbolColor('G')).toBe(symbolColor('A'));
    expect(symbolColor('*')).toBe(COLORS.wild);
  });
});

describe('worldAccent', () => {
  it('har seks aksenter og faller tilbake til første utenfor rekkevidde', () => {
    expect(WORLD_ACCENTS).toHaveLength(6);
    expect(worldAccent(3)).toBe(WORLD_ACCENTS[2]);
    expect(worldAccent(0)).toBe(WORLD_ACCENTS[0]);
    expect(worldAccent(9)).toBe(WORLD_ACCENTS[0]);
  });
});

describe('durations', () => {
  it('redusert bevegelse setter alt til snapp', () => {
    expect(durations(false)).toEqual(DURATION);
    expect(durations(true)).toEqual({ snap: 120, normal: 120, calm: 120, ceremony: 120 });
  });
});

describe('cssColor', () => {
  it('formaterer med seks hex-siffer', () => {
    expect(cssColor(0xff6b6b)).toBe('#ff6b6b');
    expect(cssColor(0x000fff)).toBe('#000fff');
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../theme'`.

- [ ] **Step 3: Implementer theme.ts**

```ts
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

export const worldAccent = (world: number): number => WORLD_ACCENTS[world - 1] ?? WORLD_ACCENTS[0] ?? 0;

export const durations = (reducedMotion: boolean): Readonly<typeof DURATION> =>
  reducedMotion
    ? { snap: DURATION.snap, normal: DURATION.snap, calm: DURATION.snap, ceremony: DURATION.snap }
    : DURATION;

export const cssColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
```

- [ ] **Step 4: Utvid lint-glob**

I `package.json`, endre `"lint:core"` til:

```json
"lint:core": "eslint src/core src/content src/theme src/game scripts --ext .ts"
```

- [ ] **Step 5: Kjør test, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS, 0 lint-problemer.

- [ ] **Step 6: Commit**

Legg til `src/theme/theme.ts`, `src/theme/__tests__/theme.test.ts` og `package.json`. Melding: `feat(theme): design tokens as single source`.

---

### Task 2: Layoutgeometri

**Files:**
- Create: `src/game/layout.ts`
- Test: `src/game/__tests__/layout.test.ts`

**Interfaces:**
- Produces:
  - `TILE_MIN = 44`, `TILE_MAX = 84`, `GAP = 4`, `MARGIN = 8`, `ROW_LIMIT = 6`, `MIN_WIDTH = 360`
  - `type LayoutKind = 'row' | 'hairpin'`
  - `interface TileSlot { readonly index: number; readonly x: number; readonly y: number; readonly row: 0 | 1 | 'mid' }`
  - `interface GapSlot { readonly at: number; readonly x: number; readonly y: number }`
  - `interface Segment2D { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }`
  - `interface BoardLayout { readonly kind: LayoutKind; readonly count: number; readonly tile: number; readonly gap: number; readonly scale: number; readonly width: number; readonly height: number; readonly slots: readonly TileSlot[]; readonly gaps: readonly GapSlot[]; readonly mirror: Segment2D }`
  - `layoutKind(count): LayoutKind`, `columnsFor(count): number`, `tileSize(width, columns): number`
  - `computeLayout(input: { count: number; width: number; height: number }): BoardLayout`
  - `hitTile(layout, x, y): number | null`, `hitGap(layout, x, y): number | null`
  - Koordinater er i layoutets eget rom (`width` = max(inn-bredde, 360)); scenen multipliserer med `scale`.

- [ ] **Step 1: Skriv failing test**

`src/game/__tests__/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { columnsFor, computeLayout, GAP, hitGap, hitTile, layoutKind, MARGIN, tileSize, TILE_MAX, TILE_MIN } from '../layout';

const lay = (count: number, width = 390, height = 400) => computeLayout({ count, width, height });

describe('layoutKind og columnsFor', () => {
  it('rad opp til 6, hårnål fra 7', () => {
    expect(layoutKind(6)).toBe('row');
    expect(layoutKind(7)).toBe('hairpin');
    expect(columnsFor(6)).toBe(6);
    expect(columnsFor(7)).toBe(4);
    expect(columnsFor(8)).toBe(4);
    expect(columnsFor(13)).toBe(7);
    expect(columnsFor(14)).toBe(7);
  });
});

describe('tileSize', () => {
  it('gir 7 brikker plass på 360 px og klemmer til 44–84', () => {
    expect(tileSize(360, 7)).toBeCloseTo((360 - 2 * MARGIN - 6 * GAP) / 7, 5);
    expect(tileSize(360, 7)).toBeGreaterThanOrEqual(TILE_MIN);
    expect(tileSize(800, 4)).toBe(TILE_MAX);
    expect(tileSize(200, 7)).toBe(TILE_MIN);
  });
});

describe('computeLayout rad', () => {
  it('legger brikkene på én linje, sentrert, med vertikal speillinje i midten', () => {
    const l = lay(5);
    expect(l.kind).toBe('row');
    expect(l.slots).toHaveLength(5);
    expect(new Set(l.slots.map((s) => s.y)).size).toBe(1);
    for (let i = 1; i < 5; i++) expect(l.slots[i]!.x).toBeGreaterThan(l.slots[i - 1]!.x);
    const first = l.slots[0]!;
    const last = l.slots[4]!;
    expect((first.x + last.x) / 2).toBeCloseTo(l.width / 2, 5);
    expect(l.mirror.x1).toBeCloseTo(l.width / 2, 5);
    expect(l.mirror.x1).toBe(l.mirror.x2);
  });
});

describe('computeLayout hårnål', () => {
  it.each([7, 8, 11, 14])('par står rett over hverandre for %i brikker', (n) => {
    const l = lay(n);
    expect(l.kind).toBe('hairpin');
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const a = l.slots[i]!;
      const b = l.slots[n - 1 - i]!;
      expect(a.x).toBeCloseTo(b.x, 5);
      expect(a.row).toBe(0);
      expect(b.row).toBe(1);
      expect(b.y).toBeGreaterThan(a.y);
    }
    expect(l.mirror.y1).toBe(l.mirror.y2);
    expect(l.mirror.y1).toBeCloseTo(l.height / 2, 5);
  });

  it('midtbrikke ved oddetall står ytterst til høyre på speillinja', () => {
    const l = lay(7);
    const mid = l.slots[3]!;
    expect(mid.row).toBe('mid');
    expect(mid.y).toBeCloseTo(l.height / 2, 5);
    expect(mid.x).toBeGreaterThan(l.slots[2]!.x);
  });

  it('nederste rad leses høyre mot venstre', () => {
    const l = lay(8);
    expect(l.slots[4]!.x).toBeGreaterThan(l.slots[7]!.x);
  });

  it('slots er sortert på indeks', () => {
    const l = lay(9);
    expect(l.slots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('skalering', () => {
  it('bredde under 360 gir scale < 1 og layout regnet på 360', () => {
    const l = lay(7, 320);
    expect(l.width).toBe(360);
    expect(l.scale).toBeCloseTo(320 / 360, 5);
    expect(lay(7, 390).scale).toBe(1);
  });
});

describe('gaps', () => {
  it('har n+1 innsettingsplasser i sekvensrekkefølge', () => {
    const l = lay(5);
    expect(l.gaps.map((g) => g.at)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(l.gaps[0]!.x).toBeLessThan(l.slots[0]!.x);
    expect(l.gaps[5]!.x).toBeGreaterThan(l.slots[4]!.x);
    expect(l.gaps[2]!.x).toBeCloseTo((l.slots[1]!.x + l.slots[2]!.x) / 2, 5);
  });

  it('i hårnål ligger siste gap til venstre for nederste rads første brikke', () => {
    const l = lay(8);
    expect(l.gaps[8]!.x).toBeLessThan(l.slots[7]!.x);
    expect(l.gaps[8]!.y).toBeCloseTo(l.slots[7]!.y, 5);
    const fold = l.gaps[4]!;
    expect(fold.x).toBeCloseTo(l.slots[3]!.x, 5);
    expect(fold.y).toBeCloseTo((l.slots[3]!.y + l.slots[4]!.y) / 2, 5);
  });
});

describe('treff', () => {
  it('hitTile finner brikke innenfor kvadratet, ellers null', () => {
    const l = lay(6);
    const s = l.slots[2]!;
    expect(hitTile(l, s.x, s.y)).toBe(2);
    expect(hitTile(l, s.x + l.tile / 2 - 1, s.y)).toBe(2);
    expect(hitTile(l, 0, 0)).toBeNull();
  });
  it('hitGap finner nærmeste gap innen 0.6 brikke, ellers null', () => {
    const l = lay(6);
    const g = l.gaps[3]!;
    expect(hitGap(l, g.x + 2, g.y - 2)).toBe(3);
    expect(hitGap(l, g.x, g.y + l.tile)).toBeNull();
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../layout'`.

- [ ] **Step 3: Implementer layout.ts**

```ts
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
```

- [ ] **Step 4: Kjør test, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS. `hitGap`-testen med `g.y + l.tile`: avstanden er `tile` > `0.6·tile`, så resultatet skal være null.

- [ ] **Step 5: Commit**

Legg til `src/game/layout.ts` og `src/game/__tests__/layout.test.ts`. Melding: `feat(game): board layout geometry for row and hairpin`.

---

### Task 3: Gest-tilstandsmaskin

**Files:**
- Create: `src/game/gestures.ts`
- Test: `src/game/__tests__/gestures.test.ts`

**Interfaces:**
- Produces:
  - `DRAG_THRESHOLD = 12`, `HOLD_MS = 250`
  - `type SegmentAction = 'rotateLeft' | 'mirror' | 'rotateRight'`
  - `type Target = { kind: 'tile'; index } | { kind: 'gap'; at } | { kind: 'hand'; item: 'wild' | 'remove' } | { kind: 'menu'; action: SegmentAction } | { kind: 'none' }`
  - `interface PointerEvt { readonly type: 'down' | 'move' | 'up' | 'cancel'; readonly x; readonly y; readonly t; readonly target: Target }`
  - `type HintReason = 'locked' | 'segmentContainsLocked' | 'segmentTooShort' | 'handEmpty'`
  - `type Intent = { type: 'swap'; a; b } | { type: 'remove'; index } | { type: 'insertWild'; at } | { type: 'segment'; from; to; action } | { type: 'hint'; reason: HintReason }`
  - `type GestureState` (se kode): `idle | pending | dragTile | segment | menu | selected | dragWild | wildArmed`
  - `interface GestureEnv { count(): number; isLocked(index): boolean; hasWild(): boolean; canRemove(): boolean }`
  - `class GestureMachine { state; constructor(env); handle(evt): Intent[]; tick(t): void; reset(): void }`
  - Scenen løser `Target` fra layout-treff og sender inn; maskinen kjenner ikke geometri. Naboskap er alltid `|a − b| === 1` i sekvensrekkefølge.

- [ ] **Step 1: Skriv failing test**

`src/game/__tests__/gestures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PointerEvt, Target } from '../gestures';
import { DRAG_THRESHOLD, GestureMachine, HOLD_MS } from '../gestures';

const tile = (index: number): Target => ({ kind: 'tile', index });
const gap = (at: number): Target => ({ kind: 'gap', at });
const hand = (item: 'wild' | 'remove'): Target => ({ kind: 'hand', item });
const none: Target = { kind: 'none' };
const menu = (action: 'rotateLeft' | 'mirror' | 'rotateRight'): Target => ({ kind: 'menu', action });

const ev = (type: PointerEvt['type'], target: Target, x = 0, y = 0, t = 0): PointerEvt => ({ type, target, x, y, t });

const machine = (opts: Partial<{ count: number; locked: number[]; wild: boolean; remove: boolean }> = {}): GestureMachine =>
  new GestureMachine({
    count: () => opts.count ?? 8,
    isLocked: (i) => (opts.locked ?? []).includes(i),
    hasWild: () => opts.wild ?? true,
    canRemove: () => opts.remove ?? true,
  });

describe('drag swap', () => {
  it('drag til sekvensnabo gir swap', () => {
    const m = machine();
    expect(m.handle(ev('down', tile(2), 100, 100, 0))).toEqual([]);
    expect(m.state.name).toBe('pending');
    expect(m.handle(ev('move', tile(2), 100 + DRAG_THRESHOLD + 1, 100, 50))).toEqual([]);
    expect(m.state.name).toBe('dragTile');
    expect(m.handle(ev('up', tile(3), 160, 100, 120))).toEqual([{ type: 'swap', a: 2, b: 3 }]);
    expect(m.state.name).toBe('idle');
  });

  it('drag over folden (nabo i sekvens) gir swap uansett retning', () => {
    const m = machine();
    m.handle(ev('down', tile(3), 100, 100, 0));
    m.handle(ev('move', tile(3), 100, 120, 40));
    expect(m.handle(ev('up', tile(4), 100, 160, 100))).toEqual([{ type: 'swap', a: 3, b: 4 }]);
  });

  it('slipp på ikke-nabo eller utenfor gir ingenting', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 130, 100, 40));
    expect(m.handle(ev('up', tile(5), 300, 100, 100))).toEqual([]);
    m.handle(ev('down', tile(2), 100, 100, 200));
    m.handle(ev('move', tile(2), 130, 100, 240));
    expect(m.handle(ev('up', none, 300, 300, 300))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('slipp på hånden gir remove når fjern er tilgjengelig', () => {
    const m = machine({ remove: true });
    m.handle(ev('down', tile(1), 100, 100, 0));
    m.handle(ev('move', tile(1), 100, 140, 40));
    expect(m.handle(ev('up', hand('remove'), 100, 400, 100))).toEqual([{ type: 'remove', index: 1 }]);
  });

  it('slipp på hånden uten fjern gir hint', () => {
    const m = machine({ remove: false });
    m.handle(ev('down', tile(1), 100, 100, 0));
    m.handle(ev('move', tile(1), 100, 140, 40));
    expect(m.handle(ev('up', hand('remove'), 100, 400, 100))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });

  it('låst brikke kan ikke startes', () => {
    const m = machine({ locked: [2] });
    expect(m.handle(ev('down', tile(2), 0, 0, 0))).toEqual([{ type: 'hint', reason: 'locked' }]);
    expect(m.state.name).toBe('idle');
  });
});

describe('hold og segment', () => {
  it('hold 250 ms uten bevegelse gir segment, drag utvider langs sekvens, slipp gir meny', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.tick(HOLD_MS);
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 2 });
    m.handle(ev('move', tile(3), 150, 100, 300));
    m.handle(ev('move', tile(4), 200, 100, 320));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 4 });
    m.handle(ev('move', tile(3), 150, 100, 340));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 3 });
    expect(m.handle(ev('up', tile(3), 150, 100, 360))).toEqual([]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 3 });
  });

  it('segment kan utvides bakover fra anker', () => {
    const m = machine();
    m.handle(ev('down', tile(4), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(3), 0, 0, 300));
    m.handle(ev('move', tile(2), 0, 0, 310));
    expect(m.state).toEqual({ name: 'segment', anchor: 4, end: 2 });
    m.handle(ev('up', tile(2), 0, 0, 320));
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 4 });
  });

  it('hopp over ikke-nabo og låst brikke ignoreres', () => {
    const m = machine({ locked: [4] });
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(5), 0, 0, 300));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 2 });
    m.handle(ev('move', tile(3), 0, 0, 310));
    m.handle(ev('move', tile(4), 0, 0, 320));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 3 });
  });

  it('hold uten utvidelse slippes tilbake til idle', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('up', tile(2), 0, 0, 300));
    expect(m.state.name).toBe('idle');
  });

  it('meny: valg gir segment-intent, trykk utenfor avbryter, speil på 2 gir hint', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(3), 0, 0, 300));
    m.handle(ev('up', tile(3), 0, 0, 320));
    expect(m.handle(ev('down', menu('mirror'), 0, 0, 400))).toEqual([{ type: 'hint', reason: 'segmentTooShort' }]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 3 });
    expect(m.handle(ev('down', menu('rotateRight'), 0, 0, 420))).toEqual([{ type: 'segment', from: 2, to: 3, action: 'rotateRight' }]);
    expect(m.state.name).toBe('idle');

    m.handle(ev('down', tile(1), 0, 0, 500));
    m.tick(500 + HOLD_MS);
    m.handle(ev('move', tile(2), 0, 0, 800));
    m.handle(ev('up', tile(2), 0, 0, 820));
    expect(m.handle(ev('down', none, 0, 0, 900))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('bevegelse over terskel før hold gir drag, ikke segment', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 120, 100, 100));
    m.tick(HOLD_MS + 10);
    expect(m.state.name).toBe('dragTile');
  });
});

describe('trykkalternativ', () => {
  it('trykk velger, trykk nabo gir swap', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    expect(m.handle(ev('up', tile(2), 0, 0, 80))).toEqual([]);
    expect(m.state).toEqual({ name: 'selected', index: 2 });
    expect(m.handle(ev('down', tile(1), 0, 0, 200))).toEqual([{ type: 'swap', a: 2, b: 1 }]);
    expect(m.state.name).toBe('idle');
  });

  it('trykk samme brikke avvelger', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.handle(ev('up', tile(2), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('trykk annen brikke gir segment-meny i sekvensrekkefølge', () => {
    const m = machine();
    m.handle(ev('down', tile(5), 0, 0, 0));
    m.handle(ev('up', tile(5), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 5 });
  });

  it('trykk-segment med låst brikke i mellom gir hint', () => {
    const m = machine({ locked: [3] });
    m.handle(ev('down', tile(5), 0, 0, 0));
    m.handle(ev('up', tile(5), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([{ type: 'hint', reason: 'segmentContainsLocked' }]);
    expect(m.state.name).toBe('idle');
  });

  it('valgt brikke og trykk på fjern i hånden gir remove', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.handle(ev('up', tile(2), 0, 0, 80));
    expect(m.handle(ev('down', hand('remove'), 0, 0, 200))).toEqual([{ type: 'remove', index: 2 }]);
  });

  it('trykk joker i hånden så mellomrom gir insertWild', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 0, 0));
    m.handle(ev('up', hand('wild'), 0, 0, 80));
    expect(m.state.name).toBe('wildArmed');
    expect(m.handle(ev('down', gap(3), 0, 0, 200))).toEqual([{ type: 'insertWild', at: 3 }]);
    expect(m.state.name).toBe('idle');
  });

  it('joker uten hånd gir hint', () => {
    const m = machine({ wild: false });
    expect(m.handle(ev('down', hand('wild'), 0, 0, 0))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });
});

describe('drag joker', () => {
  it('dra joker fra hånd til mellomrom gir insertWild', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 300, 0));
    m.handle(ev('move', none, 0, 200, 40));
    expect(m.state.name).toBe('dragWild');
    expect(m.handle(ev('up', gap(0), 0, 100, 100))).toEqual([{ type: 'insertWild', at: 0 }]);
  });
  it('slipp utenfor mellomrom gir ingenting', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 300, 0));
    m.handle(ev('move', none, 0, 200, 40));
    expect(m.handle(ev('up', tile(2), 0, 100, 100))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });
});

describe('cancel', () => {
  it('cancel går alltid til idle', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('cancel', none, 0, 0, 300));
    expect(m.state.name).toBe('idle');
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../gestures'`.

- [ ] **Step 3: Implementer gestures.ts**

```ts
export const DRAG_THRESHOLD = 12;
export const HOLD_MS = 250;

export type SegmentAction = 'rotateLeft' | 'mirror' | 'rotateRight';

export type Target =
  | { readonly kind: 'tile'; readonly index: number }
  | { readonly kind: 'gap'; readonly at: number }
  | { readonly kind: 'hand'; readonly item: 'wild' | 'remove' }
  | { readonly kind: 'menu'; readonly action: SegmentAction }
  | { readonly kind: 'none' };

export interface PointerEvt {
  readonly type: 'down' | 'move' | 'up' | 'cancel';
  readonly x: number;
  readonly y: number;
  readonly t: number;
  readonly target: Target;
}

export type HintReason = 'locked' | 'segmentContainsLocked' | 'segmentTooShort' | 'handEmpty';

export type Intent =
  | { readonly type: 'swap'; readonly a: number; readonly b: number }
  | { readonly type: 'remove'; readonly index: number }
  | { readonly type: 'insertWild'; readonly at: number }
  | { readonly type: 'segment'; readonly from: number; readonly to: number; readonly action: SegmentAction }
  | { readonly type: 'hint'; readonly reason: HintReason };

export type GestureState =
  | { readonly name: 'idle' }
  | { readonly name: 'pending'; readonly index: number; readonly x: number; readonly y: number; readonly t: number }
  | { readonly name: 'dragTile'; readonly index: number; readonly x: number; readonly y: number }
  | { readonly name: 'segment'; readonly anchor: number; readonly end: number }
  | { readonly name: 'menu'; readonly from: number; readonly to: number }
  | { readonly name: 'selected'; readonly index: number }
  | { readonly name: 'dragWild'; readonly x: number; readonly y: number }
  | { readonly name: 'wildArmed' };

export interface GestureEnv {
  count(): number;
  isLocked(index: number): boolean;
  hasWild(): boolean;
  canRemove(): boolean;
}

const IDLE: GestureState = { name: 'idle' };
const hint = (reason: HintReason): Intent => ({ type: 'hint', reason });
const adjacent = (a: number, b: number): boolean => Math.abs(a - b) === 1;

/**
 * Oversetter pekerhendelser til intensjoner. Kjenner ikke geometri: scenen løser
 * Target fra layout-treff. Naboskap og segmenter er alltid i sekvensrekkefølge.
 */
export class GestureMachine {
  state: GestureState = IDLE;

  constructor(private readonly env: GestureEnv) {}

  reset(): void {
    this.state = IDLE;
  }

  /** Kalles hver frame med nåtid, så hold kan oppdages uten bevegelse. */
  tick(t: number): void {
    const s = this.state;
    if (s.name === 'pending' && t - s.t >= HOLD_MS) {
      this.state = { name: 'segment', anchor: s.index, end: s.index };
    }
  }

  handle(evt: PointerEvt): Intent[] {
    if (evt.type === 'cancel') {
      this.state = IDLE;
      return [];
    }
    switch (this.state.name) {
      case 'idle':
        return this.fromIdle(evt);
      case 'pending':
        return this.fromPending(evt, this.state);
      case 'dragTile':
        return this.fromDragTile(evt, this.state);
      case 'segment':
        return this.fromSegment(evt, this.state);
      case 'menu':
        return this.fromMenu(evt, this.state);
      case 'selected':
        return this.fromSelected(evt, this.state);
      case 'dragWild':
        return this.fromDragWild(evt);
      case 'wildArmed':
        return this.fromWildArmed(evt);
    }
  }

  private segmentHasLocked(from: number, to: number): boolean {
    for (let i = from; i <= to; i++) if (this.env.isLocked(i)) return true;
    return false;
  }

  private fromIdle(evt: PointerEvt): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    if (t.kind === 'tile') {
      if (this.env.isLocked(t.index)) return [hint('locked')];
      this.state = { name: 'pending', index: t.index, x: evt.x, y: evt.y, t: evt.t };
      return [];
    }
    if (t.kind === 'hand' && t.item === 'wild') {
      if (!this.env.hasWild()) return [hint('handEmpty')];
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    return [];
  }

  private fromPending(evt: PointerEvt, s: Extract<GestureState, { name: 'pending' }>): Intent[] {
    if (evt.type === 'move') {
      if (evt.t - s.t >= HOLD_MS) {
        const seg: Extract<GestureState, { name: 'segment' }> = { name: 'segment', anchor: s.index, end: s.index };
        this.state = seg;
        return this.fromSegment(evt, seg);
      }
      if (Math.hypot(evt.x - s.x, evt.y - s.y) > DRAG_THRESHOLD) {
        this.state = { name: 'dragTile', index: s.index, x: evt.x, y: evt.y };
      }
      return [];
    }
    if (evt.type === 'up') {
      this.state = evt.t - s.t >= HOLD_MS ? IDLE : { name: 'selected', index: s.index };
      return [];
    }
    return [];
  }

  private fromDragTile(evt: PointerEvt, s: Extract<GestureState, { name: 'dragTile' }>): Intent[] {
    if (evt.type === 'move') {
      this.state = { ...s, x: evt.x, y: evt.y };
      return [];
    }
    if (evt.type === 'up') {
      this.state = IDLE;
      const t = evt.target;
      if (t.kind === 'tile' && adjacent(s.index, t.index)) return [{ type: 'swap', a: s.index, b: t.index }];
      if (t.kind === 'hand' && t.item === 'remove') {
        return this.env.canRemove() ? [{ type: 'remove', index: s.index }] : [hint('handEmpty')];
      }
      return [];
    }
    return [];
  }

  private fromSegment(evt: PointerEvt, s: Extract<GestureState, { name: 'segment' }>): Intent[] {
    if (evt.type === 'move') {
      const t = evt.target;
      if (t.kind === 'tile' && adjacent(t.index, s.end) && !this.env.isLocked(t.index)) {
        this.state = { name: 'segment', anchor: s.anchor, end: t.index };
      }
      return [];
    }
    if (evt.type === 'up') {
      if (s.anchor === s.end) {
        this.state = IDLE;
        return [];
      }
      this.state = { name: 'menu', from: Math.min(s.anchor, s.end), to: Math.max(s.anchor, s.end) };
      return [];
    }
    return [];
  }

  private fromMenu(evt: PointerEvt, s: Extract<GestureState, { name: 'menu' }>): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    if (t.kind === 'menu') {
      if (t.action === 'mirror' && s.to - s.from + 1 < 3) return [hint('segmentTooShort')];
      this.state = IDLE;
      return [{ type: 'segment', from: s.from, to: s.to, action: t.action }];
    }
    this.state = IDLE;
    return [];
  }

  private fromSelected(evt: PointerEvt, s: Extract<GestureState, { name: 'selected' }>): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    this.state = IDLE;
    if (t.kind === 'tile') {
      if (t.index === s.index) return [];
      if (adjacent(s.index, t.index)) {
        if (this.env.isLocked(t.index)) return [hint('locked')];
        return [{ type: 'swap', a: s.index, b: t.index }];
      }
      const from = Math.min(s.index, t.index);
      const to = Math.max(s.index, t.index);
      if (this.segmentHasLocked(from, to)) return [hint('segmentContainsLocked')];
      this.state = { name: 'menu', from, to };
      return [];
    }
    if (t.kind === 'hand' && t.item === 'remove') {
      return this.env.canRemove() ? [{ type: 'remove', index: s.index }] : [hint('handEmpty')];
    }
    if (t.kind === 'hand' && t.item === 'wild') {
      if (!this.env.hasWild()) return [hint('handEmpty')];
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    return [];
  }

  private fromDragWild(evt: PointerEvt): Intent[] {
    if (evt.type === 'move') {
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    if (evt.type === 'up') {
      const t = evt.target;
      if (t.kind === 'hand' && t.item === 'wild') {
        this.state = { name: 'wildArmed' };
        return [];
      }
      this.state = IDLE;
      if (t.kind === 'gap') return [{ type: 'insertWild', at: t.at }];
      return [];
    }
    return [];
  }

  private fromWildArmed(evt: PointerEvt): Intent[] {
    if (evt.type !== 'down') return [];
    this.state = IDLE;
    const t = evt.target;
    if (t.kind === 'gap') return [{ type: 'insertWild', at: t.at }];
    return [];
  }
}
```

- [ ] **Step 4: Kjør test, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS. Alle varianter av `GestureState` er dekket i `switch`, så `noImplicitReturns` er tilfreds uten `default`. `env.count()` brukes ikke ennå av maskinen; den er del av grensesnittet for plan 2b (tastaturmarkør) og gir ingen lint-feil siden det er et interface-medlem.

- [ ] **Step 5: Commit**

Legg til `src/game/gestures.ts` og `src/game/__tests__/gestures.test.ts`. Melding: `feat(game): gesture state machine for drag, hold and tap`.

---

### Task 4: Brettsesjon med løser-status og blindgate

**Files:**
- Modify: `src/core/solver.ts` (`SolveResult` får `cancelled`)
- Modify: `src/core/solverClient.ts` (`cancelAll` resolver med `cancelled`)
- Modify: `src/core/__tests__/solverClient.test.ts` (forventning oppdateres)
- Create: `src/game/session.ts`
- Test: `src/game/__tests__/session.test.ts`

**Interfaces:**
- Consumes: `apply`, `createBoard`, `BoardState`, `Command`, `Rules`, `isPalindrome`, `starsFor`, `SolveRequest`, `SolveResult`, `Hand`, `Tile`.
- Produces:
  - `SolveResult` får varianten `{ status: 'cancelled' }` (kjerneendring; BFS returnerer den aldri).
  - `interface SolverPort { solve(req: SolveRequest): Promise<SolveResult>; cancelAll(): void }`
  - `type SolveStatus = { kind: 'idle' } | { kind: 'pending' } | { kind: 'known'; moves: number } | { kind: 'deadEnd' } | { kind: 'unknown' }`
  - `interface SessionView { readonly tiles; readonly hand; readonly movesUsed; readonly budgetLeft; readonly canUndo; readonly solved; readonly stars: Stars; readonly solveStatus: SolveStatus }`
  - `interface SessionOptions { readonly rules; readonly tiles; readonly hand; readonly target; readonly budget; readonly solver: SolverPort; readonly solverStates?: number; readonly onChange: (view: SessionView) => void }`
  - `CLIENT_SOLVER_STATES = 50000`
  - `class BoardSession { constructor(opts); readonly state: BoardState; dispatch(cmd: Command): Result<BoardState, RejectReason>; view(): SessionView; dispose(): void }`
  - Regler: etter hvert godtatte trekk kalles `onChange` med ny view. Er brettet palindrom → `solved`, løser avbrytes, stjerner beregnes. Ellers, hvis `budgetLeft <= 0` → `deadEnd` uten løser. Ellers sendes løser med `maxMoves = budgetLeft`; `solved` → `known`, `unreachableWithinBudget` → `deadEnd`, `unknown` → `unknown`, `cancelled` → ignoreres. Svar på utdaterte forespørsler ignoreres (sekvensnummer). Løser kalles også ved oppstart.

- [ ] **Step 1: Kjerneendring for `cancelled`**

I `src/core/solver.ts`, utvid unionen:

```ts
export type SolveResult =
  | { readonly status: 'solved'; readonly moves: number }
  | { readonly status: 'unreachableWithinBudget' }
  | { readonly status: 'unknown' }
  | { readonly status: 'cancelled' };
```

I `src/core/solverClient.ts`, i `cancelAll`, bytt `resolve({ status: 'unknown' })` med `resolve({ status: 'cancelled' })`.

I `src/core/__tests__/solverClient.test.ts`, bytt forventningen for det første løftet fra `{ status: 'unknown' }` til `{ status: 'cancelled' }`.

Run: `npm test`
Expected: PASS (ingen andre steder bruker unionen uttømmende).

- [ ] **Step 2: Skriv failing test**

`src/game/__tests__/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../../core/rules';
import type { SolveRequest, SolveResult } from '../../core/solver';
import { tilesFromString, symbolKey } from '../../core/tiles';
import type { SessionView, SolverPort } from '../session';
import { BoardSession, CLIENT_SOLVER_STATES } from '../session';

/** Løser som besvares manuelt, i rekkefølge. */
const fakeSolver = (): SolverPort & { requests: SolveRequest[]; answer: (i: number, r: SolveResult) => void; cancelled: number } => {
  const resolvers: Array<(r: SolveResult) => void> = [];
  const port = {
    requests: [] as SolveRequest[],
    cancelled: 0,
    solve(req: SolveRequest): Promise<SolveResult> {
      port.requests.push(req);
      return new Promise<SolveResult>((resolve) => {
        resolvers.push(resolve);
      });
    },
    cancelAll(): void {
      port.cancelled++;
    },
    answer(i: number, r: SolveResult): void {
      resolvers[i]?.(r);
    },
  };
  return port;
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const session = (s: string, opts: Partial<{ target: number; budget: number; hand: { wild: number; remove: number } }> = {}) => {
  const solver = fakeSolver();
  const views: SessionView[] = [];
  const sess = new BoardSession({
    rules: makeRules(ALL_OPS),
    tiles: tilesFromString(s),
    hand: opts.hand ?? { wild: 0, remove: 0 },
    target: opts.target ?? 1,
    budget: opts.budget ?? 5,
    solver,
    onChange: (v) => views.push(v),
  });
  return { sess, solver, views };
};

describe('BoardSession', () => {
  it('starter med løserforespørsel med maxMoves = budsjett og 50 000 tilstander', () => {
    const { sess, solver } = session('AAB', { budget: 5 });
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
    expect(solver.requests).toHaveLength(1);
    expect(solver.requests[0]?.maxMoves).toBe(5);
    expect(solver.requests[0]?.limits).toEqual({ states: CLIENT_SOLVER_STATES });
  });

  it('godtatt trekk oppdaterer view og sender ny forespørsel', async () => {
    const { sess, solver, views } = session('ABCD');
    const r = sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    expect(symbolKey(sess.view().tiles)).toBe('BACD');
    expect(sess.view().movesUsed).toBe(1);
    expect(sess.view().budgetLeft).toBe(4);
    expect(sess.view().canUndo).toBe(true);
    expect(views.at(-1)?.solveStatus).toEqual({ kind: 'pending' });
    expect(solver.requests).toHaveLength(2);
    expect(solver.requests[1]?.maxMoves).toBe(4);
    solver.answer(1, { status: 'solved', moves: 2 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'known', moves: 2 });
  });

  it('avvist trekk endrer ingenting og sender ingen forespørsel', () => {
    const { sess, solver, views } = session('ABCD');
    const before = views.length;
    const r = sess.dispatch({ type: 'swap', a: 0, b: 2 });
    expect(r.ok).toBe(false);
    expect(views).toHaveLength(before);
    expect(solver.requests).toHaveLength(1);
  });

  it('løsning gir solved, stjerner og avbryter løser', () => {
    const { sess, solver } = session('AAB', { target: 1, budget: 5 });
    sess.dispatch({ type: 'swap', a: 1, b: 2 });
    const v = sess.view();
    expect(v.solved).toBe(true);
    expect(v.stars).toBe(3);
    expect(v.solveStatus).toEqual({ kind: 'idle' });
    expect(solver.cancelled).toBeGreaterThanOrEqual(1);
    expect(solver.requests).toHaveLength(1);
  });

  it('stjerner følger mål og budsjett', () => {
    const { sess } = session('AAB', { target: 1, budget: 6 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    sess.dispatch({ type: 'swap', a: 1, b: 2 });
    expect(sess.view().movesUsed).toBe(3);
    expect(sess.view().stars).toBe(2);
  });

  it('tomt budsjett uten løsning gir deadEnd uten løser', () => {
    const { sess, solver } = session('ABCD', { budget: 1 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(sess.view().budgetLeft).toBe(0);
    expect(sess.view().solveStatus).toEqual({ kind: 'deadEnd' });
    expect(solver.requests).toHaveLength(1);
  });

  it('løser-svar mappes: unreachable → deadEnd, unknown → unknown, cancelled ignoreres', async () => {
    const { sess, solver } = session('ABCD');
    solver.answer(0, { status: 'unreachableWithinBudget' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'deadEnd' });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(1, { status: 'unknown' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'unknown' });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(2, { status: 'cancelled' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
  });

  it('utdatert løser-svar ignoreres', async () => {
    const { sess, solver } = session('ABCD');
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(0, { status: 'solved', moves: 1 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
    solver.answer(1, { status: 'solved', moves: 3 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'known', moves: 3 });
  });

  it('undo og reset går gjennom dispatch og oppdaterer view', () => {
    const { sess } = session('ABCD');
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(sess.dispatch({ type: 'undo' }).ok).toBe(true);
    expect(symbolKey(sess.view().tiles)).toBe('ABCD');
    expect(sess.view().canUndo).toBe(false);
    sess.dispatch({ type: 'swap', a: 2, b: 3 });
    sess.dispatch({ type: 'reset' });
    expect(symbolKey(sess.view().tiles)).toBe('ABCD');
    expect(sess.view().movesUsed).toBe(0);
  });

  it('dispose avbryter løser og stopper onChange', async () => {
    const { sess, solver, views } = session('ABCD');
    sess.dispose();
    const n = views.length;
    solver.answer(0, { status: 'solved', moves: 1 });
    await flush();
    expect(views).toHaveLength(n);
  });
});
```

- [ ] **Step 3: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../session'`.

- [ ] **Step 4: Implementer session.ts**

```ts
import type { BoardState } from '../core/board';
import { apply, createBoard } from '../core/board';
import type { Command, RejectReason, Result } from '../core/commands';
import { isPalindrome } from '../core/palindrome';
import type { Rules } from '../core/rules';
import type { Stars } from '../core/scoring';
import { starsFor } from '../core/scoring';
import type { SolveRequest, SolveResult } from '../core/solver';
import type { Hand, Tile } from '../core/tiles';

export const CLIENT_SOLVER_STATES = 50000;

export interface SolverPort {
  solve(req: SolveRequest): Promise<SolveResult>;
  cancelAll(): void;
}

export type SolveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'known'; readonly moves: number }
  | { readonly kind: 'deadEnd' }
  | { readonly kind: 'unknown' };

export interface SessionView {
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly movesUsed: number;
  readonly budgetLeft: number;
  readonly canUndo: boolean;
  readonly solved: boolean;
  readonly stars: Stars;
  readonly solveStatus: SolveStatus;
}

export interface SessionOptions {
  readonly rules: Rules;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly target: number;
  readonly budget: number;
  readonly solver: SolverPort;
  readonly solverStates?: number;
  readonly onChange: (view: SessionView) => void;
}

/**
 * Kjører ett brett: regler via apply, løser-status etter hvert trekk, stjerner ved løsning.
 * Vet ingenting om modus eller Phaser.
 */
export class BoardSession {
  private current: BoardState;
  private solveStatus: SolveStatus = { kind: 'idle' };
  private requestSeq = 0;
  private disposed = false;

  constructor(private readonly opts: SessionOptions) {
    this.current = createBoard(opts.tiles, opts.hand);
    this.afterChange();
  }

  get state(): BoardState {
    return this.current;
  }

  dispatch(cmd: Command): Result<BoardState, RejectReason> {
    const r = apply(this.opts.rules, this.current, cmd);
    if (!r.ok) return r;
    this.current = r.value;
    this.afterChange();
    return r;
  }

  view(): SessionView {
    const solved = isPalindrome(this.current.tiles);
    const budgetLeft = this.opts.budget - this.current.movesUsed;
    return {
      tiles: this.current.tiles,
      hand: this.current.hand,
      movesUsed: this.current.movesUsed,
      budgetLeft,
      canUndo: this.current.history.length > 0,
      solved,
      stars: solved ? starsFor(this.current.movesUsed, this.opts.target, this.opts.budget) : 0,
      solveStatus: this.solveStatus,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.opts.solver.cancelAll();
  }

  private emit(): void {
    if (!this.disposed) this.opts.onChange(this.view());
  }

  private afterChange(): void {
    const seq = ++this.requestSeq;
    if (isPalindrome(this.current.tiles)) {
      this.solveStatus = { kind: 'idle' };
      this.opts.solver.cancelAll();
      this.emit();
      return;
    }
    const budgetLeft = this.opts.budget - this.current.movesUsed;
    if (budgetLeft <= 0) {
      this.solveStatus = { kind: 'deadEnd' };
      this.opts.solver.cancelAll();
      this.emit();
      return;
    }
    this.solveStatus = { kind: 'pending' };
    this.emit();
    void this.opts.solver
      .solve({
        rules: this.opts.rules,
        tiles: this.current.tiles,
        hand: this.current.hand,
        maxMoves: budgetLeft,
        limits: { states: this.opts.solverStates ?? CLIENT_SOLVER_STATES },
      })
      .then((res) => this.onSolveResult(seq, res));
  }

  private onSolveResult(seq: number, res: SolveResult): void {
    if (this.disposed || seq !== this.requestSeq || res.status === 'cancelled') return;
    switch (res.status) {
      case 'solved':
        this.solveStatus = { kind: 'known', moves: res.moves };
        break;
      case 'unreachableWithinBudget':
        this.solveStatus = { kind: 'deadEnd' };
        break;
      case 'unknown':
        this.solveStatus = { kind: 'unknown' };
        break;
    }
    this.emit();
  }
}
```

- [ ] **Step 5: Kjør test, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS. Testen «løser-svar mappes» forventer `pending` etter `cancelled`, fordi sesjonen ignorerer svaret og fortsatt venter på det gjeldende.

- [ ] **Step 6: Commit**

Legg til `src/core/solver.ts`, `src/core/solverClient.ts`, `src/core/__tests__/solverClient.test.ts`, `src/game/session.ts`, `src/game/__tests__/session.test.ts`. Melding: `feat(game): board session with solver status, dead-end and stars`.

---

### Task 5: Lagringsbutikk og kampanjemodus

**Files:**
- Create: `src/game/saveStore.ts`
- Create: `src/game/modes/types.ts`
- Create: `src/game/modes/campaign.ts`
- Test: `src/game/__tests__/saveStore.test.ts`
- Test: `src/game/__tests__/campaign.test.ts`

**Interfaces:**
- Consumes: `loadSave`, `persistSave`, `recordStars`, `starMap`, `SaveData`, `StorageLike`, `Settings`; `getCampaignLevel`, `CAMPAIGN`; `parseLevelId`, `nextLevelId`, `isLevelUnlocked`, `isWorldUnlocked`, `WORLD_COUNT`, `StarMap`; `rulesFor`; `starsFor`, `Stars`.
- Produces:
  - `class SaveStore { constructor(storage: StorageLike); readonly data: SaveData; stars(): StarMap; update(fn: (d: SaveData) => SaveData): void; setSettings(patch: Partial<Settings>): void }`
  - `interface ModeLevel { readonly id; readonly world; readonly n; readonly tiles; readonly hand; readonly rules: Rules; readonly target; readonly budget; readonly contentVersion }`
  - `interface SolvedOutcome { readonly stars: Stars; readonly previousStars: number; readonly nextLevelId: string | null; readonly nextUnlocked: boolean; readonly worldJustUnlocked: number | null }`
  - `interface BoardMode { readonly kind: 'campaign'; load(levelId): ModeLevel | null; isUnlocked(levelId): boolean; onSolved(levelId, movesUsed): SolvedOutcome }`
  - `class CampaignMode implements BoardMode { constructor(store: SaveStore) }`

- [ ] **Step 1: Skriv failing tests**

`src/game/__tests__/saveStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../core/storage';
import { SAVE_KEY } from '../../core/storage';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('SaveStore', () => {
  it('laster default og lagrer ved update', () => {
    const s = mem();
    const store = new SaveStore(s);
    expect(store.stars()).toEqual({});
    store.update((d) => ({ ...d, blitz: { best: 7 } }));
    expect(store.data.blitz.best).toBe(7);
    expect(JSON.parse(s.map.get(SAVE_KEY) ?? '{}')).toMatchObject({ blitz: { best: 7 } });
  });

  it('setSettings flettes og lagres', () => {
    const s = mem();
    const store = new SaveStore(s);
    store.setSettings({ reducedMotion: true });
    expect(store.data.settings).toEqual({ sound: true, music: true, reducedMotion: true, colorBlind: false });
    expect(new SaveStore(s).data.settings.reducedMotion).toBe(true);
  });
});
```

`src/game/__tests__/campaign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../content/campaign';
import { levelId, LEVELS_PER_WORLD, WORLD_GATE } from '../../core/progression';
import type { StorageLike } from '../../core/storage';
import { CampaignMode } from '../modes/campaign';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('CampaignMode', () => {
  it('laster nivå med regler, mål og budsjett fra kampanjen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const lvl = mode.load('w1-01');
    expect(lvl).not.toBeNull();
    if (lvl === null) return;
    const src = CAMPAIGN.levels[0]!;
    expect(lvl.world).toBe(1);
    expect(lvl.n).toBe(1);
    expect(lvl.target).toBe(src.target);
    expect(lvl.budget).toBe(src.budget);
    expect(lvl.rules.allowedOps.has('swap')).toBe(true);
    expect(lvl.contentVersion).toBe(CAMPAIGN.contentVersion);
    expect(mode.load('w9-01')).toBeNull();
  });

  it('isUnlocked følger progresjonen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    expect(mode.isUnlocked('w1-01')).toBe(true);
    expect(mode.isUnlocked('w1-02')).toBe(false);
    mode.onSolved('w1-01', 1);
    expect(mode.isUnlocked('w1-02')).toBe(true);
  });

  it('onSolved lagrer beste stjerner og gir neste nivå', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const first = mode.onSolved('w1-01', lvl.budget);
    expect(first.stars).toBe(1);
    expect(first.previousStars).toBe(0);
    expect(first.nextLevelId).toBe('w1-02');
    expect(first.nextUnlocked).toBe(true);
    expect(first.worldJustUnlocked).toBeNull();
    const second = mode.onSolved('w1-01', lvl.target);
    expect(second.stars).toBe(3);
    expect(second.previousStars).toBe(1);
    expect(store.stars()['w1-01']).toBe(3);
    const third = mode.onSolved('w1-01', lvl.budget);
    expect(store.stars()['w1-01']).toBe(3);
    expect(third.stars).toBe(1);
  });

  it('tolvte løste nivå i en verden låser opp neste verden', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    for (let n = 1; n < WORLD_GATE; n++) {
      const out = mode.onSolved(levelId(1, n), 1);
      expect(out.worldJustUnlocked).toBeNull();
    }
    const out = mode.onSolved(levelId(1, WORLD_GATE), 1);
    expect(out.worldJustUnlocked).toBe(2);
    expect(mode.isUnlocked('w2-01')).toBe(true);
    expect(mode.onSolved(levelId(1, WORLD_GATE + 1), 1).worldJustUnlocked).toBeNull();
  });

  it('siste nivå i verden 1 uten nok løste gir neste nivå låst', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const out = mode.onSolved(levelId(1, LEVELS_PER_WORLD), 1);
    expect(out.nextLevelId).toBe('w2-01');
    expect(out.nextUnlocked).toBe(false);
  });

  it('over budsjett gir 0 stjerner og lagrer ingenting', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const out = mode.onSolved('w1-01', lvl.budget + 1);
    expect(out.stars).toBe(0);
    expect(store.stars()['w1-01']).toBeUndefined();
    expect(out.nextUnlocked).toBe(false);
  });
});
```

- [ ] **Step 2: Kjør tester, se dem feile**

Run: `npm test`
Expected: FAIL, moduler mangler.

- [ ] **Step 3: Implementer saveStore.ts**

```ts
import type { StarMap } from '../core/progression';
import type { SaveData, Settings, StorageLike } from '../core/storage';
import { loadSave, persistSave, starMap } from '../core/storage';

/** Holder SaveData i minnet og skriver gjennom til storage ved hver endring. */
export class SaveStore {
  private current: SaveData;

  constructor(private readonly storage: StorageLike) {
    this.current = loadSave(storage);
  }

  get data(): SaveData {
    return this.current;
  }

  stars(): StarMap {
    return starMap(this.current);
  }

  update(fn: (d: SaveData) => SaveData): void {
    this.current = fn(this.current);
    persistSave(this.storage, this.current);
  }

  setSettings(patch: Partial<Settings>): void {
    this.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }
}
```

- [ ] **Step 4: Implementer modes/types.ts**

```ts
import type { Rules } from '../../core/rules';
import type { Stars } from '../../core/scoring';
import type { Hand, Tile } from '../../core/tiles';

export interface ModeLevel {
  readonly id: string;
  readonly world: number;
  readonly n: number;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly rules: Rules;
  readonly target: number;
  readonly budget: number;
  readonly contentVersion: number;
}

export interface SolvedOutcome {
  readonly stars: Stars;
  readonly previousStars: number;
  readonly nextLevelId: string | null;
  readonly nextUnlocked: boolean;
  readonly worldJustUnlocked: number | null;
}

/** Brettet vet ingenting om modus. Modusen leverer brett og avgjør hva som skjer ved løsning. */
export interface BoardMode {
  readonly kind: 'campaign';
  load(levelId: string): ModeLevel | null;
  isUnlocked(levelId: string): boolean;
  onSolved(levelId: string, movesUsed: number): SolvedOutcome;
}
```

- [ ] **Step 5: Implementer modes/campaign.ts**

```ts
import { CAMPAIGN, getCampaignLevel } from '../../content/campaign';
import { rulesFor } from '../../core/level';
import { isLevelUnlocked, isWorldUnlocked, nextLevelId, parseLevelId, WORLD_COUNT } from '../../core/progression';
import { starsFor } from '../../core/scoring';
import { recordStars } from '../../core/storage';
import type { SaveStore } from '../saveStore';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

export class CampaignMode implements BoardMode {
  readonly kind = 'campaign' as const;

  constructor(private readonly store: SaveStore) {}

  load(levelId: string): ModeLevel | null {
    const parsed = parseLevelId(levelId);
    const level = getCampaignLevel(levelId);
    if (parsed === null || level === undefined) return null;
    return {
      id: level.id,
      world: parsed.world,
      n: parsed.n,
      tiles: level.tiles,
      hand: level.hand,
      rules: rulesFor(level),
      target: level.target,
      budget: level.budget,
      contentVersion: CAMPAIGN.contentVersion,
    };
  }

  isUnlocked(levelId: string): boolean {
    return isLevelUnlocked(levelId, this.store.stars());
  }

  onSolved(levelId: string, movesUsed: number): SolvedOutcome {
    const level = getCampaignLevel(levelId);
    const parsed = parseLevelId(levelId);
    const previousStars = this.store.stars()[levelId] ?? 0;
    if (level === undefined || parsed === null) {
      return { stars: 0, previousStars, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
    }
    const stars = starsFor(movesUsed, level.target, level.budget);

    const unlockedBefore = this.unlockedWorlds();
    if (stars > 0) {
      this.store.update((d) => recordStars(d, levelId, stars, CAMPAIGN.contentVersion));
    }
    const unlockedAfter = this.unlockedWorlds();
    const worldJustUnlocked = unlockedAfter.find((w) => !unlockedBefore.includes(w)) ?? null;

    const next = nextLevelId(levelId);
    return {
      stars,
      previousStars,
      nextLevelId: next,
      nextUnlocked: next !== null && this.isUnlocked(next),
      worldJustUnlocked,
    };
  }

  private unlockedWorlds(): number[] {
    const stars = this.store.stars();
    const out: number[] = [];
    for (let w = 1; w <= WORLD_COUNT; w++) if (isWorldUnlocked(w, stars)) out.push(w);
    return out;
  }
}
```

- [ ] **Step 6: Kjør tester, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS.

- [ ] **Step 7: Commit**

Legg til `src/game/saveStore.ts`, `src/game/modes/types.ts`, `src/game/modes/campaign.ts`, `src/game/__tests__/saveStore.test.ts`, `src/game/__tests__/campaign.test.ts`. Melding: `feat(game): save store and campaign mode strategy`.

---

## Ferdig-kriterier for plan 2a

- `npm test`, `npm run typecheck` og `npm run lint:core` grønne på branch `redesign`.
- `grep -rn "from 'phaser'" src/theme src/game` gir ingen treff.
- `src/game/layout.ts`, `gestures.ts`, `session.ts`, `saveStore.ts`, `modes/campaign.ts` og `src/theme/theme.ts` finnes med testene sine.

## Utenfor denne planen (plan 2b)

- Phaser-scener: Boot (fonter via Google Fonts i `index.html` + `document.fonts`), Menu, WorldMap, Board, Result, Settings. `main.ts` med `Scale.RESIZE` og portrett-layout.
- Tegning av brikker, hånd, HUD, speillinje, segmentmeny og innsettingsplasser fra `BoardLayout`. Layoutskifte 6↔7 med låst input.
- Kobling `GestureMachine` ↔ Phaser pointer-events, `tick` fra `update`. Tastaturkontroller.
- Animasjoner og effekter (konfetti, speilbølge, stjernefall, kamera-nudge, flash) mot tema-tokens og `reducedMotion`. Lyd fra `src/utils/audio.ts`.
- Solver-worker instansiert via Vite `?worker` og `SolverClient` som `SolverPort`.
- Visning av «ingen vei videre» ved `deadEnd`, «mål ukjent» ved `unknown`, stjerner ved løsning, verdensopplåsing.
- Playwright-røyktest ved 390×844.

## Etterslep og notater til plan 2b (fra sluttreview av 2a)

**API-notater scene-forfatteren må vite**
- `hitGap` dekker hele brettet: et punkt i et brikkesenter treffer alltid et gap. Kall `hitGap` bare mens en joker dras eller er armert, aldri som generell fallback. Ved folden på partallsbrett er brikkesenteret et eksakt uavgjort mellom foldgapet og nabogapet; laveste `at` vinner.
- Én `SolverClient` per sesjon. Klienten holder én utestående forespørsel; deles den, blir den første avbrutt og står i `pending` uten retry.
- Ingenting låser input. Sesjonen godtar trekk ved `budgetLeft <= 0` (0 stjerner er et bevisst utfall). Scenen må begrense til angre og reset ved `deadEnd`, og låse input under layoutskifte 6↔7.
- `tick` er stille: den flipper `pending` til `segment` uten å emitte. Scenen må lese `machine.state` hver frame for å tegne segmentmarkering.
- `TileSlot` har indeks, ikke brikke-id. Par `layout.slots[i]` med `view().tiles[i]` og regn om etter hver innsetting/fjerning.
- Segment-U over folden tegnes fra slot-lista; `BoardLayout` har ingen sti-hjelper.
- Tastatur (spec §2) er ikke bygget. Markør og shift-utvid må sameksistere med `selected` og `segment` i `GestureMachine`; avgjør eierskap før scene-input skrives. `GestureEnv.count()` er reservert til klamping av markøren.
- `HintReason` (4) og `RejectReason` (10) er to vokabularer; 2b trenger én meldingstabell.
- `COLORS.wild` og `COLORS.panel` er begge hvite; en joker er usynlig uten regnbuekanten.
- På odde hårnål står de to gapene rundt midtbrikken 44 px fra hverandre ved 84 px brikker, på grensen for touch-mål.
- `apply` gir `ok(state)` for reset på startbrettet, så sesjonen re-emitter og re-løser uten grunn.

**Fra plan 1, fortsatt åpne for 2b**
- Worker-chunk 2000 gir ~300 ms avbruddslatens på 13-brikkers brett.
- `solver.worker.ts` typesjekkes mot DOM, ikke WebWorker-lib.
- Bekreft 50 000-tilstandsbudsjettet på de lengste brettene.
- `Level.solution` vises aldri som fasit.

**Til plan 3**
- `onSolved` skriver til storage også når beste stjerner er uendret; sammen med `recordStars` som adopterer eldre `contentVersion`.
