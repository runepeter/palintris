# Palintris kjerne – implementasjonsplan (plan 1 av 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygge den rene, testede spillkjernen for Palintris: brikker, regler, kommandoer, angre, løser, generator, nivåoppskrifter, scoring, progresjon, lagring og et offline-skript som fryser kampanjens 90 brett til JSON.

**Architecture:** Alt i `src/core` er ren TypeScript uten Phaser-import. Én funksjon `apply(rules, state, cmd)` er hele regelmotoren. Løseren er BFS over en søkenøkkel uten historikk. Generatoren lager brett baklengs fra et palindrom og validerer løsningen gjennom `apply`. Et Node-skript bruker samme kode til å produsere `src/content/campaign.v1.json`.

**Tech Stack:** TypeScript 5 (strict, `noUncheckedIndexedAccess`), Vite 5, vitest, fast-check, tsx. Node 26.

**Spec:** `docs/superpowers/specs/2026-09-07-palintris-redesign-design.md` (§1, §3 Kampanje/Lagring, §5 Testing). Plan 2 dekker brett og interaksjon (§2, §4). Plan 3 dekker Daily, Blitz, opprydding, CI og signaturnivåer.

## Global Constraints

- `src/core` importerer aldri fra `phaser`, `src/scenes`, `src/ui`, `src/game`.
- `minLength = 3`, `maxLength = 14`.
- Avvisningsårsaker: `notAllowed | locked | notAdjacent | segmentTooShort | segmentContainsLocked | handEmpty | minLength | maxLength | nothingToUndo | outOfRange`.
- Løser-status: `solved | unreachableWithinBudget | unknown`. `limits.states` er alltid satt; `limits.ms` brukes aldri der resultatet må være deterministisk.
- Stjerner: 3 for `movesUsed ≤ mål`, 2 for `≤ mål + 2`, 1 for løst innen budsjett. Budsjett = mål + slakk, slakk ≥ 4.
- Nivå-ID: `w{verden}-{nr}` med to siffer, f.eks. `w3-07`. Seks verdener à 15 nivåer. Neste verden åpnes ved 12 av 15 løst.
- Lagringsnøkkel `palintris.save.v1`. Migrasjon tar med `soundEnabled`, `musicEnabled`, `colorBlindMode`, og `particlesEnabled` invertert til `reducedMotion`.
- Alle tester kjøres med `npm test` (vitest run). Typecheck med `npm run typecheck`. Begge må være grønne før hver commit.
- Tester ligger i `src/core/__tests__/` og `src/content/__tests__/` og heter `*.test.ts`.
- Ingen push. Commit lokalt på branch `redesign`.
- Teststreng-konvensjon for brikker: `tilesFromString('AB*c')` gir A og B som vanlige brikker, `*` som joker, liten bokstav som låst brikke med symbol `C`.

---

### Task 0: Branch, tag og testoppsett

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/core/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test`, `npm run test:watch`, `npm run build:campaign` (script legges til nå, fila kommer i Task 14).

- [ ] **Step 1: Tag legacy og lag branch**

```bash
git tag v1-legacy main
git checkout -b redesign main
```

- [ ] **Step 2: Installer testverktøy**

```bash
npm install --save-dev vitest@^2 fast-check@^3 tsx@^4
```

- [ ] **Step 3: Legg til scripts i package.json**

Erstatt `"scripts"`-blokken med:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext .ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "build:campaign": "tsx scripts/build-campaign.ts"
}
```

- [ ] **Step 4: Opprett vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Skriv røyktest**

`src/core/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('testoppsett', () => {
  it('kjører', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Kjør test og typecheck**

Run: `npm test && npm run typecheck`
Expected: `1 passed`, ingen typefeil.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/core/__tests__/smoke.test.ts
git commit -m "chore: add vitest, fast-check and tsx; start redesign branch"
```

---

### Task 1: Brikker og palindrom-sjekk

**Files:**
- Create: `src/core/tiles.ts`
- Create: `src/core/palindrome.ts`
- Test: `src/core/__tests__/tiles.test.ts`
- Test: `src/core/__tests__/palindrome.test.ts`

**Interfaces:**
- Produces:
  - `interface Tile { readonly id: number; readonly symbol: string; readonly locked: boolean; readonly wild: boolean }`
  - `interface Hand { readonly wild: number; readonly remove: number }`
  - `interface Snapshot { readonly tiles: readonly Tile[]; readonly hand: Hand; readonly movesUsed: number; readonly nextId: number }`
  - `makeTile(id: number, symbol: string, opts?: { locked?: boolean; wild?: boolean }): Tile`
  - `tilesFromString(s: string): Tile[]`
  - `symbolKey(tiles: readonly Tile[]): string`
  - `makeSnapshot(tiles: readonly Tile[], hand: Hand): Snapshot`
  - `WILD_SYMBOL = '*'`
  - `matches(a: Tile, b: Tile): boolean`
  - `isPalindrome(tiles: readonly Tile[]): boolean`
  - `mismatchCount(tiles: readonly Tile[]): number`

- [ ] **Step 1: Skriv failing tests**

`src/core/__tests__/tiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeSnapshot, makeTile, symbolKey, tilesFromString, WILD_SYMBOL } from '../tiles';

describe('tilesFromString', () => {
  it('lager vanlige, låste og joker-brikker med stigende id', () => {
    const tiles = tilesFromString('AB*c');
    expect(tiles.map((t) => t.id)).toEqual([0, 1, 2, 3]);
    expect(tiles.map((t) => t.symbol)).toEqual(['A', 'B', WILD_SYMBOL, 'C']);
    expect(tiles.map((t) => t.locked)).toEqual([false, false, false, true]);
    expect(tiles.map((t) => t.wild)).toEqual([false, false, true, false]);
  });
});

describe('symbolKey', () => {
  it('er invers av tilesFromString', () => {
    expect(symbolKey(tilesFromString('AB*c'))).toBe('AB*c');
  });
});

describe('makeTile', () => {
  it('joker får alltid symbolet *', () => {
    expect(makeTile(7, 'Q', { wild: true }).symbol).toBe(WILD_SYMBOL);
  });
});

describe('makeSnapshot', () => {
  it('setter nextId til høyeste id pluss én og movesUsed til 0', () => {
    const snap = makeSnapshot(tilesFromString('ABC'), { wild: 1, remove: 0 });
    expect(snap.nextId).toBe(3);
    expect(snap.movesUsed).toBe(0);
    expect(snap.hand).toEqual({ wild: 1, remove: 0 });
  });
});
```

`src/core/__tests__/palindrome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isPalindrome, matches, mismatchCount } from '../palindrome';
import { tilesFromString } from '../tiles';

describe('isPalindrome', () => {
  it.each([
    ['ABA', true],
    ['ABBA', true],
    ['ABC', false],
    ['*BA', true],
    ['AB*A', true],
    ['A*C', false],
    ['*BC*', false],
    ['aba', true],
    ['abc', false],
  ])('%s -> %s', (s, expected) => {
    expect(isPalindrome(tilesFromString(s))).toBe(expected);
  });
});

describe('matches', () => {
  it('joker matcher alt, låst matcher på symbol', () => {
    const [a, star, c] = tilesFromString('A*c');
    expect(matches(a!, star!)).toBe(true);
    expect(matches(star!, c!)).toBe(true);
    expect(matches(a!, c!)).toBe(false);
  });
});

describe('mismatchCount', () => {
  it('teller par som ikke matcher', () => {
    expect(mismatchCount(tilesFromString('ABCD'))).toBe(2);
    expect(mismatchCount(tilesFromString('ABCBA'))).toBe(0);
    expect(mismatchCount(tilesFromString('AB*BX'))).toBe(1);
  });
});
```

- [ ] **Step 2: Kjør testene og se dem feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../tiles'`.

- [ ] **Step 3: Implementer tiles.ts**

```ts
export const WILD_SYMBOL = '*';

export interface Tile {
  readonly id: number;
  readonly symbol: string;
  readonly locked: boolean;
  readonly wild: boolean;
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
  opts: { locked?: boolean; wild?: boolean } = {}
): Tile => {
  const wild = opts.wild === true;
  return {
    id,
    symbol: wild ? WILD_SYMBOL : symbol,
    locked: opts.locked === true,
    wild,
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
  tiles,
  hand,
  movesUsed: 0,
  nextId: tiles.reduce((max, t) => Math.max(max, t.id), -1) + 1,
});
```

- [ ] **Step 4: Implementer palindrome.ts**

```ts
import type { Tile } from './tiles';

export const matches = (a: Tile, b: Tile): boolean =>
  a.wild || b.wild || a.symbol === b.symbol;

export const mismatchCount = (tiles: readonly Tile[]): number => {
  let count = 0;
  const n = tiles.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const left = tiles[i];
    const right = tiles[n - 1 - i];
    if (left !== undefined && right !== undefined && !matches(left, right)) count++;
  }
  return count;
};

export const isPalindrome = (tiles: readonly Tile[]): boolean => mismatchCount(tiles) === 0;
```

- [ ] **Step 5: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/tiles.ts src/core/palindrome.ts src/core/__tests__/tiles.test.ts src/core/__tests__/palindrome.test.ts
git commit -m "feat(core): tiles, snapshot and palindrome check with wild support"
```

---

### Task 2: Regler, kommandoer og swap

**Files:**
- Create: `src/core/rules.ts`
- Create: `src/core/commands.ts`
- Create: `src/core/step.ts`
- Test: `src/core/__tests__/step.swap.test.ts`

**Interfaces:**
- Consumes: `Tile`, `Snapshot`, `tilesFromString`, `makeSnapshot` fra Task 1.
- Produces:
  - `type OpName = 'swap' | 'rotate' | 'mirror' | 'insertWild' | 'remove'`
  - `interface Rules { readonly allowedOps: ReadonlySet<OpName>; readonly minLength: number; readonly maxLength: number }`
  - `MIN_LENGTH = 3`, `MAX_LENGTH = 14`, `ALL_OPS: readonly OpName[]`
  - `makeRules(ops: readonly OpName[]): Rules`
  - `type Command` (union, se kode), `type MoveCommand = Exclude<Command, {type:'undo'}|{type:'reset'}>`
  - `type RejectReason`, `type Result<T, E>`, `ok(value)`, `reject(reason)`
  - `applyMove(rules: Rules, snap: Snapshot, cmd: MoveCommand): Result<Snapshot, RejectReason>`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/step.swap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['swap']);
const snap = (s: string) => makeSnapshot(tilesFromString(s), { wild: 0, remove: 0 });

describe('applyMove swap', () => {
  it('bytter naboer og teller trekk', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(symbolKey(r.value.tiles)).toBe('BAC');
      expect(r.value.movesUsed).toBe(1);
      expect(r.value.tiles.map((t) => t.id)).toEqual([1, 0, 2]);
    }
  });

  it('avviser ikke-naboer', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'swap', a: 0, b: 2 });
    expect(r).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('avviser utenfor rekkevidde', () => {
    expect(applyMove(rules, snap('ABC'), { type: 'swap', a: 2, b: 3 })).toEqual({ ok: false, reason: 'outOfRange' });
    expect(applyMove(rules, snap('ABC'), { type: 'swap', a: -1, b: 0 })).toEqual({ ok: false, reason: 'outOfRange' });
  });

  it('avviser låst brikke', () => {
    expect(applyMove(rules, snap('aBC'), { type: 'swap', a: 0, b: 1 })).toEqual({ ok: false, reason: 'locked' });
  });

  it('avviser operasjon som ikke er tillatt', () => {
    expect(applyMove(makeRules(['rotate']), snap('ABC'), { type: 'swap', a: 0, b: 1 })).toEqual({ ok: false, reason: 'notAllowed' });
  });

  it('muterer ikke inndata', () => {
    const before = snap('ABC');
    applyMove(rules, before, { type: 'swap', a: 0, b: 1 });
    expect(symbolKey(before.tiles)).toBe('ABC');
    expect(before.movesUsed).toBe(0);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../step'`.

- [ ] **Step 3: Implementer rules.ts**

```ts
export type OpName = 'swap' | 'rotate' | 'mirror' | 'insertWild' | 'remove';

export const ALL_OPS: readonly OpName[] = ['swap', 'rotate', 'mirror', 'insertWild', 'remove'];
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 14;

export interface Rules {
  readonly allowedOps: ReadonlySet<OpName>;
  readonly minLength: number;
  readonly maxLength: number;
}

export const makeRules = (ops: readonly OpName[]): Rules => ({
  allowedOps: new Set(ops),
  minLength: MIN_LENGTH,
  maxLength: MAX_LENGTH,
});
```

