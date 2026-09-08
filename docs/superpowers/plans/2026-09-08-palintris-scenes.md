# Palintris scener – implementasjonsplan (plan 2b av 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Et spillbart kampanjeløp på mobil: Boot → Meny → Verdenskart → Brett → Resultat, med det nye brettet (rad og hårnål, speillinje, gester, hånd, angre/reset), lyd, effekter, tastatur, innstillinger og en Playwright-røyktest ved 390×844.

**Architecture:** Phaser 3 er kun tegning og input. Scenene i `src/scenes` konsumerer `src/game` (layout, gester, intents, sesjon, modus, lagring) og `src/theme`. `BoardScene` eier én `BoardSession` og én `GestureMachine`, oversetter Phaser-pekerhendelser til `PointerEvt` med `Target` fra layout-treff, og sender `Intent` gjennom `intentToCommand` til `session.dispatch`. Løseren kjører i en web worker via `SolverClient`. Tjenester (lagring, modus, løser) opprettes i Boot og deles via Phaser-registeret.

**Tech Stack:** Phaser 3.70, Vite 5, TypeScript 5 strict, vitest for ren logikk, `@playwright/test` for røyktest.

**Spec:** `docs/superpowers/specs/2026-09-07-palintris-redesign-design.md` §2 (Layout, Speillinje, Gester, Tastatur, Introduksjoner, Tilbakemelding), §4 (visuelt), §5 (BoardScene og modus, Tid, Skalering, Testing). Notater fra plan 2a står nederst i `docs/superpowers/plans/2026-09-08-palintris-board-logic.md` og er bindende der de presiserer API-bruk.

**Avvik fra writing-plans-formen, besluttet av controller:** Phaser-tegning og tweens er ikke verifiserbare uten å kjøre spillet. For Task 3–6 gir planen komplette klasseskjeletter med alle signaturer, faste verdier og tett prosa for hver metodekropp, og verifiserer med `npm run typecheck`, `npm run build` og til slutt Playwright. Ren logikk (Task 1, 2, 7) har full kode og vitest som før.

## Global Constraints

- `src/scenes`, `src/audio` og `src/game` importerer aldri fra `src/config`, `src/ui`, `src/utils` (legacy). `src/game` og `src/theme` importerer aldri Phaser. Kun `src/scenes` og `src/audio` (ingen) får importere Phaser; `src/audio` er Phaser-fri.
- Ingen hex-farger, fontnavn eller varigheter i scener: alt fra `src/theme/theme.ts` (`COLORS`, `WORLD_ACCENTS`, `FONTS`, `SPACE`, `RADIUS`, `DURATION`, `EASING`, `symbolColor`, `symbolPattern`, `worldAccent`, `durations`, `cssColor`). Unntak: `index.html` sin bakgrunnsfarge.
- Skalering: `Phaser.Scale.RESIZE`, `autoCenter: CENTER_BOTH`, `width: '100%'`, `height: '100%'`. Layout regnes på nytt ved `resize`. Landskap: maks brettbredde 480 px, sentrert.
- Layout, gester, adapter og sesjon brukes som de er: `computeLayout`, `hitTile`, `hitGap` (kun under joker-drag/armert), `GestureMachine` (`tick` hver frame), `intentToCommand`, `BoardSession` (les `view()` etter konstruksjon; `dispatch` etter `dispose` gir `'disposed'`). Én `SolverClient` per sesjon.
- Input låses under layoutskifte 6↔7 og mens brikker animeres. Ved `deadEnd` er kun angre og reset tilgjengelig. `unknown` vises aldri som blindgate.
- Redusert bevegelse: `durations(true)` overalt, ingen partikler, shake eller flash. Fargeblind: mønster fra `symbolPattern` tegnes i brikken.
- Klokker via Phaser `time`, aldri `setInterval`.
- Alle tester: `npm test`, `npm run typecheck`, `npm run lint:core` (globen utvides til `src/scenes src/audio` i Task 1) må være grønne før hver commit; `npm run build` må lykkes fra Task 3 og utover. Playwright (`npm run e2e`) fra Task 7.
- Ingen push. Commit lokalt på branch `redesign` med trailerne `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` og `Claude-Session: https://claude.ai/code/session_018VMa2K13QmbxtwcDwXsQ1w`.

---

### Task 1: Lyd flyttes og styres av innstillinger

**Files:**
- Move: `src/utils/audio.ts` → `src/audio/sound.ts` (git mv, så endringer)
- Create: `src/utils/audio.ts` (shim som re-eksporterer, til plan 3 sletter legacy)
- Test: `src/audio/__tests__/sound.test.ts`
- Modify: `package.json` (`lint:core`-glob)

**Interfaces:**
- Produces:
  - `interface SoundFlags { readonly sound: boolean; readonly music: boolean }`
  - `audio.configure(flags: SoundFlags): void` — erstatter all lesing av `loadSettings()`; `music: false` stopper spillende musikk.
  - Eksisterende offentlige metoder beholdes: `playClick`, `playSelect`, `playSwap`, `playRotate`, `playMirror`, `playSuccess`, `playFailure`, `playPalindrome`, `playAchievement`, `playUndo`, `playError`, `startMusic('menu' | 'gameplay')`, `stopMusic`, `isMusicPlaying`, `playVictoryJingle`.
  - `audio` er fortsatt singleton; ingen Phaser-import; ingen import fra `src/utils` eller `src/config`.

- [ ] **Step 1: Flytt fila**

`git mv src/utils/audio.ts src/audio/sound.ts`. Opprett shim `src/utils/audio.ts` med innholdet:

```ts
// Midlertidig shim til legacy-scener slettes i plan 3.
export { audio } from '../audio/sound';
```

- [ ] **Step 2: Skriv failing test**

`src/audio/__tests__/sound.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { audio } from '../sound';

describe('audio uten AudioContext (node)', () => {
  it('kaster ikke når lyd er av', () => {
    audio.configure({ sound: false, music: false });
    expect(() => audio.playSwap()).not.toThrow();
    expect(() => audio.startMusic('menu')).not.toThrow();
    expect(audio.isMusicPlaying()).toBe(false);
  });

  it('kaster ikke når lyd er på men AudioContext mangler', () => {
    audio.configure({ sound: true, music: true });
    expect(() => audio.playSwap()).not.toThrow();
    expect(() => audio.playSuccess()).not.toThrow();
    expect(() => audio.startMusic('gameplay')).not.toThrow();
    expect(audio.isMusicPlaying()).toBe(false);
  });

  it('music:false stopper musikk', () => {
    audio.configure({ sound: true, music: true });
    audio.startMusic('menu');
    audio.configure({ sound: true, music: false });
    expect(audio.isMusicPlaying()).toBe(false);
  });
});
```

- [ ] **Step 3: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL på `audio.configure is not a function` eller en import-feil fra `./storage`.

- [ ] **Step 4: Endre sound.ts**

- Fjern `import { loadSettings } from './storage'`.
- Legg til øverst:

```ts
export interface SoundFlags {
  readonly sound: boolean;
  readonly music: boolean;
}
```

- `ChiptuneEngine` får konstruktørparameter `private readonly musicEnabled: () => boolean` og bruker den der `loadSettings().musicEnabled` sto.
- `AudioManager` får feltet `private flags: SoundFlags = { sound: true, music: true }`, oppretter engine med `() => this.flags.music`, og metoden:

```ts
  public configure(flags: SoundFlags): void {
    this.flags = flags;
    if (!flags.music) this.stopMusic();
  }
```

- Alle steder som leste `loadSettings().soundEnabled` bruker `this.flags.sound`; `playVictoryJingle` bruker `this.flags.music`.
- `initContext()` returnerer `null` uten å kaste når `typeof AudioContext === 'undefined'` (og `webkitAudioContext` mangler); alle primitiver returnerer tidlig når konteksten er `null`. `ChiptuneEngine.play` gjør det samme.
- Ingen andre funksjonsendringer. Behold sequencer og alle SFX.

- [ ] **Step 5: Utvid lint-glob**

`package.json`: `"lint:core": "eslint src/core src/content src/theme src/game src/audio src/scenes scripts --ext .ts"`. `src/scenes` inneholder legacy-scener til plan 3; hvis `lint:core` feiler på dem, legg `"src/scenes/**"` i `.eslintrc.json` sin `ignorePatterns` **kun for legacy-filnavnene** som feiler (list dem eksplisitt), aldri hele mappa, og noter det i rapporten.

- [ ] **Step 6: Kjør tester, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS. Legacy-scener kompilerer fortsatt via shimen.

- [ ] **Step 7: Commit**

Legg til `src/audio/sound.ts`, `src/utils/audio.ts`, `src/audio/__tests__/sound.test.ts`, `package.json`, eventuelt `.eslintrc.json`. Melding: `refactor(audio): move chiptune engine to src/audio with configure()`.

---

### Task 2: Tastaturkontroller