- [ ] **Step 4: Implementer commands.ts**

```ts
export type Command =
  | { readonly type: 'swap'; readonly a: number; readonly b: number }
  | { readonly type: 'rotate'; readonly from: number; readonly to: number; readonly dir: 'left' | 'right' }
  | { readonly type: 'mirror'; readonly from: number; readonly to: number }
  | { readonly type: 'insertWild'; readonly at: number }
  | { readonly type: 'remove'; readonly tileId: number }
  | { readonly type: 'undo' }
  | { readonly type: 'reset' };

export type MoveCommand = Exclude<Command, { type: 'undo' } | { type: 'reset' }>;

export type RejectReason =
  | 'notAllowed'
  | 'locked'
  | 'notAdjacent'
  | 'segmentTooShort'
  | 'segmentContainsLocked'
  | 'handEmpty'
  | 'minLength'
  | 'maxLength'
  | 'nothingToUndo'
  | 'outOfRange';

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const reject = <E>(reason: E): Result<never, E> => ({ ok: false, reason });
```

- [ ] **Step 5: Implementer step.ts med swap**

```ts
import type { MoveCommand, RejectReason, Result } from './commands';
import { ok, reject } from './commands';
import type { Rules } from './rules';
import type { Snapshot, Tile } from './tiles';

const inRange = (i: number, n: number): boolean => Number.isInteger(i) && i >= 0 && i < n;

const withTiles = (snap: Snapshot, tiles: readonly Tile[]): Snapshot => ({
  ...snap,
  tiles,
  movesUsed: snap.movesUsed + 1,
});

const swap = (rules: Rules, snap: Snapshot, a: number, b: number): Result<Snapshot, RejectReason> => {
  const n = snap.tiles.length;
  if (!inRange(a, n) || !inRange(b, n)) return reject('outOfRange');
  if (Math.abs(a - b) !== 1) return reject('notAdjacent');
  const ta = snap.tiles[a];
  const tb = snap.tiles[b];
  if (ta === undefined || tb === undefined) return reject('outOfRange');
  if (ta.locked || tb.locked) return reject('locked');
  const tiles = [...snap.tiles];
  tiles[a] = tb;
  tiles[b] = ta;
  return ok(withTiles(snap, tiles));
};

export const applyMove = (
  rules: Rules,
  snap: Snapshot,
  cmd: MoveCommand
): Result<Snapshot, RejectReason> => {
  if (!rules.allowedOps.has(cmd.type)) return reject('notAllowed');
  switch (cmd.type) {
    case 'swap':
      return swap(rules, snap, cmd.a, cmd.b);
    case 'rotate':
    case 'mirror':
    case 'insertWild':
    case 'remove':
      return reject('notAllowed');
  }
};
```

- [ ] **Step 6: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/rules.ts src/core/commands.ts src/core/step.ts src/core/__tests__/step.swap.test.ts
git commit -m "feat(core): rules, commands and swap move"
```

---

### Task 3: Rotate og mirror

**Files:**
- Modify: `src/core/step.ts`
- Test: `src/core/__tests__/step.segment.test.ts`

**Interfaces:**
- Consumes: `applyMove` fra Task 2.
- Produces: `applyMove` håndterer `rotate` og `mirror`.

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/step.segment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['rotate', 'mirror']);
const snap = (s: string) => makeSnapshot(tilesFromString(s), { wild: 0, remove: 0 });
const key = (r: ReturnType<typeof applyMove>): string => (r.ok ? symbolKey(r.value.tiles) : `reject:${r.reason}`);

describe('rotate', () => {
  it('roterer segment ett steg til venstre', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 1, to: 3, dir: 'left' }))).toBe('ACDBE');
  });
  it('roterer segment ett steg til høyre', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 1, to: 3, dir: 'right' }))).toBe('ADBCE');
  });
  it('venstre og høyre er inverser', () => {
    const r1 = applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 0, to: 4, dir: 'left' });
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(key(applyMove(rules, r1.value, { type: 'rotate', from: 0, to: 4, dir: 'right' }))).toBe('ABCDE');
    }
  });
  it('avviser segment på én brikke', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 1, to: 1, dir: 'left' }))).toBe('reject:segmentTooShort');
  });
  it('avviser låst brikke i segmentet', () => {
    expect(key(applyMove(rules, snap('AbC'), { type: 'rotate', from: 0, to: 2, dir: 'left' }))).toBe('reject:segmentContainsLocked');
  });
  it('avviser from > to og utenfor rekkevidde', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 2, to: 1, dir: 'left' }))).toBe('reject:outOfRange');
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 0, to: 3, dir: 'left' }))).toBe('reject:outOfRange');
  });
});

describe('mirror', () => {
  it('reverserer segment', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'mirror', from: 1, to: 3 }))).toBe('ADCBE');
  });
  it('avviser segment på to brikker (det er swap)', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'mirror', from: 0, to: 1 }))).toBe('reject:segmentTooShort');
  });
  it('avviser låst brikke i segmentet', () => {
    expect(key(applyMove(rules, snap('AbCD'), { type: 'mirror', from: 0, to: 3 }))).toBe('reject:segmentContainsLocked');
  });
  it('teller ett trekk', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'mirror', from: 0, to: 2 });
    expect(r.ok && r.value.movesUsed).toBe(1);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL på rotate/mirror med `reject:notAllowed`.

- [ ] **Step 3: Legg til segmentlogikk i step.ts**

Legg til over `applyMove`:

```ts
const segment = (
  snap: Snapshot,
  from: number,
  to: number,
  minLen: number
): Result<readonly Tile[], RejectReason> => {
  const n = snap.tiles.length;
  if (!inRange(from, n) || !inRange(to, n) || from > to) return reject('outOfRange');
  const seg = snap.tiles.slice(from, to + 1);
  if (seg.length < minLen) return reject('segmentTooShort');
  if (seg.some((t) => t.locked)) return reject('segmentContainsLocked');
  return ok(seg);
};

const replaceSegment = (snap: Snapshot, from: number, seg: readonly Tile[]): Snapshot => {
  const tiles = [...snap.tiles];
  seg.forEach((t, i) => {
    tiles[from + i] = t;
  });
  return withTiles(snap, tiles);
};

const rotate = (
  snap: Snapshot,
  from: number,
  to: number,
  dir: 'left' | 'right'
): Result<Snapshot, RejectReason> => {
  const seg = segment(snap, from, to, 2);
  if (!seg.ok) return seg;
  const s = [...seg.value];
  if (dir === 'left') {
    const first = s.shift();
    if (first !== undefined) s.push(first);
  } else {
    const last = s.pop();
    if (last !== undefined) s.unshift(last);
  }
  return ok(replaceSegment(snap, from, s));
};

const mirror = (snap: Snapshot, from: number, to: number): Result<Snapshot, RejectReason> => {
  const seg = segment(snap, from, to, 3);
  if (!seg.ok) return seg;
  return ok(replaceSegment(snap, from, [...seg.value].reverse()));
};
```

Oppdater `switch` i `applyMove`:

```ts
    case 'rotate':
      return rotate(snap, cmd.from, cmd.to, cmd.dir);
    case 'mirror':
      return mirror(snap, cmd.from, cmd.to);
    case 'insertWild':
    case 'remove':
      return reject('notAllowed');
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/step.ts src/core/__tests__/step.segment.test.ts
git commit -m "feat(core): rotate and mirror segment moves"
```

---

### Task 4: InsertWild og remove

**Files:**
- Modify: `src/core/step.ts`
- Test: `src/core/__tests__/step.hand.test.ts`

**Interfaces:**
- Produces: `applyMove` håndterer `insertWild` og `remove`. Joker får `id = snap.nextId`, og `nextId` økes.

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/step.hand.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['insertWild', 'remove']);
const snap = (s: string, hand = { wild: 1, remove: 1 }) => makeSnapshot(tilesFromString(s), hand);
const key = (r: ReturnType<typeof applyMove>): string => (r.ok ? symbolKey(r.value.tiles) : `reject:${r.reason}`);

describe('insertWild', () => {
  it('setter inn joker med ny id og bruker hånd', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'insertWild', at: 3 });
    expect(key(r)).toBe('ABC*');
    if (r.ok) {
      expect(r.value.tiles[3]?.id).toBe(3);
      expect(r.value.nextId).toBe(4);
      expect(r.value.hand).toEqual({ wild: 0, remove: 1 });
      expect(r.value.movesUsed).toBe(1);
    }
  });
  it('kan settes inn først', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'insertWild', at: 0 }))).toBe('*ABC');
  });
  it('avviser tom hånd', () => {
    expect(key(applyMove(rules, snap('ABC', { wild: 0, remove: 0 }), { type: 'insertWild', at: 0 }))).toBe('reject:handEmpty');
  });
  it('avviser ved maks lengde', () => {
    expect(key(applyMove(rules, snap('ABCDEFGHIJKLMN'), { type: 'insertWild', at: 0 }))).toBe('reject:maxLength');
  });
  it('avviser posisjon utenfor 0..n', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'insertWild', at: 4 }))).toBe('reject:outOfRange');
  });
});

describe('remove', () => {
  it('fjerner brikke etter id og bruker hånd', () => {
    const r = applyMove(rules, snap('ABCD'), { type: 'remove', tileId: 1 });
    expect(key(r)).toBe('ACD');
    if (r.ok) expect(r.value.hand).toEqual({ wild: 1, remove: 0 });
  });
  it('avviser ukjent id', () => {
    expect(key(applyMove(rules, snap('ABCD'), { type: 'remove', tileId: 9 }))).toBe('reject:outOfRange');
  });
  it('avviser låst brikke', () => {
    expect(key(applyMove(rules, snap('AbCD'), { type: 'remove', tileId: 1 }))).toBe('reject:locked');
  });
  it('avviser ved minste lengde', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'remove', tileId: 0 }))).toBe('reject:minLength');
  });
  it('avviser tom hånd', () => {
    expect(key(applyMove(rules, snap('ABCD', { wild: 0, remove: 0 }), { type: 'remove', tileId: 0 }))).toBe('reject:handEmpty');
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL med `reject:notAllowed`.

- [ ] **Step 3: Implementer i step.ts**

Legg til `makeTile` i importen fra `./tiles`, og over `applyMove`:

```ts
const insertWild = (rules: Rules, snap: Snapshot, at: number): Result<Snapshot, RejectReason> => {
  const n = snap.tiles.length;
  if (!Number.isInteger(at) || at < 0 || at > n) return reject('outOfRange');
  if (snap.hand.wild <= 0) return reject('handEmpty');
  if (n >= rules.maxLength) return reject('maxLength');
  const tiles = [...snap.tiles];
  tiles.splice(at, 0, makeTile(snap.nextId, WILD_SYMBOL, { wild: true }));
  return ok({
    ...withTiles(snap, tiles),
    hand: { ...snap.hand, wild: snap.hand.wild - 1 },
    nextId: snap.nextId + 1,
  });
};