**Files:**
- Create: `src/game/keyboard.ts`
- Test: `src/game/__tests__/keyboard.test.ts`

**Interfaces:**
- Consumes: `Intent`, `GestureEnv` fra `./gestures`.
- Produces:
  - `type KeyCode = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Space' | 'KeyQ' | 'KeyW' | 'KeyE' | 'KeyZ' | 'KeyR' | 'KeyJ' | 'KeyX' | 'Escape'`
  - `interface KeyEvt { readonly code: KeyCode; readonly shift: boolean }`
  - `type KeyIntent = Intent | { type: 'undo' } | { type: 'reset' }`
  - `interface KeyboardState { readonly cursor: number; readonly selected: number | null; readonly segment: { readonly anchor: number; readonly end: number } | null }`
  - `class KeyboardController { state: KeyboardState; constructor(env: GestureEnv); handle(evt: KeyEvt): KeyIntent[]; reset(): void; clampCursor(): void }`
  - Regler (spec §2 Tastatur): venstre/opp = markør −1, høyre/ned = +1, klemt til `0..count−1`. Shift+pil utvider segment fra markør (anker settes ved første shift-trykk), låste brikker stopper utvidelsen. Space: uten valg → velg markøren; med valg og markør på nabo → swap; med valg på samme → avvelg; med segment → ingenting. Q/W/E med segment → `segment`-intent (rotateLeft/mirror/rotateRight) og segment nullstilles; W på segment på 2 → hint `segmentTooShort`. Z → `undo`, R → `reset`, J → `insertWild` ved `at = cursor`, X → `remove` ved `index = cursor` (låst → hint `locked`, tom hånd → hint `handEmpty`). Escape → nullstill valg og segment. Space på låst brikke → hint `locked`. Pil uten shift etter valg: flytter markøren; er den nye markøren nabo til valgt, utføres swap og valget nullstilles.

- [ ] **Step 1: Skriv failing test**

`src/game/__tests__/keyboard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { KeyEvt } from '../keyboard';
import { KeyboardController } from '../keyboard';

const kb = (opts: Partial<{ count: number; locked: number[]; wild: boolean; remove: boolean }> = {}): KeyboardController =>
  new KeyboardController({
    count: () => opts.count ?? 6,
    isLocked: (i) => (opts.locked ?? []).includes(i),
    hasWild: () => opts.wild ?? true,
    canRemove: () => opts.remove ?? true,
  });

const key = (code: KeyEvt['code'], shift = false): KeyEvt => ({ code, shift });

describe('markør', () => {
  it('starter på 0 og klemmes', () => {
    const k = kb();
    expect(k.state.cursor).toBe(0);
    k.handle(key('ArrowLeft'));
    expect(k.state.cursor).toBe(0);
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowDown'));
    expect(k.state.cursor).toBe(2);
    for (let i = 0; i < 10; i++) k.handle(key('ArrowRight'));
    expect(k.state.cursor).toBe(5);
    k.handle(key('ArrowUp'));
    expect(k.state.cursor).toBe(4);
  });
});

describe('valg og swap', () => {
  it('space velger, pil mot nabo gir swap', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    expect(k.handle(key('Space'))).toEqual([]);
    expect(k.state.selected).toBe(1);
    expect(k.handle(key('ArrowRight'))).toEqual([{ type: 'swap', a: 1, b: 2 }]);
    expect(k.state.selected).toBeNull();
    expect(k.state.cursor).toBe(2);
  });
  it('space på valgt avvelger, space på låst gir hint', () => {
    const k = kb({ locked: [0] });
    expect(k.handle(key('Space'))).toEqual([{ type: 'hint', reason: 'locked' }]);
    k.handle(key('ArrowRight'));
    k.handle(key('Space'));
    expect(k.handle(key('Space'))).toEqual([]);
    expect(k.state.selected).toBeNull();
  });
  it('space med valg og markør på nabo gir swap', () => {
    const k = kb();
    k.handle(key('Space'));
    k.state = { ...k.state, cursor: 1 };
    expect(k.handle(key('Space'))).toEqual([{ type: 'swap', a: 0, b: 1 }]);
  });
});

describe('segment', () => {
  it('shift+pil utvider og Q/W/E utfører', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowRight', true));
    k.handle(key('ArrowRight', true));
    expect(k.state.segment).toEqual({ anchor: 1, end: 3 });
    expect(k.state.cursor).toBe(3);
    expect(k.handle(key('KeyE'))).toEqual([{ type: 'segment', from: 1, to: 3, action: 'rotateRight' }]);
    expect(k.state.segment).toBeNull();
  });
  it('utvidelse stopper ved låst brikke', () => {
    const k = kb({ locked: [3] });
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowRight', true));
    k.handle(key('ArrowRight', true));
    expect(k.state.segment).toEqual({ anchor: 1, end: 2 });
  });
  it('W på segment på 2 gir hint, Q gir rotateLeft', () => {
    const k = kb();
    k.handle(key('ArrowRight', true));
    expect(k.handle(key('KeyW'))).toEqual([{ type: 'hint', reason: 'segmentTooShort' }]);
    expect(k.state.segment).toEqual({ anchor: 0, end: 1 });
    expect(k.handle(key('KeyQ'))).toEqual([{ type: 'segment', from: 0, to: 1, action: 'rotateLeft' }]);
  });
  it('shift bakover fra anker', () => {
    const k = kb();
    k.state = { ...k.state, cursor: 3 };
    k.handle(key('ArrowLeft', true));
    k.handle(key('ArrowLeft', true));
    expect(k.state.segment).toEqual({ anchor: 3, end: 1 });
    expect(k.handle(key('KeyW'))).toEqual([{ type: 'segment', from: 1, to: 3, action: 'mirror' }]);
  });
  it('Q uten segment gir ingenting', () => {
    expect(kb().handle(key('KeyQ'))).toEqual([]);
  });
});

describe('hånd, undo, reset, escape', () => {
  it('J og X ved markør', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    expect(k.handle(key('KeyJ'))).toEqual([{ type: 'insertWild', at: 1 }]);
    expect(k.handle(key('KeyX'))).toEqual([{ type: 'remove', index: 1 }]);
  });
  it('J uten joker og X uten fjern gir hint', () => {
    const k = kb({ wild: false, remove: false });
    expect(k.handle(key('KeyJ'))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
    expect(k.handle(key('KeyX'))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });
  it('X på låst gir hint locked', () => {
    expect(kb({ locked: [0] }).handle(key('KeyX'))).toEqual([{ type: 'hint', reason: 'locked' }]);
  });
  it('Z og R', () => {
    const k = kb();
    expect(k.handle(key('KeyZ'))).toEqual([{ type: 'undo' }]);
    expect(k.handle(key('KeyR'))).toEqual([{ type: 'reset' }]);
  });
  it('Escape nullstiller valg og segment, beholder markør', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    k.handle(key('Space'));
    k.handle(key('Escape'));
    expect(k.state).toEqual({ cursor: 1, selected: null, segment: null });
  });
  it('clampCursor etter at brettet krympet', () => {
    const k = kb({ count: 3 });
    k.state = { cursor: 5, selected: 4, segment: null };
    k.clampCursor();
    expect(k.state).toEqual({ cursor: 2, selected: null, segment: null });
  });
});
```

- [ ] **Step 2: Kjør test, se den feile**

Run: `npm test`
Expected: FAIL, `Cannot find module '../keyboard'`.

- [ ] **Step 3: Implementer keyboard.ts**

```ts
import type { GestureEnv, Intent, SegmentAction } from './gestures';

export type KeyCode =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Space'
  | 'KeyQ'
  | 'KeyW'
  | 'KeyE'
  | 'KeyZ'
  | 'KeyR'
  | 'KeyJ'
  | 'KeyX'
  | 'Escape';

export interface KeyEvt {
  readonly code: KeyCode;
  readonly shift: boolean;
}

export type KeyIntent = Intent | { readonly type: 'undo' } | { readonly type: 'reset' };

export interface KeyboardState {
  readonly cursor: number;
  readonly selected: number | null;
  readonly segment: { readonly anchor: number; readonly end: number } | null;
}

const SEGMENT_KEYS: Readonly<Partial<Record<KeyCode, SegmentAction>>> = {
  KeyQ: 'rotateLeft',
  KeyW: 'mirror',
  KeyE: 'rotateRight',
};

const step = (code: KeyCode): -1 | 1 | 0 =>
  code === 'ArrowLeft' || code === 'ArrowUp' ? -1 : code === 'ArrowRight' || code === 'ArrowDown' ? 1 : 0;

/**
 * Tastaturstyring for desktop. Eier egen markør, valg og segment, og produserer
 * de samme intensjonene som GestureMachine pluss undo/reset. Scenen kaller
 * clampCursor() etter hver brettendring.
 */
export class KeyboardController {
  state: KeyboardState = { cursor: 0, selected: null, segment: null };

  constructor(private readonly env: GestureEnv) {}

  reset(): void {
    this.state = { cursor: 0, selected: null, segment: null };
  }

  clampCursor(): void {
    const max = Math.max(0, this.env.count() - 1);
    const cursor = Math.min(this.state.cursor, max);
    const selected = this.state.selected !== null && this.state.selected <= max ? this.state.selected : null;
    const seg = this.state.segment;
    const segment = seg !== null && seg.anchor <= max && seg.end <= max ? seg : null;
    this.state = { cursor, selected, segment };
  }

  handle(evt: KeyEvt): KeyIntent[] {
    const d = step(evt.code);
    if (d !== 0) return evt.shift ? this.extend(d) : this.move(d);
    switch (evt.code) {
      case 'Space':
        return this.space();
      case 'KeyQ':
      case 'KeyW':
      case 'KeyE':
        return this.segmentAction(SEGMENT_KEYS[evt.code] ?? 'mirror');
      case 'KeyZ':
        return [{ type: 'undo' }];
      case 'KeyR':
        return [{ type: 'reset' }];
      case 'KeyJ':
        return this.env.hasWild() ? [{ type: 'insertWild', at: this.state.cursor }] : [{ type: 'hint', reason: 'handEmpty' }];
      case 'KeyX':
        if (this.env.isLocked(this.state.cursor)) return [{ type: 'hint', reason: 'locked' }];
        return this.env.canRemove() ? [{ type: 'remove', index: this.state.cursor }] : [{ type: 'hint', reason: 'handEmpty' }];
      case 'Escape':
        this.state = { ...this.state, selected: null, segment: null };
        return [];
      default:
        return [];
    }
  }

  private clamp(i: number): number {
    return Math.max(0, Math.min(this.env.count() - 1, i));
  }

  private move(d: -1 | 1): KeyIntent[] {
    const cursor = this.clamp(this.state.cursor + d);
    const sel = this.state.selected;
    if (sel !== null && Math.abs(cursor - sel) === 1 && !this.env.isLocked(cursor)) {
      this.state = { cursor, selected: null, segment: null };
      return [{ type: 'swap', a: sel, b: cursor }];
    }
    this.state = { ...this.state, cursor, segment: null };
    return [];
  }

  private extend(d: -1 | 1): KeyIntent[] {
    const seg = this.state.segment ?? { anchor: this.state.cursor, end: this.state.cursor };
    const next = this.clamp(seg.end + d);
    if (next === seg.end || this.env.isLocked(next)) return [];
    this.state = { cursor: next, selected: null, segment: { anchor: seg.anchor, end: next } };
    return [];
  }

  private space(): KeyIntent[] {
    if (this.state.segment !== null) return [];
    const c = this.state.cursor;
    const sel = this.state.selected;
    if (sel === null) {
      if (this.env.isLocked(c)) return [{ type: 'hint', reason: 'locked' }];
      this.state = { ...this.state, selected: c };
      return [];
    }
    if (sel === c) {
      this.state = { ...this.state, selected: null };
      return [];
    }
    if (Math.abs(sel - c) === 1) {
      if (this.env.isLocked(c)) return [{ type: 'hint', reason: 'locked' }];
      this.state = { ...this.state, selected: null };
      return [{ type: 'swap', a: sel, b: c }];
    }
    this.state = { ...this.state, selected: c };
    return [];
  }

  private segmentAction(action: SegmentAction): KeyIntent[] {
    const seg = this.state.segment;
    if (seg === null) return [];
    const from = Math.min(seg.anchor, seg.end);
    const to = Math.max(seg.anchor, seg.end);
    if (action === 'mirror' && to - from + 1 < 3) return [{ type: 'hint', reason: 'segmentTooShort' }];
    this.state = { ...this.state, segment: null };
    return [{ type: 'segment', from, to, action }];
  }
}
```

- [ ] **Step 4: Kjør tester, typecheck og lint**

Run: `npm test && npm run typecheck && npm run lint:core`
Expected: alle PASS.

- [ ] **Step 5: Commit**

Legg til `src/game/keyboard.ts` og testen. Melding: `feat(game): keyboard controller for desktop`.

---

### Task 3: App-skjelett: Boot, Meny, Innstillinger, tjenester

**Files:**
- Modify: `index.html`, `vite.config.ts`, `src/main.ts`
- Create: `src/vite-env.d.ts`, `src/scenes/services.ts`, `src/scenes/ui.ts`, `src/scenes/BootScene2.ts`, `src/scenes/MenuScene2.ts`, `src/scenes/SettingsScene2.ts`
- (Legacy `BootScene.ts`, `MenuScene.ts`, `SettingsScene.ts` finnes; de nye får suffiks `2` til plan 3 sletter legacy og døper om.)

**Interfaces:**
- Produces:
  - `interface Services { readonly store: SaveStore; readonly mode: CampaignMode; readonly solver: SolverPort; readonly settings: () => Settings }`
  - `createServices(): Services`, `installServices(game, services)`, `services(scene): Services`
  - `createSolverPort(worker: Worker): SolverPort` — adapter mellom DOM `Worker` og `WorkerLike` (strictFunctionTypes gjør at `Worker` ikke er direkte tilordnbar).
  - `ui.ts`: `makeButton(scene, opts: { x; y; width; height; label; accent; onClick }): Phaser.GameObjects.Container`, `makeLabel(scene, x, y, text, opts: { size; color?; font?; align? }): Phaser.GameObjects.Text`, `SCENE = { boot: 'Boot2', menu: 'Menu2', worldMap: 'WorldMap2', board: 'Board2', result: 'Result2', settings: 'Settings2' } as const`
  - `BootScene2` laster fonter, lager tjenester, konfigurerer lyd fra innstillinger, og starter `Menu2`, eller `Board2` med `{ levelId }` når `import.meta.env.DEV` og URL har `?level=`.
  - `Board2` og `WorldMap2` finnes ikke ennå: Boot starter dem via `SCENE`-navn; Task 4 og 6 registrerer dem. Inntil da starter Boot alltid `Menu2`, og «Spill» i menyen er deaktivert hvis `WorldMap2` ikke er registrert (`this.scene.get(SCENE.worldMap) === null`).

- [ ] **Step 1: index.html**

Legg til i `<head>` før `<style>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet" />
```

Endre `background-color: #1a1a2e` til `#fff8ef` (samme som `COLORS.background`; eneste tillatte hex utenfor tema).

- [ ] **Step 2: vite.config.ts og vite-env**

I `vite.config.ts` legg til `worker: { format: 'es' },` på toppnivå i `defineConfig`. Opprett `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 3: services.ts**

```ts
import type Phaser from 'phaser';
import { SolverClient } from '../core/solverClient';
import type { WorkerLike, WorkerOut } from '../core/solverProtocol';
import type { Settings } from '../core/storage';
import { CampaignMode } from '../game/modes/campaign';
import { SaveStore } from '../game/saveStore';
import type { SolverPort } from '../game/session';

export interface Services {
  readonly store: SaveStore;
  readonly mode: CampaignMode;
  readonly solver: SolverPort;
  readonly settings: () => Settings;
}

const REGISTRY_KEY = 'services';

/** DOM Worker er ikke direkte tilordnbar til WorkerLike under strictFunctionTypes. */
export const createSolverPort = (worker: Worker): SolverPort => {
  const like: WorkerLike = {
    postMessage: (msg) => worker.postMessage(msg),
    onmessage: null,
  };
  worker.onmessage = (ev: MessageEvent<WorkerOut>): void => {
    like.onmessage?.({ data: ev.data });
  };
  return new SolverClient(like);
};

export const createServices = (): Services => {
  const store = new SaveStore(window.localStorage);
  const worker = new Worker(new URL('../core/solver.worker.ts', import.meta.url), { type: 'module' });
  return {
    store,
    mode: new CampaignMode(store),
    solver: createSolverPort(worker),
    settings: () => store.data.settings,
  };
};

export const installServices = (game: Phaser.Game, s: Services): void => {
  game.registry.set(REGISTRY_KEY, s);
};

export const services = (scene: Phaser.Scene): Services => scene.registry.get(REGISTRY_KEY) as Services;
```

- [ ] **Step 4: ui.ts**

```ts
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
```

- [ ] **Step 5: BootScene2.ts**

```ts
import Phaser from 'phaser';
import { parseLevelId } from '../core/progression';
import { audio } from '../audio/sound';
import { COLORS, cssColor, FONTS } from '../theme/theme';
import { createServices, installServices } from './services';
import { SCENE } from './ui';

const FONT_TIMEOUT_MS = 2000;

const loadFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = [document.fonts.load(`600 24px ${FONTS.display}`), document.fonts.load(`400 16px ${FONTS.body}`)];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([Promise.allSettled(loads).then(() => undefined), timeout]);
};