const remove = (rules: Rules, snap: Snapshot, tileId: number): Result<Snapshot, RejectReason> => {
  const idx = snap.tiles.findIndex((t) => t.id === tileId);
  if (idx === -1) return reject('outOfRange');
  const t = snap.tiles[idx];
  if (t === undefined) return reject('outOfRange');
  if (t.locked) return reject('locked');
  if (snap.hand.remove <= 0) return reject('handEmpty');
  if (snap.tiles.length <= rules.minLength) return reject('minLength');
  const tiles = snap.tiles.filter((_, i) => i !== idx);
  return ok({
    ...withTiles(snap, tiles),
    hand: { ...snap.hand, remove: snap.hand.remove - 1 },
  });
};
```

Importer `WILD_SYMBOL` og `makeTile` fra `./tiles`. Oppdater `switch`:

```ts
    case 'insertWild':
      return insertWild(rules, snap, cmd.at);
    case 'remove':
      return remove(rules, snap, cmd.tileId);
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/step.ts src/core/__tests__/step.hand.test.ts
git commit -m "feat(core): insertWild and remove hand moves"
```

---

### Task 5: BoardState, apply, undo og reset

**Files:**
- Create: `src/core/board.ts`
- Test: `src/core/__tests__/board.test.ts`

**Interfaces:**
- Consumes: `applyMove`, `Snapshot`, `makeSnapshot`, `Command`, `Result`, `RejectReason`, `Rules`.
- Produces:
  - `interface BoardState extends Snapshot { readonly initial: Snapshot; readonly history: readonly Snapshot[] }`
  - `createBoard(tiles: readonly Tile[], hand: Hand): BoardState`
  - `apply(rules: Rules, state: BoardState, cmd: Command): Result<BoardState, RejectReason>`
  - `toSnapshot(state: BoardState): Snapshot`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/board.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { apply, createBoard, toSnapshot } from '../board';
import type { Command } from '../commands';
import { makeRules, ALL_OPS } from '../rules';
import { symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(ALL_OPS);
const board = (s: string) => createBoard(tilesFromString(s), { wild: 1, remove: 1 });

describe('apply', () => {
  it('legger snapshot i historikk ved lovlig trekk', () => {
    const r = apply(rules, board('ABC'), { type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(symbolKey(r.value.tiles)).toBe('BAC');
      expect(r.value.history).toHaveLength(1);
      expect(symbolKey(r.value.history[0]!.tiles)).toBe('ABC');
    }
  });

  it('avvist trekk endrer ingenting', () => {
    const r = apply(rules, board('ABC'), { type: 'swap', a: 0, b: 2 });
    expect(r).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('undo gjenoppretter brett, hånd og trekk', () => {
    const b0 = board('ABC');
    const b1 = apply(rules, b0, { type: 'insertWild', at: 0 });
    expect(b1.ok).toBe(true);
    if (!b1.ok) return;
    const b2 = apply(rules, b1.value, { type: 'undo' });
    expect(b2.ok).toBe(true);
    if (b2.ok) {
      expect(toSnapshot(b2.value)).toEqual(toSnapshot(b0));
      expect(b2.value.history).toHaveLength(0);
    }
  });

  it('undo på tom historikk avvises', () => {
    expect(apply(rules, board('ABC'), { type: 'undo' })).toEqual({ ok: false, reason: 'nothingToUndo' });
  });

  it('reset går til start og kan angres', () => {
    const b0 = board('ABCD');
    const b1 = apply(rules, b0, { type: 'swap', a: 0, b: 1 });
    const b2 = b1.ok ? apply(rules, b1.value, { type: 'remove', tileId: 3 }) : b1;
    const b3 = b2.ok ? apply(rules, b2.value, { type: 'reset' }) : b2;
    expect(b3.ok).toBe(true);
    if (!b3.ok) return;
    expect(toSnapshot(b3.value)).toEqual(toSnapshot(b0));
    expect(b3.value.history).toHaveLength(3);
    const b4 = apply(rules, b3.value, { type: 'undo' });
    expect(b4.ok).toBe(true);
    if (b4.ok && b2.ok) expect(toSnapshot(b4.value)).toEqual(toSnapshot(b2.value));
  });

  it('reset på startbrett er no-op', () => {
    const b0 = board('ABC');
    const r = apply(rules, b0, { type: 'reset' });
    expect(r.ok && r.value).toBe(b0);
  });
});

const cmdArb = (n: number): fc.Arbitrary<Command> =>
  fc.oneof(
    fc.record({ type: fc.constant('swap' as const), a: fc.integer({ min: 0, max: n }), b: fc.integer({ min: 0, max: n }) }),
    fc.record({
      type: fc.constant('rotate' as const),
      from: fc.integer({ min: 0, max: n }),
      to: fc.integer({ min: 0, max: n }),
      dir: fc.constantFrom('left' as const, 'right' as const),
    }),
    fc.record({ type: fc.constant('mirror' as const), from: fc.integer({ min: 0, max: n }), to: fc.integer({ min: 0, max: n }) }),
    fc.record({ type: fc.constant('insertWild' as const), at: fc.integer({ min: 0, max: n + 1 }) }),
    fc.record({ type: fc.constant('remove' as const), tileId: fc.integer({ min: 0, max: n + 3 }) })
  );

describe('undo egenskaper', () => {
  it('undo etter ethvert lovlig trekk gir forrige snapshot', () => {
    fc.assert(
      fc.property(fc.array(cmdArb(6), { maxLength: 30 }), (cmds) => {
        let state = createBoard(tilesFromString('ABCBAD'), { wild: 2, remove: 2 });
        for (const cmd of cmds) {
          const r = apply(rules, state, cmd);
          if (!r.ok) continue;
          const back = apply(rules, r.value, { type: 'undo' });
          expect(back.ok).toBe(true);
          if (back.ok) expect(toSnapshot(back.value)).toEqual(toSnapshot(state));
          state = r.value;
        }
      })
    );
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../board'`.

- [ ] **Step 3: Implementer board.ts**

```ts
import type { Command, RejectReason, Result } from './commands';
import { ok, reject } from './commands';
import type { Rules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot } from './tiles';

export interface BoardState extends Snapshot {
  readonly initial: Snapshot;
  readonly history: readonly Snapshot[];
}

export const toSnapshot = (s: Snapshot): Snapshot => ({
  tiles: s.tiles,
  hand: s.hand,
  movesUsed: s.movesUsed,
  nextId: s.nextId,
});

export const createBoard = (tiles: readonly Tile[], hand: Hand): BoardState => {
  const initial = makeSnapshot(tiles, hand);
  return { ...initial, initial, history: [] };
};

const sameSnapshot = (a: Snapshot, b: Snapshot): boolean =>
  a.movesUsed === b.movesUsed &&
  a.nextId === b.nextId &&
  a.hand.wild === b.hand.wild &&
  a.hand.remove === b.hand.remove &&
  a.tiles.length === b.tiles.length &&
  a.tiles.every((t, i) => t === b.tiles[i]);

export const apply = (rules: Rules, state: BoardState, cmd: Command): Result<BoardState, RejectReason> => {
  if (cmd.type === 'undo') {
    const prev = state.history[state.history.length - 1];
    if (prev === undefined) return reject('nothingToUndo');
    return ok({ ...prev, initial: state.initial, history: state.history.slice(0, -1) });
  }
  if (cmd.type === 'reset') {
    if (sameSnapshot(state, state.initial)) return ok(state);
    return ok({
      ...state.initial,
      initial: state.initial,
      history: [...state.history, toSnapshot(state)],
    });
  }
  const r = applyMove(rules, state, cmd);
  if (!r.ok) return r;
  return ok({
    ...r.value,
    initial: state.initial,
    history: [...state.history, toSnapshot(state)],
  });
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS, inkludert property-testen.

- [ ] **Step 5: Commit**

```bash
git add src/core/board.ts src/core/__tests__/board.test.ts
git commit -m "feat(core): board state with atomic undo and reset"
```

---

### Task 6: Lovlige trekk og BFS-løser

**Files:**
- Create: `src/core/solver.ts`
- Test: `src/core/__tests__/solver.test.ts`

**Interfaces:**
- Consumes: `applyMove`, `isPalindrome`, `symbolKey`, `Snapshot`, `Hand`, `Rules`, `MoveCommand`.
- Produces:
  - `interface SolveRequest { readonly rules: Rules; readonly tiles: readonly Tile[]; readonly hand: Hand; readonly maxMoves: number; readonly limits: { readonly states: number; readonly ms?: number } }`
  - `type SolveResult = { status: 'solved'; moves: number } | { status: 'unreachableWithinBudget' } | { status: 'unknown' }`
  - `stateKey(tiles, hand): string`
  - `legalMoves(rules, snap): MoveCommand[]`
  - `class BfsSearch { constructor(req: SolveRequest); step(maxStatesThisStep: number): SolveResult | null }`
  - `solve(req: SolveRequest): SolveResult`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/solver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import { BfsSearch, legalMoves, solve, stateKey } from '../solver';
import { makeSnapshot, tilesFromString } from '../tiles';

const req = (s: string, ops = ALL_OPS, maxMoves = 6, hand = { wild: 0, remove: 0 }, states = 50000) => ({
  rules: makeRules(ops),
  tiles: tilesFromString(s),
  hand,
  maxMoves,
  limits: { states },
});

describe('stateKey', () => {
  it('ignorerer id og trekk, tar med hånd', () => {
    const a = tilesFromString('AB*');
    const b = tilesFromString('AB*').map((t) => ({ ...t, id: t.id + 10 }));
    expect(stateKey(a, { wild: 1, remove: 0 })).toBe(stateKey(b, { wild: 1, remove: 0 }));
    expect(stateKey(a, { wild: 1, remove: 0 })).not.toBe(stateKey(a, { wild: 0, remove: 0 }));
  });
});

describe('legalMoves', () => {
  it('lister swap, rotate, mirror, insertWild og remove etter regler og hånd', () => {
    const snap = makeSnapshot(tilesFromString('ABC'), { wild: 1, remove: 1 });
    const moves = legalMoves(makeRules(ALL_OPS), snap);
    expect(moves.filter((m) => m.type === 'swap')).toHaveLength(2);
    expect(moves.filter((m) => m.type === 'rotate')).toHaveLength(6);
    expect(moves.filter((m) => m.type === 'mirror')).toHaveLength(1);
    expect(moves.filter((m) => m.type === 'insertWild')).toHaveLength(4);
    expect(moves.filter((m) => m.type === 'remove')).toHaveLength(0);
  });
  it('hopper over låste brikker', () => {
    const snap = makeSnapshot(tilesFromString('AbC'), { wild: 0, remove: 0 });
    expect(legalMoves(makeRules(['swap']), snap)).toHaveLength(0);
  });
});

describe('solve', () => {
  it('0 trekk for palindrom', () => {
    expect(solve(req('ABA'))).toEqual({ status: 'solved', moves: 0 });
  });
  it('1 swap for AAB', () => {
    expect(solve(req('AAB', ['swap']))).toEqual({ status: 'solved', moves: 1 });
  });
  it('2 swaps for AABB med bare swap', () => {
    expect(solve(req('AABB', ['swap']))).toEqual({ status: 'solved', moves: 2 });
  });
  it('1 rotate for DOCRECORD, segment OCR roteres til ROC', () => {
    expect(solve(req('DOCRECORD', ['rotate']))).toEqual({ status: 'solved', moves: 1 });
  });
  it('uoppnåelig innen budsjett når paritet er feil og bare permutasjoner', () => {
    expect(solve(req('ABCD', ['swap', 'rotate', 'mirror'], 4))).toEqual({ status: 'unreachableWithinBudget' });
  });
  it('ABCDA løses med fjern B og sett inn joker, to trekk', () => {
    expect(solve(req('ABCDA', ALL_OPS, 3, { wild: 1, remove: 1 }))).toEqual({ status: 'solved', moves: 2 });
  });
  it('unknown når state-grensen er nådd', () => {
    expect(solve(req('ABCDEFGHIJ', ALL_OPS, 8, { wild: 0, remove: 0 }, 50))).toEqual({ status: 'unknown' });
  });
  it('er deterministisk uten ms-grense', () => {
    const r = req('BACDEFGFEDCBA', ['swap', 'rotate'], 4, { wild: 0, remove: 0 }, 5000);
    expect(solve(r)).toEqual(solve(r));
  });
});

describe('BfsSearch.step', () => {
  it('returnerer null til søket er ferdig', () => {
    const s = new BfsSearch(req('AABB', ['swap']));
    let result = s.step(1);
    let steps = 1;
    while (result === null) {
      result = s.step(1);
      steps++;
    }
    expect(result).toEqual({ status: 'solved', moves: 2 });
    expect(steps).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../solver'`.

- [ ] **Step 3: Implementer solver.ts**