export class BootScene2 extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(cssColor(COLORS.background));
    const s = createServices();
    installServices(this.game, s);
    audio.configure({ sound: s.settings().sound, music: s.settings().music });
    void loadFonts().then(() => this.next(), () => this.next());
  }

  private next(): void {
    const level = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('level') : null;
    if (level !== null && parseLevelId(level) !== null && this.scene.get(SCENE.board) !== null) {
      this.scene.start(SCENE.board, { levelId: level });
      return;
    }
    this.scene.start(SCENE.menu);
  }
}
```

- [ ] **Step 6: MenuScene2.ts**

```ts
import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, SPACE, worldAccent } from '../theme/theme';
import { makeButton, makeLabel, SCENE } from './ui';

export class MenuScene2 extends Phaser.Scene {
  constructor() {
    super(SCENE.menu);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.children.removeAll(true);
      this.build();
    });
    this.input.once('pointerdown', () => audio.startMusic('menu'));
  }

  private build(): void {
    const cx = this.scale.width / 2;
    const h = this.scale.height;
    makeLabel(this, cx, h * 0.28, 'Palintris', { size: 56, color: worldAccent(1), bold: true });
    makeLabel(this, cx, h * 0.28 + 44, 'Gjør rekka til et palindrom', { size: 18, color: COLORS.inkMuted, font: 'body' });
    const canPlay = this.scene.get(SCENE.worldMap) !== null;
    makeButton(this, { x: cx, y: h * 0.55, width: 220, height: 56, label: 'Spill', accent: worldAccent(1), enabled: canPlay, onClick: () => this.scene.start(SCENE.worldMap) });
    makeButton(this, { x: cx, y: h * 0.55 + 56 + SPACE.lg, width: 220, height: 48, label: 'Innstillinger', accent: COLORS.inkMuted, onClick: () => this.scene.start(SCENE.settings) });
  }
}
```

- [ ] **Step 7: SettingsScene2.ts**

Fire rader med tekst og en toggle-knapp («På»/«Av») for `sound`, `music`, `reducedMotion`, `colorBlind`, pluss «Tilbake». Ved endring: `services(this).store.setSettings({ [key]: value })` og `audio.configure({ sound, music })`. Bygg på samme måte som Menu (build + resize). Toggle-knapp: `makeButton` med bredde 96, accent `COLORS.success` når på, `COLORS.locked` når av; teksten oppdateres ved å bygge raden på nytt.

```ts
import Phaser from 'phaser';
import type { Settings } from '../core/storage';
import { audio } from '../audio/sound';
import { COLORS, SPACE, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';

const ROWS: ReadonlyArray<{ key: keyof Settings; label: string }> = [
  { key: 'sound', label: 'Lyd' },
  { key: 'music', label: 'Musikk' },
  { key: 'reducedMotion', label: 'Redusert bevegelse' },
  { key: 'colorBlind', label: 'Fargeblind-mønster' },
];

export class SettingsScene2 extends Phaser.Scene {
  constructor() {
    super(SCENE.settings);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.rebuild());
  }

  private rebuild(): void {
    this.children.removeAll(true);
    this.build();
  }

  private build(): void {
    const s = services(this);
    const cx = this.scale.width / 2;
    makeLabel(this, cx, 60, 'Innstillinger', { size: 32, bold: true });
    ROWS.forEach((row, i) => {
      const y = 130 + i * (48 + SPACE.lg);
      const on = s.settings()[row.key];
      makeLabel(this, cx - 120, y, row.label, { size: 18, font: 'body', align: 'left' });
      makeButton(this, {
        x: cx + 100, y, width: 96, height: 40, label: on ? 'På' : 'Av', accent: on ? COLORS.success : COLORS.locked,
        onClick: () => {
          s.store.setSettings({ [row.key]: !on });
          audio.configure({ sound: s.settings().sound, music: s.settings().music });
          this.rebuild();
        },
      });
    });
    makeButton(this, { x: cx, y: this.scale.height - 80, width: 180, height: 48, label: 'Tilbake', accent: worldAccent(1), onClick: () => this.scene.start(SCENE.menu) });
  }
}
```

- [ ] **Step 8: main.ts**

Erstatt hele fila:

```ts
import Phaser from 'phaser';
import { BootScene2 } from './scenes/BootScene2';
import { MenuScene2 } from './scenes/MenuScene2';
import { SettingsScene2 } from './scenes/SettingsScene2';
import { COLORS, cssColor } from './theme/theme';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: cssColor(COLORS.background),
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  input: { mouse: true, touch: true },
  scene: [BootScene2, MenuScene2, SettingsScene2],
};

new Phaser.Game(config);
```

- [ ] **Step 9: Verifiser**

Run: `npm test && npm run typecheck && npm run lint:core && npm run build`
Expected: alle grønne; `dist/` inneholder en egen worker-chunk for `solver.worker`. Start `npm run dev` og hent `http://localhost:3000/` med `curl -s | head -5` for å se at siden svarer; visuell sjekk kommer med Playwright i Task 7.

- [ ] **Step 10: Commit**

Legg til alle nye/endrede filer. Melding: `feat(scenes): app skeleton with boot, menu, settings and services`.

---

### Task 4: Brikker, effekter og BoardScene (tegning)

**Files:**
- Create: `src/scenes/TileView.ts`, `src/scenes/effects.ts`, `src/scenes/BoardScene2.ts`, `src/scenes/testHook.ts`
- Modify: `src/main.ts` (registrer `BoardScene2`)

**Interfaces:**
- Produces:
  - `class TileView extends Phaser.GameObjects.Container { readonly tileId: number; setTile(tile: Tile, size: number, colorBlind: boolean): void; setFlags(f: Partial<TileFlags>): void; get flags(): TileFlags }`, `interface TileFlags { matched: boolean; selected: boolean; segment: boolean; ghost: boolean; cursor: boolean }`
  - `class Effects { constructor(scene, reducedMotion: boolean); nudge(): void; flash(color: number, alpha?: number): void; confetti(x, y, count?): void; mirrorWave(layout: BoardLayout, originX, originY, scale): void; starFall(count: number): void }`
  - `interface TestHook { levelId: string; view(): SessionView; screenLayout(): { slots: {index; x; y}[]; gaps: {at; x; y}[]; tile: number }; menu(): { action: SegmentAction; x; y }[] | null; zones(): { wild: {x;y}; remove: {x;y}; undo: {x;y}; reset: {x;y} }; busy(): boolean; state(): GestureState }` og `declare global { interface Window { __palintris?: TestHook } }`; hooken installeres kun når `import.meta.env.DEV`.
  - `BoardScene2` med `init(data: { levelId: string })`, `create()`, `update(time)`, og private: `relayout()`, `render()`, `buildHud()`, `buildHand()`, `drawMirror()`, `screenPoint(x, y)`.

- [ ] **Step 1: TileView.ts**

Tegnes med Graphics, ingen sprites. Størrelse settes ved `setTile`. Alt regnes relativt til `size`.