```ts
import type { MoveCommand } from './commands';
import { isPalindrome } from './palindrome';
import type { Rules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot, symbolKey } from './tiles';

export interface SolveRequest {
  readonly rules: Rules;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly maxMoves: number;
  readonly limits: { readonly states: number; readonly ms?: number };
}

export type SolveResult =
  | { readonly status: 'solved'; readonly moves: number }
  | { readonly status: 'unreachableWithinBudget' }
  | { readonly status: 'unknown' };

export const stateKey = (tiles: readonly Tile[], hand: Hand): string =>
  `${symbolKey(tiles)}|${hand.wild}|${hand.remove}`;

export const legalMoves = (rules: Rules, snap: Snapshot): MoveCommand[] => {
  const n = snap.tiles.length;
  const moves: MoveCommand[] = [];
  const ops = rules.allowedOps;
  const locked = snap.tiles.map((t) => t.locked);

  if (ops.has('swap')) {
    for (let i = 0; i + 1 < n; i++) {
      if (locked[i] === false && locked[i + 1] === false) moves.push({ type: 'swap', a: i, b: i + 1 });
    }
  }
  if (ops.has('rotate') || ops.has('mirror')) {
    for (let from = 0; from < n; from++) {
      if (locked[from] === true) continue;
      for (let to = from + 1; to < n; to++) {
        if (locked[to] === true) break;
        const len = to - from + 1;
        if (ops.has('rotate') && len >= 2) {
          moves.push({ type: 'rotate', from, to, dir: 'left' });
          moves.push({ type: 'rotate', from, to, dir: 'right' });
        }
        if (ops.has('mirror') && len >= 3) moves.push({ type: 'mirror', from, to });
      }
    }
  }
  if (ops.has('insertWild') && snap.hand.wild > 0 && n < rules.maxLength) {
    for (let at = 0; at <= n; at++) moves.push({ type: 'insertWild', at });
  }
  if (ops.has('remove') && snap.hand.remove > 0 && n > rules.minLength) {
    for (const t of snap.tiles) {
      if (!t.locked) moves.push({ type: 'remove', tileId: t.id });
    }
  }
  return moves;
};

interface QueueItem {
  readonly snap: Snapshot;
  readonly depth: number;
}

export class BfsSearch {
  private readonly queue: QueueItem[] = [];
  private head = 0;
  private readonly visited = new Set<string>();
  private readonly startedAt = Date.now();
  private done: SolveResult | null = null;

  constructor(private readonly req: SolveRequest) {
    const start = makeSnapshot(req.tiles, req.hand);
    if (isPalindrome(start.tiles)) {
      this.done = { status: 'solved', moves: 0 };
      return;
    }
    if (req.maxMoves <= 0) {
      this.done = { status: 'unreachableWithinBudget' };
      return;
    }
    this.visited.add(stateKey(start.tiles, start.hand));
    this.queue.push({ snap: start, depth: 0 });
  }

  /** Utvider inntil maxStatesThisStep tilstander. Returnerer null hvis søket ikke er ferdig. */
  step(maxStatesThisStep: number): SolveResult | null {
    if (this.done !== null) return this.done;
    let expanded = 0;
    while (this.head < this.queue.length && expanded < maxStatesThisStep) {
      const item = this.queue[this.head];
      if (item === undefined) break;
      this.head++;
      expanded++;
      for (const move of legalMoves(this.req.rules, item.snap)) {
        const r = applyMove(this.req.rules, item.snap, move);
        if (!r.ok) continue;
        const key = stateKey(r.value.tiles, r.value.hand);
        if (this.visited.has(key)) continue;
        if (isPalindrome(r.value.tiles)) {
          this.done = { status: 'solved', moves: item.depth + 1 };
          return this.done;
        }
        this.visited.add(key);
        if (this.visited.size > this.req.limits.states) {
          this.done = { status: 'unknown' };
          return this.done;
        }
        if (item.depth + 1 < this.req.maxMoves) this.queue.push({ snap: r.value, depth: item.depth + 1 });
      }
      if (this.req.limits.ms !== undefined && Date.now() - this.startedAt > this.req.limits.ms) {
        this.done = { status: 'unknown' };
        return this.done;
      }
    }
    if (this.head >= this.queue.length) {
      this.done = { status: 'unreachableWithinBudget' };
      return this.done;
    }
    return null;
  }
}

export const solve = (req: SolveRequest): SolveResult => {
  const search = new BfsSearch(req);
  let result: SolveResult | null = null;
  while (result === null) result = search.step(1000);
  return result;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS. Hvis `legalMoves`-tellingen for rotate feiler: segmenter i `ABC` er [0,1],[1,2],[0,2] → 3 segmenter × 2 retninger = 6.

- [ ] **Step 5: Commit**

```bash
git add src/core/solver.ts src/core/__tests__/solver.test.ts
git commit -m "feat(core): legal move enumeration and BFS solver with state limits"
```

---

### Task 7: Løser-protokoll for web worker

**Files:**
- Create: `src/core/solverProtocol.ts`
- Create: `src/core/solverClient.ts`
- Create: `src/core/solver.worker.ts`
- Test: `src/core/__tests__/solverProtocol.test.ts`
- Test: `src/core/__tests__/solverClient.test.ts`

**Interfaces:**
- Consumes: `BfsSearch`, `SolveRequest`, `SolveResult`.
- Produces:
  - `type WorkerIn = { kind: 'solve'; requestId: string; req: SolveRequestJson } | { kind: 'cancel'; requestId: string }`
  - `type WorkerOut = { requestId: string; result: SolveResult }`
  - `interface SolveRequestJson` (som `SolveRequest`, men `rules.allowedOps` er `OpName[]` fordi `Set` ikke går over `postMessage`)
  - `toRequestJson(req: SolveRequest): SolveRequestJson`, `fromRequestJson(j: SolveRequestJson): SolveRequest`
  - `createSolverHandler(post: (msg: WorkerOut) => void, schedule: (fn: () => void) => void): (msg: WorkerIn) => void`
  - `interface WorkerLike { postMessage(msg: WorkerIn): void; onmessage: ((ev: { data: WorkerOut }) => void) | null }`
  - `class SolverClient { constructor(worker: WorkerLike); solve(req: SolveRequest): Promise<SolveResult>; cancelAll(): void }`

- [ ] **Step 1: Skriv failing tests**

`src/core/__tests__/solverProtocol.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import type { WorkerOut } from '../solverProtocol';
import { createSolverHandler, fromRequestJson, toRequestJson } from '../solverProtocol';
import { tilesFromString } from '../tiles';

const reqJson = (s: string) =>
  toRequestJson({ rules: makeRules(ALL_OPS), tiles: tilesFromString(s), hand: { wild: 0, remove: 0 }, maxMoves: 5, limits: { states: 20000 } });

describe('request json', () => {
  it('rundtur beholder regler', () => {
    const j = reqJson('ABC');
    expect(j.rules.allowedOps).toEqual([...ALL_OPS]);
    expect(fromRequestJson(j).rules.allowedOps.has('mirror')).toBe(true);
  });
});

describe('createSolverHandler', () => {
  it('poster resultat med samme requestId', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: reqJson('AAB') });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([{ requestId: 'r1', result: { status: 'solved', moves: 1 } }]);
  });

  it('cancel før kjøring gir ingen melding', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: reqJson('ABCDEFGH') });
    handle({ kind: 'cancel', requestId: 'r1' });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([]);
  });

  it('kjører i biter så cancel midt i søk stopper det', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: { ...reqJson('ABCDEFGHIJ'), limits: { states: 10_000_000 } } });
    pending.shift()!();
    expect(pending.length).toBe(1);
    handle({ kind: 'cancel', requestId: 'r1' });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([]);
  });
});
```

`src/core/__tests__/solverClient.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import { SolverClient } from '../solverClient';
import type { WorkerIn, WorkerLike, WorkerOut } from '../solverProtocol';
import { createSolverHandler } from '../solverProtocol';
import { tilesFromString } from '../tiles';

/** Fake worker som kjører handleren synkront i samme tråd. */
const fakeWorker = (): WorkerLike & { sent: WorkerIn[] } => {
  const w: WorkerLike & { sent: WorkerIn[] } = {
    sent: [],
    onmessage: null,
    postMessage(msg: WorkerIn): void {
      w.sent.push(msg);
      handle(msg);
    },
  };
  const handle = createSolverHandler(
    (out: WorkerOut) => w.onmessage?.({ data: out }),
    (fn) => queueMicrotask(fn)
  );
  return w;
};

const req = (s: string) => ({ rules: makeRules(ALL_OPS), tiles: tilesFromString(s), hand: { wild: 0, remove: 0 }, maxMoves: 5, limits: { states: 20000 } });

describe('SolverClient', () => {
  it('løser via worker', async () => {
    const client = new SolverClient(fakeWorker());
    await expect(client.solve(req('AAB'))).resolves.toEqual({ status: 'solved', moves: 1 });
  });

  it('ny forespørsel avbryter forrige og forrige løfte får unknown', async () => {
    const w = fakeWorker();
    const client = new SolverClient(w);
    const first = client.solve(req('ABCDEFGHIJ'));
    const second = client.solve(req('AAB'));
    await expect(first).resolves.toEqual({ status: 'unknown' });
    await expect(second).resolves.toEqual({ status: 'solved', moves: 1 });
    expect(w.sent.some((m) => m.kind === 'cancel')).toBe(true);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, moduler mangler.

- [ ] **Step 3: Implementer solverProtocol.ts**

```ts
import type { OpName } from './rules';
import type { SolveRequest, SolveResult } from './solver';
import { BfsSearch } from './solver';
import type { Hand, Tile } from './tiles';

export interface SolveRequestJson {
  readonly rules: { readonly allowedOps: readonly OpName[]; readonly minLength: number; readonly maxLength: number };
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly maxMoves: number;
  readonly limits: { readonly states: number; readonly ms?: number };
}

export type WorkerIn =
  | { readonly kind: 'solve'; readonly requestId: string; readonly req: SolveRequestJson }
  | { readonly kind: 'cancel'; readonly requestId: string };

export interface WorkerOut {
  readonly requestId: string;
  readonly result: SolveResult;
}

export interface WorkerLike {
  postMessage(msg: WorkerIn): void;
  onmessage: ((ev: { data: WorkerOut }) => void) | null;
}

export const toRequestJson = (req: SolveRequest): SolveRequestJson => ({
  rules: { allowedOps: [...req.rules.allowedOps], minLength: req.rules.minLength, maxLength: req.rules.maxLength },
  tiles: req.tiles,
  hand: req.hand,
  maxMoves: req.maxMoves,
  limits: req.limits,
});

export const fromRequestJson = (j: SolveRequestJson): SolveRequest => ({
  rules: { allowedOps: new Set(j.rules.allowedOps), minLength: j.rules.minLength, maxLength: j.rules.maxLength },
  tiles: j.tiles,
  hand: j.hand,
  maxMoves: j.maxMoves,
  limits: j.limits,
});

const CHUNK_STATES = 2000;

/**
 * Lager meldingshåndterer for worker. `schedule` brukes til å yielde mellom biter,
 * slik at cancel-meldinger kan behandles midt i et søk.
 */
export const createSolverHandler = (
  post: (msg: WorkerOut) => void,
  schedule: (fn: () => void) => void
): ((msg: WorkerIn) => void) => {
  const active = new Map<string, BfsSearch>();

  const run = (requestId: string): void => {
    const search = active.get(requestId);
    if (search === undefined) return;
    const result = search.step(CHUNK_STATES);
    if (result === null) {
      schedule(() => run(requestId));
      return;
    }
    active.delete(requestId);
    post({ requestId, result });
  };

  return (msg: WorkerIn): void => {
    if (msg.kind === 'cancel') {
      active.delete(msg.requestId);
      return;
    }
    active.set(msg.requestId, new BfsSearch(fromRequestJson(msg.req)));
    schedule(() => run(msg.requestId));
  };
};
```

- [ ] **Step 4: Implementer solver.worker.ts**

```ts
import type { WorkerIn, WorkerOut } from './solverProtocol';
import { createSolverHandler } from './solverProtocol';

const handle = createSolverHandler(
  (msg: WorkerOut) => self.postMessage(msg),
  (fn) => setTimeout(fn, 0)
);

self.onmessage = (ev: MessageEvent<WorkerIn>): void => handle(ev.data);
```

- [ ] **Step 5: Implementer solverClient.ts**

```ts
import type { SolveRequest, SolveResult } from './solver';
import type { WorkerLike, WorkerOut } from './solverProtocol';
import { toRequestJson } from './solverProtocol';

/** Én utestående forespørsel om gangen. Ny forespørsel avbryter forrige. */
export class SolverClient {
  private counter = 0;
  private pending: { requestId: string; resolve: (r: SolveResult) => void } | null = null;

  constructor(private readonly worker: WorkerLike) {
    worker.onmessage = (ev: { data: WorkerOut }): void => {
      if (this.pending === null || this.pending.requestId !== ev.data.requestId) return;
      const { resolve } = this.pending;
      this.pending = null;
      resolve(ev.data.result);
    };
  }

  solve(req: SolveRequest): Promise<SolveResult> {
    this.cancelAll();
    const requestId = `req-${++this.counter}`;
    return new Promise<SolveResult>((resolve) => {
      this.pending = { requestId, resolve };
      this.worker.postMessage({ kind: 'solve', requestId, req: toRequestJson(req) });
    });
  }

  cancelAll(): void {
    if (this.pending === null) return;
    const { requestId, resolve } = this.pending;
    this.pending = null;
    this.worker.postMessage({ kind: 'cancel', requestId });
    resolve({ status: 'unknown' });
  }
}
```

- [ ] **Step 6: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS. `solver.worker.ts` typechecker fordi `lib` har `DOM`; `self.postMessage` finnes der.

- [ ] **Step 7: Commit**

```bash
git add src/core/solverProtocol.ts src/core/solverClient.ts src/core/solver.worker.ts src/core/__tests__/solverProtocol.test.ts src/core/__tests__/solverClient.test.ts
git commit -m "feat(core): solver worker protocol with chunked search and cancel"
```

---

### Task 8: Seedet RNG

**Files:**
- Create: `src/core/rng.ts`
- Test: `src/core/__tests__/rng.test.ts`

**Interfaces:**
- Produces:
  - `type Rng = () => number` (0 ≤ x < 1)
  - `createRng(seed: number): Rng` (mulberry32)
  - `hashString(s: string): number` (FNV-1a 32-bit, alltid ≥ 0)
  - `randInt(rng: Rng, min: number, max: number): number` (inklusiv begge)
  - `pick<T>(rng: Rng, arr: readonly T[]): T` (kaster på tom liste)
  - `shuffle<T>(rng: Rng, arr: readonly T[]): T[]` (kopi)

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng, hashString, pick, randInt, shuffle } from '../rng';

describe('createRng', () => {
  it('samme seed gir samme sekvens', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('ulik seed gir ulik sekvens', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
  it('verdier ligger i [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('er deterministisk og ikke-negativ', () => {
    expect(hashString('w1-01')).toBe(hashString('w1-01'));
    expect(hashString('w1-01')).not.toBe(hashString('w1-02'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });
});

describe('randInt', () => {
  it('dekker hele intervallet inklusivt', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 2, 4));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });
});

describe('pick og shuffle', () => {
  it('pick kaster på tom liste', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
  it('shuffle er en permutasjon og muterer ikke', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(createRng(9), src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(src);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../rng'`.

- [ ] **Step 3: Implementer rng.ts**

```ts
export type Rng = () => number;

/** mulberry32: liten, rask, deterministisk. */
export const createRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a 32-bit. */
export const hashString = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const pick = <T>(rng: Rng, arr: readonly T[]): T => {
  const v = arr[randInt(rng, 0, arr.length - 1)];
  if (v === undefined) throw new Error('pick: tom liste');
  return v;
};

export const shuffle = <T>(rng: Rng, arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/rng.ts src/core/__tests__/rng.test.ts
git commit -m "feat(core): seeded rng helpers"
```

---

### Task 9: Baklengs generator med validert løsning

**Files:**
- Create: `src/core/generator.ts`
- Test: `src/core/__tests__/generator.test.ts`

**Interfaces:**
- Consumes: `applyMove`, `apply`, `createBoard`, `isPalindrome`, `makeRules`, `makeSnapshot`, `makeTile`, `WILD_SYMBOL`, `Rng`, `randInt`, `pick`, `shuffle`.
- Produces:
  - `interface GenerateSpec { readonly length: number; readonly alphabet: number; readonly allowedOps: readonly OpName[]; readonly hand: Hand; readonly lockedCount: number; readonly scrambleSteps: number }`
  - `interface Candidate { readonly tiles: readonly Tile[]; readonly hand: Hand; readonly solution: readonly MoveCommand[] }`
  - `makeTargetPalindrome(spec: GenerateSpec, rng: Rng): Tile[]`
  - `generateCandidate(spec: GenerateSpec, rng: Rng): Candidate | null`
  - `validateSolution(rules: Rules, c: Candidate): boolean`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateCandidate, makeTargetPalindrome, validateSolution } from '../generator';
import { isPalindrome } from '../palindrome';
import { createRng } from '../rng';
import { makeRules, ALL_OPS } from '../rules';
import { symbolKey, tilesFromString } from '../tiles';

const base = {
  length: 7,
  alphabet: 4,
  allowedOps: ALL_OPS,
  hand: { wild: 0, remove: 0 },
  lockedCount: 0,
  scrambleSteps: 3,
};

describe('makeTargetPalindrome', () => {
  it('er palindrom med riktig lengde, jokere og låser', () => {
    const tiles = makeTargetPalindrome({ ...base, hand: { wild: 2, remove: 0 }, lockedCount: 1 }, createRng(1));
    expect(tiles).toHaveLength(7);
    expect(isPalindrome(tiles)).toBe(true);
    expect(tiles.filter((t) => t.wild)).toHaveLength(2);
    expect(tiles.filter((t) => t.locked)).toHaveLength(1);
    expect(tiles.map((t) => t.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('bruker bare alfabetet', () => {
    const tiles = makeTargetPalindrome({ ...base, alphabet: 2 }, createRng(5));
    expect(tiles.every((t) => t.symbol === 'A' || t.symbol === 'B')).toBe(true);
  });
});

describe('generateCandidate', () => {
  it('gir brett som ikke er palindrom, med validert løsning', () => {
    for (let seed = 0; seed < 30; seed++) {
      const c = generateCandidate(base, createRng(seed));
      if (c === null) continue;
      expect(isPalindrome(c.tiles)).toBe(false);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
  });

  it('hånden dekker nøyaktig løsningens hånd-trekk', () => {
    const spec = { ...base, hand: { wild: 1, remove: 1 }, scrambleSteps: 2 };
    let found = 0;
    for (let seed = 0; seed < 50 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.hand).toEqual({ wild: 1, remove: 1 });
      expect(c.solution.filter((m) => m.type === 'insertWild')).toHaveLength(1);
      expect(c.solution.filter((m) => m.type === 'remove')).toHaveLength(1);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('respekterer tillatte operasjoner i løsningen', () => {
    const spec = { ...base, allowedOps: ['swap'] as const };
    let found = 0;
    for (let seed = 0; seed < 30 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.solution.every((m) => m.type === 'swap')).toBe(true);
      expect(validateSolution(makeRules(['swap']), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('låste brikker forblir låste og flyttes aldri av løsningen', () => {
    const spec = { ...base, lockedCount: 2, scrambleSteps: 4 };
    let found = 0;
    for (let seed = 0; seed < 50 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.tiles.filter((t) => t.locked)).toHaveLength(2);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('er deterministisk for samme seed', () => {
    const a = generateCandidate(base, createRng(77));
    const b = generateCandidate(base, createRng(77));
    expect(a === null ? null : symbolKey(a.tiles)).toEqual(b === null ? null : symbolKey(b.tiles));
    expect(a?.solution).toEqual(b?.solution);
  });
});

describe('validateSolution', () => {
  it('avviser løsning som ikke ender i palindrom', () => {
    const c = { tiles: tilesFromString('ABC'), hand: { wild: 0, remove: 0 }, solution: [{ type: 'swap' as const, a: 0, b: 1 }] };
    expect(validateSolution(makeRules(ALL_OPS), c)).toBe(false);
  });
  it('avviser løsning som bruker mer hånd enn den har', () => {
    const c = { tiles: tilesFromString('ABC'), hand: { wild: 0, remove: 0 }, solution: [{ type: 'insertWild' as const, at: 0 }] };
    expect(validateSolution(makeRules(ALL_OPS), c)).toBe(false);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../generator'`.

- [ ] **Step 3: Implementer generator.ts**

```ts
import { apply, createBoard } from './board';
import type { MoveCommand } from './commands';
import { isPalindrome } from './palindrome';
import type { Rng } from './rng';
import { pick, randInt, shuffle } from './rng';
import type { OpName, Rules } from './rules';
import { makeRules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot, makeTile, WILD_SYMBOL } from './tiles';

export interface GenerateSpec {
  readonly length: number;
  readonly alphabet: number;
  readonly allowedOps: readonly OpName[];
  readonly hand: Hand;
  readonly lockedCount: number;
  readonly scrambleSteps: number;
}

export interface Candidate {
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly solution: readonly MoveCommand[];
}

const ALPHABET = 'ABCDEFGHIJ';
const symbolAt = (i: number): string => ALPHABET[i] ?? 'A';
const randomSymbol = (spec: GenerateSpec, rng: Rng): string => symbolAt(randInt(rng, 0, spec.alphabet - 1));

export const makeTargetPalindrome = (spec: GenerateSpec, rng: Rng): Tile[] => {
  const half = Math.floor(spec.length / 2);
  const left: string[] = [];
  for (let i = 0; i < half; i++) left.push(randomSymbol(spec, rng));
  const mid = spec.length % 2 === 1 ? [randomSymbol(spec, rng)] : [];
  const symbols = [...left, ...mid, ...[...left].reverse()];
  const positions = shuffle(rng, symbols.map((_, i) => i));
  const wildPos = new Set(positions.slice(0, spec.hand.wild));
  const lockPos = new Set(positions.slice(spec.hand.wild, spec.hand.wild + spec.lockedCount));
  return symbols.map((s, i) => {
    if (wildPos.has(i)) return makeTile(i, WILD_SYMBOL, { wild: true });
    return makeTile(i, s, { locked: lockPos.has(i) });
  });
};

type StepKind = 'perm' | 'insertWild' | 'remove';

interface Predecessor {
  readonly prev: Snapshot;
  readonly forward: MoveCommand;
}

const isPermOp = (op: OpName): op is 'swap' | 'rotate' | 'mirror' =>
  op === 'swap' || op === 'rotate' || op === 'mirror';

const permPredecessor = (
  cur: Snapshot,
  permOps: readonly ('swap' | 'rotate' | 'mirror')[],
  permRules: Rules,
  rng: Rng
): Predecessor | null => {
  const n = cur.tiles.length;
  if (permOps.length === 0) return null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const op = pick(rng, permOps);
    let forward: MoveCommand;
    let backward: MoveCommand;
    if (op === 'swap') {
      const a = randInt(rng, 0, n - 2);
      forward = { type: 'swap', a, b: a + 1 };
      backward = forward;
    } else if (op === 'rotate') {
      const from = randInt(rng, 0, n - 2);
      const to = randInt(rng, from + 1, n - 1);
      const dir = pick(rng, ['left', 'right'] as const);
      forward = { type: 'rotate', from, to, dir };
      backward = { type: 'rotate', from, to, dir: dir === 'left' ? 'right' : 'left' };
    } else {
      if (n < 3) return null;
      const from = randInt(rng, 0, n - 3);
      const to = randInt(rng, from + 2, n - 1);
      forward = { type: 'mirror', from, to };
      backward = forward;
    }
    const r = applyMove(permRules, cur, backward);
    if (r.ok) return { prev: { ...r.value, movesUsed: 0 }, forward };
  }
  return null;
};

const insertWildPredecessor = (cur: Snapshot, rules: Rules, rng: Rng): Predecessor | null => {
  const wildIdx = cur.tiles.map((t, i) => (t.wild ? i : -1)).filter((i) => i >= 0);
  if (wildIdx.length === 0 || cur.tiles.length - 1 < rules.minLength) return null;
  const at = pick(rng, wildIdx);
  return {
    prev: { ...cur, tiles: cur.tiles.filter((_, i) => i !== at), hand: { ...cur.hand, wild: cur.hand.wild + 1 } },
    forward: { type: 'insertWild', at },
  };
};

const removePredecessor = (cur: Snapshot, rules: Rules, spec: GenerateSpec, rng: Rng): Predecessor | null => {
  const n = cur.tiles.length;
  if (n + 1 > rules.maxLength) return null;
  const at = randInt(rng, 0, n);
  const tile = makeTile(cur.nextId, randomSymbol(spec, rng));
  const tiles = [...cur.tiles];
  tiles.splice(at, 0, tile);
  return {
    prev: { ...cur, tiles, nextId: cur.nextId + 1, hand: { ...cur.hand, remove: cur.hand.remove + 1 } },
    forward: { type: 'remove', tileId: tile.id },
  };
};

export const validateSolution = (rules: Rules, c: Candidate): boolean => {
  let state = createBoard(c.tiles, c.hand);
  for (const cmd of c.solution) {
    const r = apply(rules, state, cmd);
    if (!r.ok) return false;
    state = r.value;
  }
  return isPalindrome(state.tiles) && state.hand.wild === 0 && state.hand.remove === 0;
};

/**
 * Lager et brett baklengs: start i et palindrom, gå til lovlige forgjengere,
 * og noter forover-kommandoen for hvert steg. Løsningen valideres med apply.
 */
export const generateCandidate = (spec: GenerateSpec, rng: Rng): Candidate | null => {
  const rules = makeRules(spec.allowedOps);
  const permOps = spec.allowedOps.filter(isPermOp);
  const permRules = makeRules(permOps);
  if (spec.length - spec.hand.wild < rules.minLength) return null;
  if (spec.length + spec.hand.remove > rules.maxLength) return null;
  if (spec.hand.wild + spec.lockedCount > spec.length) return null;

  let cur: Snapshot = makeSnapshot(makeTargetPalindrome(spec, rng), { wild: 0, remove: 0 });
  const solution: MoveCommand[] = [];
  const steps: StepKind[] = shuffle(rng, [
    ...Array.from({ length: spec.scrambleSteps }, (): StepKind => 'perm'),
    ...Array.from({ length: spec.hand.wild }, (): StepKind => 'insertWild'),
    ...Array.from({ length: spec.hand.remove }, (): StepKind => 'remove'),
  ]);

  for (const step of steps) {
    const p =
      step === 'perm'
        ? permPredecessor(cur, permOps, permRules, rng)
        : step === 'insertWild'
          ? insertWildPredecessor(cur, rules, rng)
          : removePredecessor(cur, rules, spec, rng);
    if (p === null) return null;
    cur = p.prev;
    solution.unshift(p.forward);
  }

  if (isPalindrome(cur.tiles)) return null;
  const candidate: Candidate = { tiles: cur.tiles, hand: cur.hand, solution };
  return validateSolution(rules, candidate) ? candidate : null;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS. Hvis «hånden dekker nøyaktig» gir `found = 0`: sjekk at `insertWildPredecessor` finner jokere; de plantes i `makeTargetPalindrome` ut fra `spec.hand.wild`.

- [ ] **Step 5: Commit**

```bash
git add src/core/generator.ts src/core/__tests__/generator.test.ts
git commit -m "feat(core): backward puzzle generator with validated solutions"
```

---

### Task 10: Oppskrift, kvalitetsfiltre og makeLevel

**Files:**
- Create: `src/core/level.ts`
- Test: `src/core/__tests__/level.test.ts`

**Interfaces:**
- Consumes: `generateCandidate`, `Candidate`, `solve`, `makeRules`, `symbolKey`, `createRng`, `hashString`, `randInt`, `isPalindrome`.
- Produces:
  - `interface Recipe { readonly id: string; readonly lengthRange: readonly [number, number]; readonly alphabet: number; readonly allowedOps: readonly OpName[]; readonly movesRange: readonly [number, number]; readonly slack: number; readonly hand: Hand; readonly lockedRange: readonly [number, number]; readonly scrambleRange: readonly [number, number]; readonly solverStates: number }`
  - `interface Level { readonly id: string; readonly recipeId: string; readonly seed: number; readonly contentVersion: number; readonly tiles: readonly Tile[]; readonly hand: Hand; readonly allowedOps: readonly OpName[]; readonly target: number; readonly targetExact: boolean; readonly budget: number; readonly solution: readonly MoveCommand[] }`
  - `type IntroOf = OpName | 'locked'`
  - `interface MakeLevelOptions { readonly id: string; readonly contentVersion: number; readonly previousKeys?: readonly string[]; readonly introOf?: IntroOf; readonly attempts?: number }`
  - `levelSeed(contentVersion: number, id: string): number`
  - `rulesFor(level: Pick<Level, 'allowedOps'>): Rules`
  - `makeLevel(recipe: Recipe, opts: MakeLevelOptions): Level | null`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateSolution } from '../generator';
import type { Recipe } from '../level';
import { levelSeed, makeLevel, rulesFor } from '../level';
import { isPalindrome } from '../palindrome';
import { solve } from '../solver';
import { symbolKey } from '../tiles';

const swapWorld: Recipe = {
  id: 'w1',
  lengthRange: [4, 6],
  alphabet: 3,
  allowedOps: ['swap'],
  movesRange: [1, 4],
  slack: 4,
  hand: { wild: 0, remove: 0 },
  lockedRange: [0, 0],
  scrambleRange: [1, 4],
  solverStates: 20000,
};

const rotateWorld: Recipe = {
  ...swapWorld,
  id: 'w2',
  lengthRange: [5, 5],
  alphabet: 4,
  allowedOps: ['swap', 'rotate'],
  movesRange: [2, 5],
  scrambleRange: [2, 5],
};

const lockWorld: Recipe = {
  ...rotateWorld,
  id: 'w4',
  lengthRange: [7, 7],
  allowedOps: ['swap', 'rotate', 'mirror'],
  lockedRange: [1, 2],
  movesRange: [2, 6],
};

describe('makeLevel', () => {
  it('lager nivå med mål, budsjett og gyldig løsning', () => {
    const level = makeLevel(swapWorld, { id: 'w1-01', contentVersion: 1 });
    expect(level).not.toBeNull();
    if (level === null) return;
    expect(level.id).toBe('w1-01');
    expect(level.seed).toBe(levelSeed(1, 'w1-01'));
    expect(isPalindrome(level.tiles)).toBe(false);
    expect(level.budget).toBe(level.target + swapWorld.slack);
    expect(level.target).toBeGreaterThanOrEqual(1);
    expect(level.target).toBeLessThanOrEqual(4);
    expect(level.targetExact).toBe(true);
    expect(validateSolution(rulesFor(level), level)).toBe(true);
  });

  it('er deterministisk', () => {
    const a = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    const b = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    expect(a).toEqual(b);
  });

  it('endrer brett når contentVersion endres', () => {
    const a = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    const b = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 2 });
    expect(a !== null && b !== null && symbolKey(a.tiles) === symbolKey(b.tiles)).toBe(false);
  });

  it('hopper over duplikater', () => {
    const a = makeLevel(swapWorld, { id: 'w1-05', contentVersion: 1 });
    expect(a).not.toBeNull();
    if (a === null) return;
    const b = makeLevel(swapWorld, { id: 'w1-05', contentVersion: 1, previousKeys: [symbolKey(a.tiles)] });
    expect(b).not.toBeNull();
    if (b === null) return;
    expect(symbolKey(b.tiles)).not.toBe(symbolKey(a.tiles));
  });

  it('mål er eksakt minimum når løseren fullfører', () => {
    const level = makeLevel(rotateWorld, { id: 'w2-04', contentVersion: 1 });
    expect(level).not.toBeNull();
    if (level === null) return;
    const res = solve({ rules: rulesFor(level), tiles: level.tiles, hand: level.hand, maxMoves: 8, limits: { states: 100000 } });
    expect(res).toEqual({ status: 'solved', moves: level.target });
  });

  it('introOf rotate gir brett som ikke kan løses uten rotate innen mål', () => {
    const level = makeLevel(rotateWorld, { id: 'w2-01', contentVersion: 1, introOf: 'rotate', attempts: 200 });
    expect(level).not.toBeNull();
    if (level === null) return;
    const res = solve({ rules: rulesFor({ allowedOps: ['swap'] }), tiles: level.tiles, hand: level.hand, maxMoves: level.target, limits: { states: 100000 } });
    expect(res.status).toBe('unreachableWithinBudget');
  });

  it('introOf locked gir brett der låsen øker minimum', () => {
    const level = makeLevel(lockWorld, { id: 'w4-01', contentVersion: 1, introOf: 'locked', attempts: 300 });
    expect(level).not.toBeNull();
    if (level === null) return;
    expect(level.tiles.some((t) => t.locked)).toBe(true);
    const unlocked = level.tiles.map((t) => ({ ...t, locked: false }));
    const res = solve({ rules: rulesFor(level), tiles: unlocked, hand: level.hand, maxMoves: level.target - 1, limits: { states: 200000 } });
    expect(res.status).toBe('solved');
  });

  it('gir null når ingen kandidat passerer', () => {
    const impossible: Recipe = { ...swapWorld, movesRange: [9, 9], scrambleRange: [1, 1] };
    expect(makeLevel(impossible, { id: 'x', contentVersion: 1, attempts: 5 })).toBeNull();
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../level'`.

- [ ] **Step 3: Implementer level.ts**

```ts
import type { MoveCommand } from './commands';
import type { Candidate } from './generator';
import { generateCandidate } from './generator';
import { createRng, hashString, randInt } from './rng';
import type { OpName, Rules } from './rules';
import { makeRules } from './rules';
import { solve } from './solver';
import type { Hand, Tile } from './tiles';
import { symbolKey } from './tiles';

export interface Recipe {
  readonly id: string;
  readonly lengthRange: readonly [number, number];
  readonly alphabet: number;
  readonly allowedOps: readonly OpName[];
  readonly movesRange: readonly [number, number];
  readonly slack: number;
  readonly hand: Hand;
  readonly lockedRange: readonly [number, number];
  readonly scrambleRange: readonly [number, number];
  readonly solverStates: number;
}

export interface Level {
  readonly id: string;
  readonly recipeId: string;
  readonly seed: number;
  readonly contentVersion: number;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly allowedOps: readonly OpName[];
  readonly target: number;
  readonly targetExact: boolean;
  readonly budget: number;
  readonly solution: readonly MoveCommand[];
}

export type IntroOf = OpName | 'locked';

export interface MakeLevelOptions {
  readonly id: string;
  readonly contentVersion: number;
  readonly previousKeys?: readonly string[];
  readonly introOf?: IntroOf;
  readonly attempts?: number;
}

export const levelSeed = (contentVersion: number, id: string): number =>
  hashString(`${contentVersion}:${id}`);

export const rulesFor = (level: Pick<Level, 'allowedOps'>): Rules => makeRules(level.allowedOps);

const passesIntro = (
  introOf: IntroOf,
  c: Candidate,
  recipe: Recipe,
  target: number,
  targetExact: boolean
): boolean => {
  if (introOf === 'locked') {
    if (!targetExact || !c.tiles.some((t) => t.locked)) return false;
    const unlocked = c.tiles.map((t) => ({ ...t, locked: false }));
    const res = solve({
      rules: makeRules(recipe.allowedOps),
      tiles: unlocked,
      hand: c.hand,
      maxMoves: target - 1,
      limits: { states: recipe.solverStates },
    });
    return res.status === 'solved';
  }
  // Mekanikken må trengs for å nå mål (tre stjerner). Innen hele budsjettet er kravet
  // ikke oppfyllbart: swap alene når enhver permutasjon på korte brett innen mål + slakk.
  const without = recipe.allowedOps.filter((op) => op !== introOf);
  const res = solve({
    rules: makeRules(without),
    tiles: c.tiles,
    hand: c.hand,
    maxMoves: target,
    limits: { states: recipe.solverStates },
  });
  return res.status === 'unreachableWithinBudget';
};

/**
 * Deterministisk: samme oppskrift, id og contentVersion gir samme nivå og samme mål.
 * Bruker aldri ms-grense i løseren.
 */
export const makeLevel = (recipe: Recipe, opts: MakeLevelOptions): Level | null => {
  const seed = levelSeed(opts.contentVersion, opts.id);
  const previous = new Set(opts.previousKeys ?? []);
  const rules = makeRules(recipe.allowedOps);
  const [minMoves, maxMoves] = recipe.movesRange;
  const attempts = opts.attempts ?? 60;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const rng = createRng(hashString(`${seed}:${attempt}`));
    const spec = {
      length: randInt(rng, recipe.lengthRange[0], recipe.lengthRange[1]),
      alphabet: recipe.alphabet,
      allowedOps: recipe.allowedOps,
      hand: recipe.hand,
      lockedCount: randInt(rng, recipe.lockedRange[0], recipe.lockedRange[1]),
      scrambleSteps: randInt(rng, recipe.scrambleRange[0], recipe.scrambleRange[1]),
    };
    const c = generateCandidate(spec, rng);
    if (c === null) continue;
    if (previous.has(symbolKey(c.tiles))) continue;

    const res = solve({ rules, tiles: c.tiles, hand: c.hand, maxMoves, limits: { states: recipe.solverStates } });
    let target: number;
    let targetExact: boolean;
    if (res.status === 'solved') {
      if (res.moves < minMoves) continue;
      target = res.moves;
      targetExact = true;
    } else if (res.status === 'unknown') {
      if (c.solution.length < minMoves || c.solution.length > maxMoves) continue;
      target = c.solution.length;
      targetExact = false;
    } else {
      continue;
    }
    const budget = target + recipe.slack;
    if (opts.introOf !== undefined && !passesIntro(opts.introOf, c, recipe, target, targetExact)) continue;

    return {
      id: opts.id,
      recipeId: recipe.id,
      seed,
      contentVersion: opts.contentVersion,
      tiles: c.tiles,
      hand: c.hand,
      allowedOps: recipe.allowedOps,
      target,
      targetExact,
      budget,
      solution: c.solution,
    };
  }
  return null;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS. Intro-testene kan ta noen sekunder.

- [ ] **Step 5: Commit**

```bash
git add src/core/level.ts src/core/__tests__/level.test.ts
git commit -m "feat(core): recipes, quality filters and deterministic makeLevel"
```

---

### Task 11: Scoring

**Files:**
- Create: `src/core/scoring.ts`
- Test: `src/core/__tests__/scoring.test.ts`

**Interfaces:**
- Produces:
  - `type Stars = 0 | 1 | 2 | 3`
  - `budgetFor(target: number, slack: number): number`
  - `starsFor(movesUsed: number, target: number, budget: number): Stars`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { budgetFor, starsFor } from '../scoring';

describe('budgetFor', () => {
  it('er mål pluss slakk', () => {
    expect(budgetFor(3, 4)).toBe(7);
  });
});

describe('starsFor', () => {
  it.each([
    [3, 3, 7, 3],
    [2, 3, 7, 3],
    [4, 3, 7, 2],
    [5, 3, 7, 2],
    [6, 3, 7, 1],
    [7, 3, 7, 1],
    [8, 3, 7, 0],
  ])('movesUsed=%i mål=%i budsjett=%i -> %i stjerner', (moves, target, budget, stars) => {
    expect(starsFor(moves, target, budget)).toBe(stars);
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../scoring'`.

- [ ] **Step 3: Implementer scoring.ts**

```ts
export type Stars = 0 | 1 | 2 | 3;

export const budgetFor = (target: number, slack: number): number => target + slack;

export const starsFor = (movesUsed: number, target: number, budget: number): Stars => {
  if (movesUsed > budget) return 0;
  if (movesUsed <= target) return 3;
  if (movesUsed <= target + 2) return 2;
  return 1;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scoring.ts src/core/__tests__/scoring.test.ts
git commit -m "feat(core): budget and star scoring"
```

---

### Task 12: Progresjon

**Files:**
- Create: `src/core/progression.ts`
- Test: `src/core/__tests__/progression.test.ts`

**Interfaces:**
- Produces:
  - `WORLD_COUNT = 6`, `LEVELS_PER_WORLD = 15`, `WORLD_GATE = 12`
  - `type StarMap = Readonly<Record<string, number>>`
  - `levelId(world: number, n: number): string`
  - `parseLevelId(id: string): { world: number; n: number } | null`
  - `solvedInWorld(world: number, stars: StarMap): number`
  - `isWorldUnlocked(world: number, stars: StarMap): boolean`
  - `isLevelUnlocked(id: string, stars: StarMap): boolean`
  - `nextLevelId(id: string): string | null`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/progression.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isLevelUnlocked, isWorldUnlocked, levelId, nextLevelId, parseLevelId, solvedInWorld } from '../progression';

const solvedWorld1 = (count: number): Record<string, number> =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => [levelId(1, i + 1), 1]));

describe('levelId', () => {
  it('formaterer med to siffer', () => {
    expect(levelId(3, 7)).toBe('w3-07');
    expect(levelId(6, 15)).toBe('w6-15');
  });
  it('parser tilbake', () => {
    expect(parseLevelId('w3-07')).toEqual({ world: 3, n: 7 });
    expect(parseLevelId('level7')).toBeNull();
    expect(parseLevelId('w7-01')).toBeNull();
    expect(parseLevelId('w1-16')).toBeNull();
  });
});

describe('opplåsing', () => {
  it('verden 1 er alltid åpen, w1-01 er åpen', () => {
    expect(isWorldUnlocked(1, {})).toBe(true);
    expect(isLevelUnlocked('w1-01', {})).toBe(true);
    expect(isLevelUnlocked('w1-02', {})).toBe(false);
  });
  it('neste nivå åpnes ved løst forrige', () => {
    expect(isLevelUnlocked('w1-02', { 'w1-01': 1 })).toBe(true);
    expect(isLevelUnlocked('w1-03', { 'w1-01': 3 })).toBe(false);
  });
  it('neste verden krever 12 løste', () => {
    expect(solvedInWorld(1, solvedWorld1(11))).toBe(11);
    expect(isWorldUnlocked(2, solvedWorld1(11))).toBe(false);
    expect(isWorldUnlocked(2, solvedWorld1(12))).toBe(true);
    expect(isLevelUnlocked('w2-01', solvedWorld1(12))).toBe(true);
    expect(isLevelUnlocked('w2-01', solvedWorld1(11))).toBe(false);
  });
  it('stjerner teller ikke som port, bare løst', () => {
    const stars = { ...solvedWorld1(12), 'w1-01': 3 };
    expect(isWorldUnlocked(2, stars)).toBe(true);
  });
});

describe('nextLevelId', () => {
  it('går til neste nivå og neste verden', () => {
    expect(nextLevelId('w1-01')).toBe('w1-02');
    expect(nextLevelId('w1-15')).toBe('w2-01');
    expect(nextLevelId('w6-15')).toBeNull();
    expect(nextLevelId('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../progression'`.

- [ ] **Step 3: Implementer progression.ts**

```ts
export const WORLD_COUNT = 6;
export const LEVELS_PER_WORLD = 15;
export const WORLD_GATE = 12;

export type StarMap = Readonly<Record<string, number>>;

export const levelId = (world: number, n: number): string => `w${world}-${String(n).padStart(2, '0')}`;

export const parseLevelId = (id: string): { world: number; n: number } | null => {
  const m = /^w(\d)-(\d{2})$/.exec(id);
  if (m === null) return null;
  const world = Number(m[1]);
  const n = Number(m[2]);
  if (world < 1 || world > WORLD_COUNT || n < 1 || n > LEVELS_PER_WORLD) return null;
  return { world, n };
};

export const solvedInWorld = (world: number, stars: StarMap): number => {
  let count = 0;
  for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
    if ((stars[levelId(world, n)] ?? 0) > 0) count++;
  }
  return count;
};

export const isWorldUnlocked = (world: number, stars: StarMap): boolean =>
  world === 1 || (world <= WORLD_COUNT && solvedInWorld(world - 1, stars) >= WORLD_GATE);

export const isLevelUnlocked = (id: string, stars: StarMap): boolean => {
  const parsed = parseLevelId(id);
  if (parsed === null) return false;
  if (!isWorldUnlocked(parsed.world, stars)) return false;
  if (parsed.n === 1) return true;
  return (stars[levelId(parsed.world, parsed.n - 1)] ?? 0) > 0;
};

export const nextLevelId = (id: string): string | null => {
  const parsed = parseLevelId(id);
  if (parsed === null) return null;
  if (parsed.n < LEVELS_PER_WORLD) return levelId(parsed.world, parsed.n + 1);
  if (parsed.world < WORLD_COUNT) return levelId(parsed.world + 1, 1);
  return null;
};
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/progression.ts src/core/__tests__/progression.test.ts
git commit -m "feat(core): level ids, world gates and unlock rules"
```

---

### Task 13: Lagring og migrasjon

**Files:**
- Create: `src/core/storage.ts`
- Test: `src/core/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `StarMap` fra Task 12.
- Produces:
  - `interface Settings { sound: boolean; music: boolean; reducedMotion: boolean; colorBlind: boolean }`
  - `interface StarRecord { readonly stars: number; readonly contentVersion: number }`
  - `interface DailyAttempt { readonly puzzleId: string; readonly attempt: number; readonly moves: number; readonly timeMs: number; readonly target: number; readonly completedAt: string }`
  - `interface SaveData { readonly saveVersion: 1; readonly stars: Readonly<Record<string, StarRecord>>; readonly daily: { readonly attempts: readonly DailyAttempt[]; readonly streak: number }; readonly blitz: { readonly best: number }; readonly settings: Settings }`
  - `interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `SAVE_KEY = 'palintris.save.v1'`, `LEGACY_SETTINGS_KEY = 'palintris_settings'`
  - `defaultSave(): SaveData`
  - `loadSave(storage: StorageLike): SaveData`
  - `persistSave(storage: StorageLike, data: SaveData): void`
  - `recordStars(data: SaveData, levelId: string, stars: number, contentVersion: number): SaveData`
  - `starMap(data: SaveData): StarMap`

- [ ] **Step 1: Skriv failing test**

`src/core/__tests__/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../storage';
import { defaultSave, LEGACY_SETTINGS_KEY, loadSave, persistSave, recordStars, SAVE_KEY, starMap } from '../storage';

const memStorage = (init: Record<string, string> = {}): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
};

describe('loadSave', () => {
  it('gir default når ingenting er lagret', () => {
    expect(loadSave(memStorage())).toEqual(defaultSave());
  });

  it('leser lagret data', () => {
    const s = memStorage();
    const data = recordStars(defaultSave(), 'w1-01', 2, 1);
    persistSave(s, data);
    expect(loadSave(s)).toEqual(data);
  });

  it('migrerer gamle innstillinger', () => {
    const s = memStorage({
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ soundEnabled: false, musicEnabled: true, particlesEnabled: false, colorBlindMode: true }),
    });
    const data = loadSave(s);
    expect(data.settings).toEqual({ sound: false, music: true, reducedMotion: true, colorBlind: true });
    expect(data.stars).toEqual({});
  });

  it('ignorerer gamle innstillinger når ny lagring finnes', () => {
    const s = memStorage({ [LEGACY_SETTINGS_KEY]: JSON.stringify({ soundEnabled: false }) });
    persistSave(s, defaultSave());
    expect(loadSave(s).settings.sound).toBe(true);
  });

  it('gir default ved korrupt JSON', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
  });

  it('gir default ved feil saveVersion', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: JSON.stringify({ saveVersion: 99 }) }))).toEqual(defaultSave());
  });
});

describe('recordStars', () => {
  it('beholder beste stjerner', () => {
    let d = recordStars(defaultSave(), 'w1-01', 3, 1);
    d = recordStars(d, 'w1-01', 1, 2);
    expect(d.stars['w1-01']).toEqual({ stars: 3, contentVersion: 1 });
  });
  it('oppdaterer ved lik eller bedre', () => {
    let d = recordStars(defaultSave(), 'w1-01', 2, 1);
    d = recordStars(d, 'w1-01', 2, 2);
    expect(d.stars['w1-01']).toEqual({ stars: 2, contentVersion: 2 });
  });
  it('starMap gir bare tall', () => {
    const d = recordStars(defaultSave(), 'w1-02', 1, 1);
    expect(starMap(d)).toEqual({ 'w1-02': 1 });
  });
});

describe('persistSave', () => {
  it('svelger feil fra storage', () => {
    const broken: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(() => persistSave(broken, defaultSave())).not.toThrow();
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../storage'`.

- [ ] **Step 3: Implementer storage.ts**

```ts
import type { StarMap } from './progression';

export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  colorBlind: boolean;
}

export interface StarRecord {
  readonly stars: number;
  readonly contentVersion: number;
}

export interface DailyAttempt {
  readonly puzzleId: string;
  readonly attempt: number;
  readonly moves: number;
  readonly timeMs: number;
  readonly target: number;
  readonly completedAt: string;
}

export interface SaveData {
  readonly saveVersion: 1;
  readonly stars: Readonly<Record<string, StarRecord>>;
  readonly daily: { readonly attempts: readonly DailyAttempt[]; readonly streak: number };
  readonly blitz: { readonly best: number };
  readonly settings: Settings;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'palintris.save.v1';
export const LEGACY_SETTINGS_KEY = 'palintris_settings';

export const defaultSave = (): SaveData => ({
  saveVersion: 1,
  stars: {},
  daily: { attempts: [], streak: 0 },
  blitz: { best: 0 },
  settings: { sound: true, music: true, reducedMotion: false, colorBlind: false },
});

const readJson = (storage: StorageLike, key: string): unknown => {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const migrateLegacy = (storage: StorageLike): SaveData => {
  const base = defaultSave();
  const legacy = readJson(storage, LEGACY_SETTINGS_KEY);
  if (!isRecord(legacy)) return base;
  const bool = (key: string, fallback: boolean): boolean =>
    typeof legacy[key] === 'boolean' ? (legacy[key] as boolean) : fallback;
  return {
    ...base,
    settings: {
      sound: bool('soundEnabled', true),
      music: bool('musicEnabled', true),
      reducedMotion: !bool('particlesEnabled', true),
      colorBlind: bool('colorBlindMode', false),
    },
  };
};

export const loadSave = (storage: StorageLike): SaveData => {
  const parsed = readJson(storage, SAVE_KEY);
  if (isRecord(parsed) && parsed['saveVersion'] === 1) {
    const base = defaultSave();
    return {
      saveVersion: 1,
      stars: isRecord(parsed['stars']) ? (parsed['stars'] as Record<string, StarRecord>) : base.stars,
      daily: isRecord(parsed['daily']) ? (parsed['daily'] as SaveData['daily']) : base.daily,
      blitz: isRecord(parsed['blitz']) ? (parsed['blitz'] as SaveData['blitz']) : base.blitz,
      settings: isRecord(parsed['settings']) ? { ...base.settings, ...(parsed['settings'] as Partial<Settings>) } : base.settings,
    };
  }
  return migrateLegacy(storage);
};

export const persistSave = (storage: StorageLike, data: SaveData): void => {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Lagring kan være full eller avslått; spillet fortsetter uten.
  }
};

export const recordStars = (data: SaveData, levelId: string, stars: number, contentVersion: number): SaveData => {
  const existing = data.stars[levelId];
  if (existing !== undefined && existing.stars > stars) return data;
  return { ...data, stars: { ...data.stars, [levelId]: { stars, contentVersion } } };
};

export const starMap = (data: SaveData): StarMap =>
  Object.fromEntries(Object.entries(data.stars).map(([id, rec]) => [id, rec.stars]));
```

- [ ] **Step 4: Kjør testene**

Run: `npm test && npm run typecheck`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/storage.ts src/core/__tests__/storage.test.ts
git commit -m "feat(core): versioned save data with legacy settings migration"
```

---

### Task 14: Oppskrifter, byggeskript og frosset kampanje

**Files:**
- Create: `src/content/recipes.ts`
- Create: `scripts/build-campaign.ts`
- Create: `src/content/campaign.ts`
- Create: `src/content/campaign.v1.json` (generert av skriptet, committes)
- Test: `src/content/__tests__/campaign.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `Level`, `IntroOf`, `makeLevel`, `rulesFor`, `validateSolution`, `levelId`, `LEVELS_PER_WORLD`, `WORLD_COUNT`, `symbolKey`, `isPalindrome`.
- Produces:
  - `CONTENT_VERSION = 1`
  - `WORLD_RECIPES: readonly Recipe[]` (6 elementer, indeks 0 er verden 1)
  - `INTRO_LEVELS: Readonly<Record<string, IntroOf>>`
  - `interface CampaignContent { readonly contentVersion: number; readonly levels: readonly Level[] }`
  - `CAMPAIGN: CampaignContent`
  - `getCampaignLevel(id: string): Level | undefined`

- [ ] **Step 1: Skriv recipes.ts**

`src/content/recipes.ts`:

```ts
import type { IntroOf, Recipe } from '../core/level';

export const CONTENT_VERSION = 1;

const OFFLINE_STATES = 150000;

export const WORLD_RECIPES: readonly Recipe[] = [
  {
    id: 'w1',
    lengthRange: [4, 6],
    alphabet: 3,
    allowedOps: ['swap'],
    movesRange: [1, 4],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [1, 4],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w2',
    lengthRange: [5, 7],
    alphabet: 4,
    allowedOps: ['swap', 'rotate'],
    movesRange: [2, 5],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [2, 5],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w3',
    lengthRange: [6, 8],
    alphabet: 4,
    allowedOps: ['swap', 'rotate', 'mirror'],
    movesRange: [2, 6],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [2, 6],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w4',
    lengthRange: [7, 10],
    alphabet: 5,
    allowedOps: ['swap', 'rotate', 'mirror'],
    movesRange: [3, 7],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [1, 2],
    scrambleRange: [3, 7],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w5',
    lengthRange: [7, 10],
    alphabet: 5,
    allowedOps: ['swap', 'rotate', 'mirror', 'insertWild', 'remove'],
    movesRange: [3, 8],
    slack: 4,
    hand: { wild: 1, remove: 1 },
    lockedRange: [0, 0],
    scrambleRange: [2, 6],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w6',
    lengthRange: [10, 14],
    alphabet: 6,
    allowedOps: ['swap', 'rotate', 'mirror', 'insertWild', 'remove'],
    movesRange: [4, 9],
    slack: 4,
    hand: { wild: 1, remove: 1 },
    lockedRange: [0, 2],
    scrambleRange: [3, 8],
    solverStates: OFFLINE_STATES,
  },
];

/** Første nivå som krever en ny mekanikk. Verifiseres av løser i makeLevel. */
export const INTRO_LEVELS: Readonly<Record<string, IntroOf>> = {
  'w2-01': 'rotate',
  'w3-01': 'mirror',
  'w4-01': 'locked',
  'w5-01': 'insertWild',
  'w5-02': 'remove',
};
```

- [ ] **Step 2: Skriv byggeskriptet**

`scripts/build-campaign.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { CONTENT_VERSION, INTRO_LEVELS, WORLD_RECIPES } from '../src/content/recipes';
import type { Level, Recipe } from '../src/core/level';
import { makeLevel } from '../src/core/level';
import { levelId, LEVELS_PER_WORLD } from '../src/core/progression';
import { symbolKey } from '../src/core/tiles';

const levels: Level[] = [];

WORLD_RECIPES.forEach((recipe, wi) => {
  const world = wi + 1;
  const keys: string[] = [];
  for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
    const id = levelId(world, n);
    const introOf = INTRO_LEVELS[id];
    const effective: Recipe =
      introOf === undefined ? recipe : { ...recipe, lengthRange: [recipe.lengthRange[0], recipe.lengthRange[0]] };
    const level = makeLevel(effective, { id, contentVersion: CONTENT_VERSION, previousKeys: keys, introOf, attempts: 400 });
    if (level === null) {
      console.error(`Kunne ikke generere ${id}`);
      process.exit(1);
    }
    keys.push(symbolKey(level.tiles));
    levels.push(level);
    console.log(`${id} ${symbolKey(level.tiles).padEnd(14)} mål=${level.target}${level.targetExact ? ' ' : '~'} budsjett=${level.budget}`);
  }
});

const out = `src/content/campaign.v${CONTENT_VERSION}.json`;
writeFileSync(out, `${JSON.stringify({ contentVersion: CONTENT_VERSION, levels }, null, 2)}\n`);
console.log(`Skrev ${levels.length} nivåer til ${out}`);
```

- [ ] **Step 3: Kjør skriptet**

Run: `npm run build:campaign`
Expected: 90 linjer med id, symbolstreng, mål og budsjett, deretter `Skrev 90 nivåer til src/content/campaign.v1.json`. Kan ta et par minutter på grunn av løseren i verden 4–6. Hvis et nivå feiler: øk `attempts` for det nivået, eller utvid `scrambleRange`/`movesRange` for verdenen, og kjør på nytt.

- [ ] **Step 4: Skriv campaign.ts**

`src/content/campaign.ts`:

```ts
import type { Level } from '../core/level';
import data from './campaign.v1.json';

export interface CampaignContent {
  readonly contentVersion: number;
  readonly levels: readonly Level[];
}

// JSON-typen er strukturelt lik Level, men kommando-unionen blir til string i JSON-typen.
export const CAMPAIGN: CampaignContent = data as unknown as CampaignContent;

const byId = new Map(CAMPAIGN.levels.map((l) => [l.id, l]));

export const getCampaignLevel = (id: string): Level | undefined => byId.get(id);
```

- [ ] **Step 5: Skriv testen**

`src/content/__tests__/campaign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAMPAIGN, getCampaignLevel } from '../campaign';
import { CONTENT_VERSION, INTRO_LEVELS, WORLD_RECIPES } from '../recipes';
import { validateSolution } from '../../core/generator';
import { makeLevel, rulesFor } from '../../core/level';
import { isPalindrome } from '../../core/palindrome';
import { levelId, LEVELS_PER_WORLD, WORLD_COUNT } from '../../core/progression';
import { MAX_LENGTH, MIN_LENGTH } from '../../core/rules';
import { symbolKey } from '../../core/tiles';

describe('campaign.v1.json', () => {
  it('har 90 nivåer i riktig rekkefølge', () => {
    expect(CAMPAIGN.contentVersion).toBe(CONTENT_VERSION);
    expect(CAMPAIGN.levels).toHaveLength(WORLD_COUNT * LEVELS_PER_WORLD);
    CAMPAIGN.levels.forEach((level, i) => {
      expect(level.id).toBe(levelId(Math.floor(i / LEVELS_PER_WORLD) + 1, (i % LEVELS_PER_WORLD) + 1));
    });
  });

  it('hvert nivå er løsbart med lagret løsning og innenfor grensene', () => {
    for (const level of CAMPAIGN.levels) {
      expect(isPalindrome(level.tiles), level.id).toBe(false);
      expect(level.tiles.length, level.id).toBeGreaterThanOrEqual(MIN_LENGTH);
      expect(level.tiles.length, level.id).toBeLessThanOrEqual(MAX_LENGTH);
      expect(validateSolution(rulesFor(level), level), level.id).toBe(true);
      const recipe = WORLD_RECIPES.find((r) => r.id === level.recipeId);
      expect(recipe, level.id).toBeDefined();
      if (recipe !== undefined) {
        expect(level.budget, level.id).toBe(level.target + recipe.slack);
        expect(level.target, level.id).toBeGreaterThanOrEqual(recipe.movesRange[0]);
        expect(level.target, level.id).toBeLessThanOrEqual(recipe.movesRange[1]);
      }
    }
  });

  it('ingen duplikater innen en verden', () => {
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const keys = CAMPAIGN.levels.filter((l) => l.recipeId === `w${world}`).map((l) => symbolKey(l.tiles));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('intro-nivåer finnes og har mekanikken', () => {
    for (const id of Object.keys(INTRO_LEVELS)) {
      expect(getCampaignLevel(id)).toBeDefined();
    }
    expect(getCampaignLevel('w4-01')?.tiles.some((t) => t.locked)).toBe(true);
    expect(getCampaignLevel('w5-01')?.solution.some((m) => m.type === 'insertWild')).toBe(true);
  });

  it('w1-01 kan regenereres identisk fra oppskrift', () => {
    const recipe = WORLD_RECIPES[0];
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    expect(makeLevel(recipe, { id: 'w1-01', contentVersion: CONTENT_VERSION, attempts: 400 })).toEqual(getCampaignLevel('w1-01'));
  });
});
```

- [ ] **Step 6: Kjør testene**

Run: `npm test && npm run typecheck && npm run lint`
Expected: alle PASS. Lint kan klage på `src/content/campaign.ts` sin `as unknown as`; det er tilsiktet og kan få `// eslint-disable-next-line @typescript-eslint/consistent-type-assertions` hvis regelen er aktiv.

- [ ] **Step 7: Commit**

```bash
git add src/content/recipes.ts src/content/campaign.ts src/content/campaign.v1.json src/content/__tests__/campaign.test.ts scripts/build-campaign.ts
git commit -m "feat(content): world recipes, offline campaign builder and frozen campaign v1"
```

---

## Ferdig-kriterier for plan 1

- `npm test`, `npm run typecheck` og `npm run lint` er grønne på branch `redesign`.
- `src/core` har ingen import fra Phaser eller `src/scenes`, `src/ui`, `src/game`. Sjekk: `grep -rn "from 'phaser'" src/core` gir ingen treff.
- `src/content/campaign.v1.json` finnes med 90 nivåer og er committet.
- Tag `v1-legacy` peker på gammel main.

## Utenfor denne planen

- Brett, gester, layout, tema, scener: plan 2.
- Daily-ID og ISO-uke-filter, Blitz-regler, signaturnivåer, sletting av gamle scener og assets, CI, ESLint flat config: plan 3.