```ts
import Phaser from 'phaser';
import type { Tile } from '../core/tiles';
import type { TilePattern } from '../theme/theme';
import { COLORS, cssColor, FONTS, RADIUS, symbolColor, symbolPattern, WORLD_ACCENTS } from '../theme/theme';

export interface TileFlags {
  matched: boolean;
  selected: boolean;
  segment: boolean;
  ghost: boolean;
  cursor: boolean;
}

const drawPattern = (g: Phaser.GameObjects.Graphics, pattern: TilePattern, size: number): void => {
  const h = size / 2;
  const step = size / 5;
  g.lineStyle(2, COLORS.ink, 0.18);
  g.fillStyle(COLORS.ink, 0.18);
  switch (pattern) {
    case 'dots':
      for (let y = -h + step; y < h; y += step) for (let x = -h + step; x < h; x += step) g.fillCircle(x, y, size * 0.04);
      break;
    case 'stripes':
      for (let d = -size; d < size; d += step) g.lineBetween(-h + d, h, h + d, -h);
      break;
    case 'rings':
      for (let r = step; r < h; r += step) g.strokeCircle(0, 0, r);
      break;
    case 'cross':
      g.lineBetween(-h, -h, h, h);
      g.lineBetween(-h, h, h, -h);
      break;
    case 'checks':
      for (let y = -h; y < h; y += step)
        for (let x = -h; x < h; x += step) if (((x + h) / step + (y + h) / step) % 2 < 1) g.fillRect(x, y, step, step);
      break;
    case 'waves':
      for (let y = -h + step; y < h; y += step) {
        g.beginPath();
        for (let x = -h; x <= h; x += 2) g.lineTo(x, y + Math.sin((x / size) * Math.PI * 4) * step * 0.3);
        g.strokePath();
      }
      break;
  }
};

export class TileView extends Phaser.GameObjects.Container {
  tileId: number;
  private tile: Tile;
  private size = 60;
  private colorBlind = false;
  private current: TileFlags = { matched: false, selected: false, segment: false, ghost: false, cursor: false };
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly pattern: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly lock: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tile: Tile) {
    super(scene, 0, 0);
    this.tile = tile;
    this.tileId = tile.id;
    this.bg = scene.add.graphics();
    this.pattern = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', { fontFamily: FONTS.display, fontStyle: 'bold', color: cssColor(COLORS.ink) }).setOrigin(0.5, 0.55);
    this.lock = scene.add.graphics();
    this.add([this.bg, this.pattern, this.ring, this.label, this.lock]);
    scene.add.existing(this);
  }

  get flags(): TileFlags {
    return { ...this.current };
  }

  setTile(tile: Tile, size: number, colorBlind: boolean): void {
    this.tile = tile;
    this.tileId = tile.id;
    this.size = size;
    this.colorBlind = colorBlind;
    this.redraw();
  }

  setFlags(f: Partial<TileFlags>): void {
    this.current = { ...this.current, ...f };
    this.redraw();
  }

  private redraw(): void {
    const s = this.size;
    const r = RADIUS.tile * (s / 60);
    const t = this.tile;
    const fill = t.wild ? COLORS.wild : t.locked ? COLORS.locked : symbolColor(t.symbol);

    this.bg.clear();
    this.bg.fillStyle(COLORS.ink, 0.12);
    this.bg.fillRoundedRect(-s / 2 + 2, -s / 2 + 4, s, s, r);
    this.bg.fillStyle(fill, 1);
    this.bg.fillRoundedRect(-s / 2, -s / 2, s, s, r);
    if (t.wild) {
      WORLD_ACCENTS.forEach((c, i) => {
        this.bg.lineStyle(4, c, 1);
        const a0 = (i / WORLD_ACCENTS.length) * Math.PI * 2;
        const a1 = ((i + 1) / WORLD_ACCENTS.length) * Math.PI * 2;
        this.bg.beginPath();
        this.bg.arc(0, 0, s / 2 - 3, a0, a1);
        this.bg.strokePath();
      });
    }

    this.pattern.clear();
    if (this.colorBlind && !t.wild) drawPattern(this.pattern, symbolPattern(t.symbol), s * 0.8);

    this.label.setText(t.wild ? '★' : t.symbol);
    this.label.setFontSize(Math.round(s * 0.5));
    this.label.setColor(cssColor(t.locked ? COLORS.panel : COLORS.ink));

    this.lock.clear();
    if (t.locked) {
      const k = s * 0.14;
      this.lock.fillStyle(COLORS.ink, 0.8);
      this.lock.fillRoundedRect(s / 2 - k * 2.2, -s / 2 + k * 0.6, k * 1.6, k * 1.2, k * 0.2);
      this.lock.lineStyle(k * 0.3, COLORS.ink, 0.8);
      this.lock.beginPath();
      this.lock.arc(s / 2 - k * 1.4, -s / 2 + k * 0.6, k * 0.5, Math.PI, 0);
      this.lock.strokePath();
    }

    this.ring.clear();
    const f = this.current;
    if (f.segment) {
      this.ring.fillStyle(COLORS.ink, 0.18);
      this.ring.fillRoundedRect(-s / 2, -s / 2, s, s, r);
    }
    if (f.matched) {
      this.ring.lineStyle(4, COLORS.success, 0.9);
      this.ring.strokeRoundedRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4, r + 2);
    }
    if (f.selected || f.cursor) {
      this.ring.lineStyle(3, COLORS.ink, f.selected ? 1 : 0.5);
      this.ring.strokeRoundedRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8, r + 3);
    }
    this.setAlpha(f.ghost ? 0.5 : 1);
  }
}
```

- [ ] **Step 2: effects.ts**

```ts
import Phaser from 'phaser';
import type { BoardLayout } from '../game/layout';
import { COLORS, DURATION, durations, EASING, WORLD_ACCENTS } from '../theme/theme';

/** Fem effekter fra spec §4. Alle respekterer redusert bevegelse. */
export class Effects {
  private readonly d: Readonly<Record<keyof typeof DURATION, number>>;

  constructor(private readonly scene: Phaser.Scene, private readonly reduced: boolean) {
    this.d = durations(reduced);
  }

  nudge(): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(this.d.snap, 0.003);
  }

  flash(color: number, alpha = 0.25): void {
    if (this.reduced) return;
    const g = this.scene.add.graphics().setDepth(900);
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: this.d.normal, ease: EASING.fade, onComplete: () => g.destroy() });
  }

  confetti(x: number, y: number, count = 40): void {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      const color = WORLD_ACCENTS[i % WORLD_ACCENTS.length] ?? COLORS.success;
      const piece = this.scene.add.rectangle(x, y, 6, 10, color).setDepth(800);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      this.scene.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 80,
        angle: Math.random() * 720,
        alpha: 0,
        duration: this.d.ceremony,
        ease: EASING.move,
        onComplete: () => piece.destroy(),
      });
    }
  }

  /** Bølge fra speillinja og ut, i skjermkoordinater. */
  mirrorWave(layout: BoardLayout, originX: number, originY: number, scale: number): void {
    const m = layout.mirror;
    const x1 = originX + m.x1 * scale;
    const y1 = originY + m.y1 * scale;
    const x2 = originX + m.x2 * scale;
    const y2 = originY + m.y2 * scale;
    const horizontal = y1 === y2;
    const len = horizontal ? x2 - x1 : y2 - y1;
    const bar = this.scene.add
      .rectangle((x1 + x2) / 2, (y1 + y2) / 2, horizontal ? len : 6, horizontal ? 6 : len, COLORS.success, 0.6)
      .setDepth(700);
    const grow = layout.tile * scale * (layout.kind === 'row' ? 3 : 1.6);
    this.scene.tweens.add({
      targets: bar,
      ...(horizontal ? { scaleY: grow / 6 } : { scaleX: grow / 6 }),
      alpha: 0,
      duration: this.reduced ? this.d.snap : this.d.calm,
      ease: EASING.fade,
      onComplete: () => bar.destroy(),
    });
  }

  starFall(count: number): void {
    if (this.reduced) return;
    const w = this.scene.scale.width;
    for (let i = 0; i < count; i++) {
      const star = this.scene.add.text(Math.random() * w, -20, '★', { fontSize: '24px', color: '#ffd166' }).setDepth(800);
      this.scene.tweens.add({
        targets: star,
        y: this.scene.scale.height + 30,
        angle: 180,
        duration: this.d.ceremony + Math.random() * this.d.ceremony,
        delay: Math.random() * this.d.calm,
        ease: EASING.move,
        onComplete: () => star.destroy(),
      });
    }
  }
}
```

Merk: stjernefargen `'#ffd166'` er et unntak fra «ingen hex i scener»; legg heller `star: 0xffd166` inn i `COLORS` i `src/theme/theme.ts` og bruk `cssColor(COLORS.star)`. Gjør det i denne tasken.

- [ ] **Step 3: testHook.ts**

```ts
import type { GestureState, SegmentAction } from '../game/gestures';
import type { SessionView } from '../game/session';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface TestHook {
  readonly levelId: string;
  view(): SessionView;
  screenLayout(): { readonly slots: ReadonlyArray<ScreenPoint & { index: number }>; readonly gaps: ReadonlyArray<ScreenPoint & { at: number }>; readonly tile: number };
  menu(): ReadonlyArray<ScreenPoint & { action: SegmentAction }> | null;
  zones(): { readonly wild: ScreenPoint; readonly remove: ScreenPoint; readonly undo: ScreenPoint; readonly reset: ScreenPoint };
  busy(): boolean;
  state(): GestureState;
}

declare global {
  interface Window {
    __palintris?: TestHook;
  }
}

export const installHook = (hook: TestHook): void => {
  if (import.meta.env.DEV) window.__palintris = hook;
};

export const removeHook = (): void => {
  if (import.meta.env.DEV) delete window.__palintris;
};
```

- [ ] **Step 4: BoardScene2.ts (tegning)**

Klasseskjelett med alle felt og signaturer. Metodekroppene som ikke er gitt i kode beskrives; implementer dem etter beskrivelsen.

```ts
import Phaser from 'phaser';
import { matches } from '../core/palindrome';
import type { Tile } from '../core/tiles';
import type { GestureState, SegmentAction, Target } from '../game/gestures';
import { GestureMachine } from '../game/gestures';
import { KeyboardController } from '../game/keyboard';
import type { BoardLayout } from '../game/layout';
import { computeLayout, hitGap, hitTile } from '../game/layout';
import type { ModeLevel } from '../game/modes/types';
import type { SessionView } from '../game/session';
import { BoardSession } from '../game/session';
import { COLORS, DURATION, durations, EASING, SPACE, worldAccent } from '../theme/theme';
import { Effects } from './effects';
import { services } from './services';
import { installHook, removeHook } from './testHook';
import { TileView } from './TileView';
import { makeButton, makeLabel, SCENE, contentLeft, contentWidth } from './ui';

interface BoardData {
  readonly levelId: string;
}

const HUD_HEIGHT = 96;
const HAND_HEIGHT = 120;

export class BoardScene2 extends Phaser.Scene {
  private levelId = '';
  private level!: ModeLevel;
  private session!: BoardSession;
  private machine!: GestureMachine;
  private keyboard!: KeyboardController;
  private effects!: Effects;
  private layout!: BoardLayout;
  private originX = 0;
  private originY = 0;
  private tiles = new Map<number, TileView>();
  private mirrorGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private hand!: Phaser.GameObjects.Container;
  private menu: Phaser.GameObjects.Container | null = null;
  private banner: Phaser.GameObjects.Container | null = null;
  private inputLocked = false;
  private pendingTweens = 0;
  private view!: SessionView;
  private d = durations(false);

  constructor() {
    super(SCENE.board);
  }

  init(data: BoardData): void {
    this.levelId = data.levelId;
  }

  create(): void {
    const s = services(this);
    const level = s.mode.load(this.levelId);
    if (level === null) {
      this.scene.start(SCENE.menu);
      return;
    }
    this.level = level;
    this.d = durations(s.settings().reducedMotion);
    this.effects = new Effects(this, s.settings().reducedMotion);
    this.session = new BoardSession({
      rules: level.rules,
      tiles: level.tiles,
      hand: level.hand,
      target: level.target,
      budget: level.budget,
      solver: s.solver,
      onChange: (v) => this.onViewChange(v),
    });
    this.view = this.session.view();
    const env = {
      count: () => this.view.tiles.length,
      isLocked: (i: number) => this.view.tiles[i]?.locked === true,
      hasWild: () => this.view.hand.wild > 0,
      canRemove: () => this.view.hand.remove > 0,
    };
    this.machine = new GestureMachine(env);
    this.keyboard = new KeyboardController(env);
    this.mirrorGfx = this.add.graphics().setDepth(1);
    this.hud = this.add.container(0, 0).setDepth(10);
    this.hand = this.add.container(0, 0).setDepth(10);
    this.relayout();
    this.render(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.relayout();
      this.render(false);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    installHook(this.makeHook());
    // Task 5 legger til setupInput() her.
  }

  update(time: number): void {
    // Task 5: this.machine.tick(time) og segmentmarkering.
    void time;
  }

  private teardown(): void {
    removeHook();
    this.session.dispose();
  }

  /** Brettområdet: mellom HUD og hånd, maks 480 bredt, sentrert. */
  private relayout(): void { /* se beskrivelse */ }

  /** Tegner alt fra this.view: brikker (opprett/oppdater/fjern etter id), speillinje, HUD, hånd. animate styrer om brikker tweenes til plass. */
  private render(animate: boolean): void { /* se beskrivelse */ }

  private onViewChange(v: SessionView): void {
    this.view = v;
    this.keyboard.clampCursor();
    this.render(true);
    // Task 5: banner for deadEnd, løsning → Result.
  }

  private screenPoint(x: number, y: number): { x: number; y: number } {
    return { x: this.originX + x * this.layout.scale, y: this.originY + y * this.layout.scale };
  }

  private drawMirror(): void { /* se beskrivelse */ }
  private buildHud(): void { /* se beskrivelse */ }
  private buildHand(): void { /* se beskrivelse */ }

  private makeHook(): import('./testHook').TestHook {
    return {
      levelId: this.levelId,
      view: () => this.view,
      screenLayout: () => ({
        slots: this.layout.slots.map((s) => ({ index: s.index, ...this.screenPoint(s.x, s.y) })),
        gaps: this.layout.gaps.map((g) => ({ at: g.at, ...this.screenPoint(g.x, g.y) })),
        tile: this.layout.tile * this.layout.scale,
      }),
      menu: () => null, // Task 5
      zones: () => this.zones(),
      busy: () => this.inputLocked || this.pendingTweens > 0,
      state: () => this.machine.state,
    };
  }

  private zones(): { wild: { x: number; y: number }; remove: { x: number; y: number }; undo: { x: number; y: number }; reset: { x: number; y: number } } {
    /* returner sentrum av hånd-sonene og knappene, satt i buildHand */
    return this.zoneCache;
  }
  private zoneCache = { wild: { x: 0, y: 0 }, remove: { x: 0, y: 0 }, undo: { x: 0, y: 0 }, reset: { x: 0, y: 0 } };
}
```

Beskrivelse av kroppene:

- `relayout()`: `w = contentWidth(this)`, `left = contentLeft(this)`, `boardTop = HUD_HEIGHT`, `boardHeight = this.scale.height − HUD_HEIGHT − HAND_HEIGHT`. `this.layout = computeLayout({ count: this.view.tiles.length, width: w, height: boardHeight })`. `originX = left + (w − layout.width · layout.scale) / 2`, `originY = boardTop + (boardHeight − layout.height · layout.scale) / 2`. Kall `drawMirror()`, `buildHud()`, `buildHand()`.
- `render(animate)`: For hver `tile` i `view.tiles` med indeks `i`: hent `TileView` fra `this.tiles` på `tile.id` eller opprett (`new TileView(this, tile)`, depth 5, plasser direkte på slot-posisjonen, ved `animate` skaler fra 0 til 1 med `EASING.pop` over `d.normal`). Kall `setTile(tile, layout.tile · layout.scale, settings.colorBlind)`. Målposisjon `p = screenPoint(slot.x, slot.y)`; ved `animate` og posisjon ulik: `pendingTweens++`, tween `x, y` over `d.normal` med `EASING.move`, `onComplete: pendingTweens--`; ellers sett direkte. Views hvis id ikke finnes lenger: ved `animate` tween scale→0 og alpha→0 over `d.snap` og destroy, ellers destroy. Matchede par: for `i < floor(n/2)`, `matched = matches(tiles[i], tiles[n−1−i])`; sett `matched` på begge; midtbrikke ved oddetall får `matched: true`. Hvis layoutets `kind` skiftet siden forrige render (lagre forrige kind): `inputLocked = true` til alle tweens er ferdige (sjekk i `update` når `pendingTweens === 0`). Oppdater HUD-tekster.
- `drawMirror()`: clear; `lineStyle(3, worldAccent(level.world), 0.6)`; linje fra `screenPoint(mirror.x1, y1)` til `screenPoint(x2, y2)`; for rad-layout tegn i tillegg to små trekanter i endene (valgfritt, hold det enkelt: bare linja).
- `buildHud()`: tøm `this.hud`; venstre: «Verden {world} · Nivå {n}» (size 16, body, inkMuted); midt: «Trekk {movesUsed} / mål {target}» (size 22, display, bold); høyre: «Budsjett {budgetLeft}» (16). Bakgrunn: fylt rektangel `COLORS.panel` med `worldAccent`-stripe 4 px i bunn over hele bredden.
- `buildHand()`: tøm `this.hand`; y-senter `this.scale.height − HAND_HEIGHT/2`. Fire soner på en rad innen `contentWidth`: «Joker ×{wild}» (sone med stiplet ramme; når 0 dempet), «Fjern ×{remove}» (samme), «Angre»-knapp (`makeButton`, enabled `view.canUndo`), «Reset»-knapp. Lagre sentrum i `zoneCache`. Angre-klikk: `this.session.dispatch({ type: 'undo' })` og `audio.playUndo()`; Reset: `dispatch({ type: 'reset' })`. (Bruk `audio` fra `../audio/sound`.)

- [ ] **Step 5: Registrer scenen**

I `src/main.ts`: importer `BoardScene2` og legg den i `scene`-lista etter `MenuScene2`.

- [ ] **Step 6: Verifiser**

Run: `npm test && npm run typecheck && npm run lint:core && npm run build`
Expected: grønt. Manuell sjekk: `npm run dev`, åpne `http://localhost:3000/?level=w1-01` i nettleser (implementer kan ikke se; verifiser med `curl` at bundlen bygger og at ingen typefeil). Playwright i Task 7 verifiserer tegning via hooken.

- [ ] **Step 7: Commit**

Melding: `feat(scenes): board scene renders tiles, mirror line, hud and hand`.

---

### Task 5: BoardScene input, animasjon, blindgate og løsning

**Files:**
- Modify: `src/scenes/BoardScene2.ts`
- Create: `src/scenes/SegmentMenu.ts`

**Interfaces:**
- Produces:
  - `class SegmentMenu extends Phaser.GameObjects.Container { constructor(scene, onPick: (a: SegmentAction) => void); show(x: number, y: number, mirrorEnabled: boolean): void; hide(): void; hitAction(x: number, y: number): SegmentAction | null; positions(): { action: SegmentAction; x: number; y: number }[] }` — tre runde knapper (⟲, ⇋, ⟳) på rad, 44 px, `worldAccent`, speil dempet når `mirrorEnabled` er false.
  - I `BoardScene2`: `setupInput()`, `resolveTarget(x, y): Target`, `applyIntents(intents: Intent[]): void`, `showHint(reason)`, `showDeadEnd()`, `hideBanner()`, `onSolved()`; hooken får `menu()` implementert.

- [ ] **Step 1: SegmentMenu.ts**

Container med tre `makeButton`-lignende sirkler (tegn med Graphics `fillCircle` radius 22 og `makeLabel` med tegnene `⟲`, `⇋`, `⟳`, size 22, farge `COLORS.panel`), sentrert rundt `(0,0)` med 56 px mellomrom. `show(x, y, mirrorEnabled)` setter posisjon (klemt så menyen holder seg innen `scene.scale.width` med 8 px marg) og synlighet; speil-knappen får alpha 0.4 når deaktivert. `hitAction(x, y)` returnerer handlingen for knappen innen radius 26 av punktet, ellers null. `positions()` returnerer skjermkoordinater for hooken. Depth 20.

- [ ] **Step 2: setupInput()**

Kalles på slutten av `create()`. Pekerhendelser fra scenens `input`:

```ts
this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.pointer('down', p));
this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.pointer('move', p));
this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.pointer('up', p));
this.input.on(Phaser.Input.Events.GAME_OUT, () => this.cancelPointer());
```

`pointer(type, p)`: hvis `inputLocked` eller `view.solved` → return; hvis `deadEnd` og målet ikke er angre/reset → return (knappene er egne interaktive objekter og håndterer seg selv). `target = resolveTarget(p.x, p.y)`; `intents = machine.handle({ type, x: p.x, y: p.y, t: this.time.now, target })`; `applyIntents(intents)`; `syncGestureVisuals()`.

`resolveTarget(x, y)`: rekkefølge: (1) hvis menyen er synlig og `menu.hitAction(x, y)` → `{ kind: 'menu', action }`; (2) hånd-soner: innen 48 px av `zoneCache.wild` → `{ kind: 'hand', item: 'wild' }`, tilsvarende `remove`; (3) brikke: konverter til layout-rom `lx = (x − originX) / scale`, `ly = (y − originY) / scale`; `i = hitTile(layout, lx, ly)` → `{ kind: 'tile', index: i }`; (4) kun når `machine.state.name` er `dragWild` eller `wildArmed`: `at = hitGap(layout, lx, ly)` → `{ kind: 'gap', at }`; (5) ellers `{ kind: 'none' }`.

`applyIntents(intents)`: for hver: `hint` → `showHint(reason)` og `audio.playError()`; ellers `cmd = intentToCommand(intent, this.view.tiles)`; hvis null → ignorer; `r = session.dispatch(cmd)`; hvis `!r.ok` → `showHint(r.reason)`; ellers lyd per type (`playSwap`, `playRotate`, `playMirror`, `playSelect` for hånd) og `effects.nudge()`. Etter `segment`-intent: `menu.hide()`.

`syncGestureVisuals()`: leser `machine.state` og setter flagg på TileViews: `selected` for `selected.index`; `segment` for indeksene `min(anchor,end)..max` i `segment` og `from..to` i `menu`; `ghost` for `dragTile.index` (og flytt viewet til pekeren: sett `x,y` direkte mens `dragTile`); joker-spøkelse: ved `dragWild` tegn et halvgjennomsiktig `TileView` for en joker ved pekeren (opprett ved behov, destroy når tilstanden forlates); `cursor` for `keyboard.state.cursor` når tastatur sist ble brukt. Ved `menu`: `menu.show(midpunkt over segmentet i skjermkoordinater, to − from + 1 >= 3)`; ellers `menu.hide()`. Når `dragTile` slutter (state ikke lenger dragTile): tween viewet tilbake til slot over `d.snap` (sprett).

`update(time)`: `machine.tick(time)`; hvis state endret siden forrige frame → `syncGestureVisuals()`; hvis `inputLocked && pendingTweens === 0` → `inputLocked = false`.

Tastatur: `this.input.keyboard?.on('keydown', (e: KeyboardEvent) => ...)`: mapp `e.code` til `KeyCode` (ignorer andre), `intents = keyboard.handle({ code, shift: e.shiftKey })`; `undo`/`reset` → `session.dispatch`; andre → `applyIntents`. Sett `keyboardActive = true` for markørvisning; pekerhendelser setter den til false.

`showHint(reason)`: liten tekst under HUD («Låst brikke», «Segmentet inneholder låst brikke», «Segment må ha minst 3», «Hånden er tom», «Ikke naboer», «Ugyldig») som fader ut over `d.calm`; `effects.nudge()`. Mapping fra `HintReason | RejectReason | 'disposed'` til norsk tekst i en `const HINT_TEXT: Record<string, string>`.

`onViewChange(v)` utvides: etter `render(true)`: hvis `v.solved` → `onSolved()`; ellers hvis `v.solveStatus.kind === 'deadEnd'` → `showDeadEnd()`; ellers `hideBanner()`. `unknown` og `known` viser ingenting i kampanjen.

`showDeadEnd()`: banner-container over brettet med tekst «Ingen vei videre herfra» og undertekst «Angre eller start på nytt» (bakgrunn `COLORS.panel`, ramme `COLORS.danger`); pekerinput til brettet er stengt mens banneret vises (sjekk i `pointer`). `hideBanner()` fjerner den.

`onSolved()`: `inputLocked = true`; `audio.playSuccess()`; `effects.mirrorWave(layout, originX, originY, layout.scale)`; `effects.flash(COLORS.success, 0.2)`; `outcome = services(this).mode.onSolved(levelId, view.movesUsed)`; etter `d.ceremony` (Phaser `time.delayedCall`) → `this.scene.start(SCENE.result, { levelId, outcome, movesUsed: view.movesUsed, target: level.target })`.

Hook: `menu: () => this.menu.visible ? this.menu.positions() : null`.

- [ ] **Step 3: Verifiser**

Run: `npm test && npm run typecheck && npm run lint:core && npm run build`
Expected: grønt.

- [ ] **Step 4: Commit**

Melding: `feat(scenes): board input, gestures, animations, dead-end banner and solved flow`.

---

### Task 6: Verdenskart og resultat

**Files:**
- Create: `src/scenes/WorldMapScene2.ts`, `src/scenes/ResultScene2.ts`
- Modify: `src/main.ts` (registrer begge)

**Interfaces:**
- `WorldMapScene2.init(data?: { world?: number })`. Viser én verden om gangen: tittel «Verden N», to pilknapper for forrige/neste verden (deaktivert ved låst verden), 15 nivåknapper i rutenett 5×3 (bredde `contentWidth`), hver med nivånummer og 0–3 «★». Låst nivå: dempet, ikke interaktiv. Klikk → `scene.start(SCENE.board, { levelId })`. «Tilbake» → meny. Bruker `services(this).mode.isUnlocked(id)`, `store.stars()`, `isWorldUnlocked(world, stars)` fra core.
- `ResultScene2.init(data: { levelId: string; outcome: SolvedOutcome; movesUsed: number; target: number })`. Viser «Løst!», tre stjerneplasser der `outcome.stars` er fylt (animeres inn én og én med `EASING.pop` over `d.normal`, `effects.starFall(12)` og `effects.confetti(cx, cy, 60)` ved 3 stjerner), «{movesUsed} trekk · mål {target}», banner «Verden {n} låst opp!» når `worldJustUnlocked !== null`. Knapper: «Neste» (enabled `outcome.nextUnlocked`, går til Board med `nextLevelId`), «Spill igjen», «Verdenskart» (til WorldMap med `world` fra `parseLevelId`). `audio.playVictoryJingle()` ved 3 stjerner, ellers `playPalindrome()`.

- [ ] **Step 1: Skriv begge scenene** etter beskrivelsen, med `build()` + `RESIZE`-rebuild som i Menu. Alle farger/fonter fra tema; verdensaksent `worldAccent(world)` på knapper og tittel.

- [ ] **Step 2: Registrer i main.ts**, i rekkefølgen Boot, Menu, WorldMap, Board, Result, Settings. Menyens «Spill» blir nå aktiv.

- [ ] **Step 3: Verifiser**

Run: `npm test && npm run typecheck && npm run lint:core && npm run build`
Expected: grønt.

- [ ] **Step 4: Commit**

Melding: `feat(scenes): world map and result scenes`.

---

### Task 7: Playwright-røyktest ved 390×844

**Files:**
- Modify: `package.json` (devDependency `@playwright/test@^1.47`, script `"e2e": "playwright test"`), `.gitignore` (`playwright-report/`, `test-results/`)
- Create: `playwright.config.ts`, `e2e/board.spec.ts`, `e2e/tsconfig.json`

**Interfaces:**
- Testen bruker hooken `window.__palintris` (kun i dev), og den lagrede løsningen i `src/content/campaign.v1.json` for nivå `w3-02` (hårnål, swap/rotate/mirror). Løsningen er en eksistensgaranti, ikke minimal; stjerner ≥ 1 er nok.

- [ ] **Step 1: Installer og konfigurer**

`npm install --save-dev @playwright/test@^1.47 && npx playwright install chromium`.

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { ...devices['iPhone 12'], viewport: { width: 390, height: 844 }, baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3000 --no-open', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 60_000 },
});
```

`e2e/tsconfig.json`:

```json
{ "extends": "../tsconfig.json", "compilerOptions": { "types": ["node"], "lib": ["ES2020", "DOM"] }, "include": ["./**/*.ts"] }
```

Merk: `devices['iPhone 12']` setter `isMobile` og touch; Playwright `page.mouse` fungerer likevel og sender pekerhendelser Phaser leser som touch/mus.

- [ ] **Step 2: Skriv testen**

`e2e/board.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

type Cmd =
  | { type: 'swap'; a: number; b: number }
  | { type: 'rotate'; from: number; to: number; dir: 'left' | 'right' }
  | { type: 'mirror'; from: number; to: number }
  | { type: 'insertWild'; at: number }
  | { type: 'remove'; tileId: number };

interface Level { id: string; solution: Cmd[]; tiles: { id: number }[] }

const LEVEL_ID = 'w3-02';
const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };
const level = campaign.levels.find((l) => l.id === LEVEL_ID);
if (level === undefined) throw new Error(`fant ikke ${LEVEL_ID}`);

const hook = (page: Page) => ({
  slot: (i: number) => page.evaluate((idx) => window.__palintris!.screenLayout().slots[idx]!, i),
  view: () => page.evaluate(() => window.__palintris!.view()),
  menu: () => page.evaluate(() => window.__palintris!.menu()),
  zones: () => page.evaluate(() => window.__palintris!.zones()),
  waitIdle: () => page.waitForFunction(() => window.__palintris !== undefined && !window.__palintris.busy()),
});

const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + (to.x - from.x) / 2, from.y + (to.y - from.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
};

const tap = async (page: Page, p: { x: number; y: number }): Promise<void> => {
  await page.mouse.click(p.x, p.y);
};

const perform = async (page: Page, cmd: Cmd): Promise<void> => {
  const h = hook(page);
  await h.waitIdle();
  if (cmd.type === 'swap') {
    await drag(page, await h.slot(cmd.a), await h.slot(cmd.b));
    return;
  }
  if (cmd.type === 'rotate' && cmd.to - cmd.from === 1) {
    await drag(page, await h.slot(cmd.from), await h.slot(cmd.to));
    return;
  }
  if (cmd.type === 'rotate' || cmd.type === 'mirror') {
    await tap(page, await h.slot(cmd.from));
    await tap(page, await h.slot(cmd.to));
    const menu = await h.menu();
    expect(menu).not.toBeNull();
    const action = cmd.type === 'mirror' ? 'mirror' : cmd.dir === 'left' ? 'rotateLeft' : 'rotateRight';
    const btn = menu!.find((m) => m.action === action)!;
    await tap(page, btn);
    return;
  }
  throw new Error(`w3-02 skal ikke ha hånd-trekk: ${cmd.type}`);
};

test('løser et hårnålnivå med drag og trykk, angrer underveis, får stjerner', async ({ page }) => {
  await page.goto(`/?level=${LEVEL_ID}`);
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w3-02');
  await h.waitIdle();
  const start = await h.view();
  expect(start.tiles.length).toBeGreaterThanOrEqual(7);
  expect(start.solved).toBe(false);

  const [first, ...rest] = level.solution;
  await perform(page, first!);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(1);

  await tap(page, (await h.zones()).undo);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(0);

  await perform(page, first!);
  for (const cmd of rest) await perform(page, cmd);
  await page.waitForFunction(() => window.__palintris?.view().solved === true, undefined, { timeout: 15_000 });
  const done = await h.view();
  expect(done.stars).toBeGreaterThanOrEqual(1);
  expect(done.movesUsed).toBe(level.solution.length);
});
```

Forutsetning: `remove`-kommandoer i løsningen bruker `tileId`; w3-02 har ingen hånd, så bare swap/rotate/mirror forekommer. Hvis w3-02 sin løsning inneholder rotate med `to − from === 1`, utføres den som swap (samme resultat).

- [ ] **Step 3: Kjør**

Run: `npm run e2e`
Expected: 1 passed. Hvis testen feiler på tidsavbrudd i `waitIdle`, sjekk at `busy()` faller til false etter tweens (Task 4/5 `pendingTweens`).

- [ ] **Step 4: Legg til i lint-ignorering**

`e2e/` lintes ikke av `lint:core`; ingen endring nødvendig.

- [ ] **Step 5: Commit**

Melding: `test(e2e): playwright smoke test solves a hairpin level at 390x844`.

---

## Ferdig-kriterier for plan 2b

- `npm test`, `npm run typecheck`, `npm run lint:core`, `npm run build` og `npm run e2e` grønne på branch `redesign`.
- `grep -rn "src/config\|src/ui\|src/utils" src/scenes/*2.ts src/scenes/services.ts src/scenes/ui.ts src/scenes/TileView.ts src/scenes/effects.ts src/scenes/SegmentMenu.ts src/scenes/testHook.ts src/audio` gir ingen treff.
- Ingen hex-strenger i `src/scenes/*.ts` utenom via `cssColor`.
- Kampanjen kan spilles fra meny til resultat i nettleser ved 390×844.

## Utenfor denne planen (plan 3)

- Daily og Blitz (moduser, scener, Daily-ID og ISO-uke-filter, Blitz-kø og klokke).
- Fri spilling per verden.
- Interaktive introduksjoner per verden (spec §2 Introduksjoner).
- Sletting av legacy `src/scenes/*` (uten 2-suffiks), `src/ui`, `src/config`, `src/utils`, legacy-filer i `src/game`, `public/assets`-kits; omdøping av `*2`-scener; `lint` uten `lint:core`; CI.
- Lagringsvalidering, signaturnivåer, høy-DPR-skarphet på tekst, mørkt tema.

## Etterslep og notater til plan 3 (fra sluttreview av 2b)

**Spec-gjeld**
- Introduksjoner (spec §2) er ikke implementert; nå den største gjenstående spec-gjelden i §2.
- Musikk per verden (spec §4): `audio.startMusic('gameplay')` kalles aldri; motoren har bare `menu`/`gameplay`.
- `targetExact` leses aldri i BoardScene2; Daily og fri spilling trenger «mål ukjent».

**Utsatt fra reviews**
- `makeButton` hover-tweens akkumulerer ved hurtig over/ut; tas sammen med omdøping av `ui.ts`.
- `private` tilbake på `effects`/`menu`/`banner` i BoardScene2.
- Dobbel `redraw()` per brikke per render (`setTile` + `setFlags`).
- Pointer-down under tweens svelger hele gesten uten feedback; vis et hint eller kø.
- `PalintrisHook` i e2e kan drifte fra `TestHook`: legg en assignability-sjekk eller importer typen.
- Verdenskart har ~200 px død luft over og under rutenettet; nivå 1 står 6 px fra venstre kant ved 390 px.
- Kontrast mellom matched-ring (`COLORS.success`) og grønn brikke (symbol D) er lav.
- `pendingTweens = 0` i `onResize` mens utfasings-tweens utenfor `tiles` lever kan gjøre `busy()` usann for tidlig.
- Høy-DPR: canvas måles til 390×844 ved DPR 3, all tekst oppskaleres. Kjent begrensning, bør løses i plan 3 (`resolution`/`zoom` i Phaser-config eller egen håndtering).
- `SolverClient` er app-global i `services.ts`, ikke én per sesjon som 2a-notatet sa. Trygt fordi `cancelled` + `requestSeq` filtrerer, men noter før Daily/Blitz kjører flere brett.
- `symbolPattern('*')` og `'C'` gir begge `'rings'`.

**E2E å legge til (høyest verdi)**
1. w6-01: joker fra hånd inn i foldgapet, og fjern via drag til hånden.
2. Et brett som krysser 6↔7 ved innsetting, med `busy()`-sjekk gjennom layoutskiftet.
3. Blindgate: bruk opp budsjettet, bekreft banner, at brettinput er stengt og at angre åpner igjen.

**Legacy som slettes i plan 3**
- `src/scenes/*.ts` uten `2`-suffiks, `src/ui`, `src/config`, `src/utils` (inkl. shim `src/utils/audio.ts`), legacy-filer i `src/game` (BadgeSystem, DailyChallengeGenerator, PowerUps, PuzzleManager, TimeAttackManager), `src/types`, `public/assets`-kits, `scripts/validateLevels.ts`, ESLint `ignorePatterns` for legacy, `lint:core` erstattes av `lint`. Deretter omdøpes `*2`-scener.
