# Palintris moduser og opprydding – implementasjonsplan (plan 3 av 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fullføre redesignet: slette legacy og døpe om scenene, legge til Daily, Blitz og fri spilling på det felles brettet, interaktive introduksjoner, musikk per verden, skjemavalidering av lagring, CI, tre nye e2e-tester og ny README.

**Architecture:** Brettet (`BoardScene`) blir modus-uavhengig: `init({ mode, levelId?, world? })` slår opp en `BoardMode`-strategi fra tjenestene. Daily og Blitz er ren logikk i `src/game/daily.ts` og `src/game/blitz.ts` med vitest, og bruker generatoren i klient med deterministiske løser-grenser. Lagring får en validator og nye felt for pågående Daily-forsøk og sette introduksjoner. Legacy fjernes først, så all senere kode lintes med den vanlige `lint`-gaten.

**Tech Stack:** Som før. GitHub Actions for CI.

**Spec:** `docs/superpowers/specs/2026-09-07-palintris-redesign-design.md` §2 Introduksjoner, §3 Kampanje (Fri spilling), Daily, Blitz, Lagring, Fjernes; §4 Lyd; §5 Verktøy og CI, Testing. Etterslep står nederst i plan 1-, 2a- og 2b-dokumentene.

**Avvik besluttet av controller:** høy-DPR-skarphet holdes utenfor (kjent begrensning, egen oppfølging). Musikk per verden løses ved transponering og tempo av `gameplay`-mønsteret, ikke seks nye komposisjoner. Phaser-tasks (4, 6) er skjelett + prosa som i plan 2b, verifisert med typecheck, build og e2e.

## Global Constraints

- Etter Task 1 finnes ingen legacy: `src/config`, `src/ui`, `src/utils`, `src/types`, `src/mechanical`, legacy `src/game/*`, legacy `src/scenes/*`, `public/assets`, `scripts/validateLevels.ts` er borte; scenene heter `BootScene`, `MenuScene`, `WorldMapScene`, `BoardScene`, `ResultScene`, `SettingsScene` med nøkler `Boot`, `Menu`, `WorldMap`, `Board`, `Result`, `Settings`. Gaten er `npm run lint` (ikke `lint:core`) og den må være grønn fra og med Task 1.
- `src/core`, `src/game`, `src/theme`, `src/audio` importerer aldri Phaser. Scener importerer bare fra `src/core`, `src/content`, `src/game`, `src/theme`, `src/audio`, `src/scenes`.
- Ingen hex, fontnavn eller varigheter utenfor tema. Redusert bevegelse og fargeblind respekteres i alt nytt.
- Daily: `puzzleId = daily-{YYYY-MM-DD}-v{contentVersion}` (UTC). Deterministiske filtre: løser med `states`-grense, aldri `ms`. Duplikatfilter mot tidligere dager i samme ISO-uke. Forsøk starter ved første trekk; tid fra første trekk til løst, pauser ved skjult fane; reset/angre teller ikke nytt forsøk; første fullførte forsøk er delingsresultatet; beste rangeres på trekk, så tid.
- Blitz: start 45 s, tak 60 s, bonus `max(3, 6 − floor(løste/5))` s pluss 3 s ved ≤ mål, hopp over koster 5 s, kø på 2 brett, brett fra verden 1–3 sine oppskrifter med lengde 4–7, poeng = løste brett, klokken pauser ved skjult fane og under løst-animasjon, løsning vinner over tidsutløp i samme oppdatering.
- Lagring: `{ saveVersion: 1, contentVersion, stars, daily: { attempts, streak, inProgress? }, blitz: { best }, settings, introsSeen }`; validator gir default ved feil form; migrasjon som før.
- Alle porter grønne før hver commit: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; `npm run e2e` etter Task 1, 4, 5, 6, 8.
- Ingen push. Commit lokalt på branch `redesign` med trailerne `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` og `Claude-Session: https://claude.ai/code/session_018VMa2K13QmbxtwcDwXsQ1w`.

---

### Task 1: Slett legacy, døp om scener, én lint-gate

**Files:**
- Delete (git rm -r): `src/config`, `src/ui`, `src/utils`, `src/types`, `src/mechanical`, `src/game/BadgeSystem.ts`, `src/game/DailyChallengeGenerator.ts`, `src/game/PowerUps.ts`, `src/game/PuzzleManager.ts`, `src/game/TimeAttackManager.ts`, `src/scenes/{BootScene,CascadeScene,DailyChallengeScene,GameScene,LevelSelectScene,MechanicalGameScene,MenuScene,SettingsScene,TimeAttackScene,TutorialScene,VersusScene,ZenModeScene}.ts`, `public/assets`, `scripts/validateLevels.ts`.
- Rename (git mv): `src/scenes/BootScene2.ts` → `BootScene.ts` osv. for de seks scenene; klassenavn uten `2`.
- Modify: `src/scenes/ui.ts` (`SCENE`-nøkler uten `2`), `src/main.ts`, `.eslintrc.json` (fjern `ignorePatterns` for legacy; legg `e2e/tsconfig.json` i `parserOptions.project`), `package.json` (`lint` = `eslint src scripts e2e --ext .ts`; fjern `lint:core`), `.gitignore` (legg til `.playwright-mcp/`), `tsconfig.node.json` (uendret include), `docs/superpowers/plans/*.md` nevner `lint:core` — la stå (historikk).
- Create: `public/favicon.svg` (enkel: sirkel i `#ff6b6b` med hvit «P»; eneste tillatte hex utenfor tema er i SVG-assets) og `<link rel="icon" href="/favicon.svg">` i `index.html`.

- [ ] **Step 1: Slett og døp om.** Kjør slettingene og omdøpingene. Oppdater klassenavn inne i filene (`class BootScene2` → `class BootScene` osv.), `SCENE` i `ui.ts` til `{ boot: 'Boot', menu: 'Menu', worldMap: 'WorldMap', board: 'Board', result: 'Result', settings: 'Settings' }`, og importene i `main.ts`.
- [ ] **Step 2: Lint-gate.** `.eslintrc.json`: fjern `ignorePatterns`-oppføringene for legacy-scener; `parserOptions.project` blir `["./tsconfig.json", "./tsconfig.node.json", "./e2e/tsconfig.json"]`. `package.json`: `"lint": "eslint src scripts e2e --ext .ts"`, fjern `lint:core`. Rett eventuelle lint-feil i `e2e/` og `scripts/` som dukker opp (ikke slå av regler utover eksisterende overrides).
- [ ] **Step 3: Verifiser.** `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`. `git status` skal ikke vise slettede filer som utracket rester. `du -sh public` < 100 KB. `grep -rn "Scene2\|lint:core" src e2e package.json .eslintrc.json` gir ingen treff.
- [ ] **Step 4: Commit.** Melding: `chore: remove legacy game, rename scenes, single lint gate`.

---

### Task 2: Lagringsvalidator og utvidet skjema

**Files:**
- Modify: `src/core/storage.ts`, `src/core/__tests__/storage.test.ts`
- Modify: `src/game/saveStore.ts` (ingen API-endring; `data` får nye felt via typen)

**Interfaces:**
- Produces:
  - `interface DailyProgress { readonly puzzleId: string; readonly startedAt: string; readonly elapsedMs: number; readonly commands: readonly Command[] }`
  - `SaveData` får `readonly contentVersion: number`, `daily.inProgress?: DailyProgress`, `readonly introsSeen: readonly string[]`.
  - `parseSave(raw: unknown): SaveData | null` — returnerer null ved feil `saveVersion` eller ugyldig form; ellers en fullt utfylt `SaveData` der manglende valgfrie felt får default.
  - `loadSave` bruker `parseSave`; ved null → legacy-migrasjon → default.
  - `markIntroSeen(data, id): SaveData`, `setDailyProgress(data, p: DailyProgress | undefined): SaveData`.

- [ ] **Step 1: Skriv failing tests** i `storage.test.ts`:

```ts
describe('parseSave', () => {
  it('godtar gyldig data og fyller manglende valgfrie felt', () => {
    const d = parseSave({ saveVersion: 1, stars: { 'w1-01': { stars: 2, contentVersion: 1 } }, daily: { attempts: [], streak: 0 }, blitz: { best: 3 }, settings: { sound: true, music: false, reducedMotion: false, colorBlind: true } });
    expect(d).not.toBeNull();
    expect(d?.introsSeen).toEqual([]);
    expect(d?.contentVersion).toBe(1);
    expect(d?.daily.inProgress).toBeUndefined();
  });
  it('avviser feil form på stars', () => {
    expect(parseSave({ saveVersion: 1, stars: { 'w1-01': 'oops' } })).toBeNull();
  });
  it('avviser feil saveVersion', () => {
    expect(parseSave({ saveVersion: 2 })).toBeNull();
  });
  it('loadSave gir default ved ugyldig form uten legacy', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: JSON.stringify({ saveVersion: 1, stars: 5 }) }))).toEqual(defaultSave());
  });
});
describe('intro og daily progress', () => {
  it('markIntroSeen er idempotent', () => {
    const d = markIntroSeen(markIntroSeen(defaultSave(), 'w2-01'), 'w2-01');
    expect(d.introsSeen).toEqual(['w2-01']);
  });
  it('setDailyProgress setter og fjerner', () => {
    const p = { puzzleId: 'daily-2026-09-08-v1', startedAt: '2026-09-08T10:00:00.000Z', elapsedMs: 1200, commands: [{ type: 'swap' as const, a: 0, b: 1 }] };
    const d = setDailyProgress(defaultSave(), p);
    expect(d.daily.inProgress).toEqual(p);
    expect(setDailyProgress(d, undefined).daily.inProgress).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implementer.** `parseSave` sjekker: `saveVersion === 1`; `stars` er objekt der hver verdi har `stars` (heltall 0–3) og `contentVersion` (tall); `daily.attempts` er liste av objekter med `puzzleId` string, `attempt`/`moves`/`timeMs`/`target` tall, `completedAt` string; `daily.streak` tall; `daily.inProgress` valgfri med `puzzleId`, `startedAt`, `elapsedMs`, `commands` (liste av objekter med `type` string; kommandoene valideres ikke dypere, `apply` avviser ugyldige ved replay); `blitz.best` tall; `settings` fire booleans (manglende → default); `introsSeen` liste av strenger (manglende → tom); `contentVersion` tall (manglende → 1). Ugyldig obligatorisk felt → null. Skriv små hjelpere `isRecord`, `isNumber`, `isString`, `isBoolean`.
- [ ] **Step 3: Kjør, commit.** Melding: `feat(core): save schema validation, intro and daily progress fields`.

---

### Task 3: Daily og Blitz som ren logikk

**Files:**
- Create: `src/game/daily.ts`, `src/game/blitz.ts`, `src/game/modes/daily.ts`, `src/game/modes/blitz.ts`, `src/game/modes/free.ts`
- Modify: `src/game/modes/types.ts` (`kind` får `'free'`; `onSolved(levelId, movesUsed, info?: SolvedInfo)`; `ModeLevel` får `readonly timed: boolean` og `readonly showBudget: boolean`)
- Modify: `src/game/modes/campaign.ts` (nye felt `timed: false`, `showBudget: true`)
- Test: `src/game/__tests__/daily.test.ts`, `src/game/__tests__/blitz.test.ts`, `src/game/__tests__/free.test.ts`

**Interfaces:**
- `interface SolvedInfo { readonly timeMs: number }`
- `daily.ts`:
  - `DAILY_RECIPE: Recipe` = `{ id: 'daily', lengthRange: [7, 9], alphabet: 4, allowedOps: ['swap','rotate','mirror'], movesRange: [2, 4], slack: 4, hand: { wild: 0, remove: 0 }, lockedRange: [0, 0], scrambleRange: [2, 5], solverStates: 50000 }`
  - `utcDateKey(d: Date): string` (`YYYY-MM-DD`)
  - `dailyPuzzleId(dateKey, contentVersion): string`, `parseDailyPuzzleId(id): { dateKey: string; contentVersion: number } | null`
  - `isoWeekDates(dateKey): string[]` — datoer fra mandag i ISO-uken til og med `dateKey`
  - `dailyLevel(dateKey, contentVersion): Level | null` — genererer dagene i uken i rekkefølge med `previousKeys`, `attempts: 60`, `requireExact: false`; resultatet caches i en modul-`Map`
  - `dailyShareText(a: DailyAttempt): string` — tre linjer: `Palintris {puzzleId}`, `{moves} trekk · mål {target} · {m:ss} · forsøk {attempt}`, `'🟩'.repeat(min(moves,target)) + '🟨'.repeat(max(0, moves − target))`
  - `streakAfter(attempts: readonly DailyAttempt[], dateKey): number` — antall sammenhengende dager til og med `dateKey` med minst ett fullført forsøk
  - `bestAttempt(attempts, puzzleId): DailyAttempt | undefined` — færrest trekk, så minst tid
- `blitz.ts`:
  - `BLITZ = { startMs: 45000, capMs: 60000, baseBonusMs: 6000, minBonusMs: 3000, decayEvery: 5, targetBonusMs: 3000, skipCostMs: 5000 }`
  - `blitzBonusMs(solvedBefore, atTarget): number`
  - `class BlitzClock { readonly remainingMs; readonly running; start(); pause(); resume(); tick(dtMs); onSolved(solvedBefore, atTarget); skip(); get over(): boolean }`
  - `BLITZ_RECIPES: readonly Recipe[]` — kopier av `WORLD_RECIPES[0..2]` med `lengthRange: [4, 7]`, `solverStates: 50000`
  - `class BlitzQueue { constructor(seed: number, contentVersion: number); next(): Level; peek(): Level }` — holder to ferdige, genererer med `makeLevel(pick(rng, BLITZ_RECIPES), { id: 'blitz-'+n, contentVersion, requireExact: false, attempts: 40 })`, hopper over null
- `modes/daily.ts`: `class DailyMode implements BoardMode { kind = 'daily'; constructor(store: SaveStore, contentVersion: number, now: () => Date); todayId(): string; load(levelId): ModeLevel | null (timed: true, showBudget: false, budget 999); isUnlocked(): true; onSolved(levelId, movesUsed, info): SolvedOutcome (registrerer DailyAttempt med attempt = antall tidligere forsøk på puzzleId + 1, oppdaterer streak ved første fullførte forsøk den dagen, fjerner inProgress; stjerner via starsFor(moves, target, 999); nextLevelId null) }`
- `modes/blitz.ts`: `class BlitzMode implements BoardMode { kind = 'blitz'; constructor(store, queue: BlitzQueue); readonly solved: number; load(levelId): ModeLevel (levelId 'next' gir queue.next(); timed: false, showBudget: false, budget 999); onSolved → solved++, stars; finish(): { solved; best; isNewBest } (oppdaterer blitz.best) }`
- `modes/free.ts`: `class FreeMode implements BoardMode { kind = 'free'; constructor(contentVersion, rng: Rng); load(levelId 'free-w{world}-{n}') genererer fra `rampedRecipe(WORLD_RECIPES[world−1], 8)` med `requireExact: false`; timed false, showBudget true; onSolved gir stars og nextLevelId 'free-w{world}-{n+1}' }`

- [ ] **Step 1: Tester.** Skriv tester som dekker: `utcDateKey`/`dailyPuzzleId`/`parseDailyPuzzleId` rundtur; `isoWeekDates('2026-09-08')` (tirsdag) gir `['2026-09-07','2026-09-08']`, mandag gir én dato; `dailyLevel` er deterministisk og ulik for to dager i samme uke; `dailyShareText` eksakt format for `{ moves: 3, target: 2, timeMs: 65000, attempt: 1 }`; `streakAfter` for sammenhengende og brutte dager; `bestAttempt` rangering. Blitz: `blitzBonusMs(0,false)=6000`, `(5,false)=5000`, `(20,true)=6000`, `(10,false)=4000`; klokke: start 45 s, `tick` trekker, `onSolved` capper på 60 s, `skip` går ikke under 0, `over` ved 0, pause stopper tick; `BlitzQueue.next()` gir to ulike brett med `target ≥ 1` og lengde 4–7. Moduser: DailyMode registrerer forsøk 1 og 2, streak 1 første dag, `inProgress` fjernes; BlitzMode teller og oppdaterer best; FreeMode gir neste id.
- [ ] **Step 2: Implementer** alle filer. `dailyLevel` bruker `makeLevel` fra `src/core/level.ts` med `id = dailyPuzzleId(dateKey, cv)`; `previousKeys` = `symbolKey` av tidligere dagers brett i uken.
- [ ] **Step 3: Kjør, commit.** Melding: `feat(game): daily, blitz and free play modes as pure logic`.

---

### Task 4: Modus-uavhengig BoardScene, Daily- og Blitz-scener

**Files:**
- Modify: `src/scenes/services.ts` (`modes: { campaign, daily, blitz, free }`), `src/scenes/BoardScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/ResultScene.ts`, `src/scenes/ui.ts` (`SCENE.daily`, `SCENE.blitzResult`), `src/main.ts`
- Create: `src/scenes/DailyScene.ts`, `src/scenes/BlitzResultScene.ts`

**Interfaces:**
- `BoardScene.init(data: { mode: 'campaign' | 'daily' | 'blitz' | 'free'; levelId?: string })`. Kampanje og fri spilling krever `levelId`; daily bruker `mode.todayId()`; blitz bruker `'next'`.
- HUD per modus: kampanje som i dag; daily: linje 1 «Trekk n / mål m» eller «Trekk n · mål ukjent» når `!targetExact`, linje 2 «Daglig · {m:ss}»; blitz: linje 1 «{m:ss}» stor, linje 2 «Løst {k} · Trekk n / mål m», og «Hopp over»-knapp i hånd-raden i stedet for Reset; free: linje 2 «Fri spilling · Verden w».
- Daily-tid: starter ved første godtatte kommando (Phaser `time`), pauser ved `visibilitychange` (`document.hidden`), lagres i `inProgress` sammen med kommandolisten etter hvert godtatte trekk (`setDailyProgress`). Ved oppstart med `inProgress` for dagens id: replay kommandoene gjennom `session.dispatch` uten animasjon, sett `elapsedMs`. Ved løst: `mode.onSolved(id, movesUsed, { timeMs })`.
- Blitz-klokke: `BlitzClock` tikker i `update(time, delta)`; pauser ved skjult fane og fra løst til neste brett er lastet; `onSolved` legger bonus; ved `over` → `SCENE.blitzResult` med `mode.finish()`. Neste brett lastes i samme scene: `loadBoard(level)` river ned sesjon, tiles, meny, banner, og bygger opp igjen uten `scene.start`. «Hopp over» kaller `clock.skip()` og `loadBoard(next)`.
- `DailyScene`: viser dato, status (ikke spilt / fullført med beste resultat), knapper «Spill» / «Nytt forsøk», «Del» (kopierer `dailyShareText` til `navigator.clipboard` og viser «Kopiert»), «Meny». Viser «Lager dagens brett…» mens `dailyLevel` regnes (kjør i `time.delayedCall(0)`).
- `ResultScene` for daily: viser tid, forsøksnummer, streak og «Del»-knapp; «Neste» erstattes av «Nytt forsøk».
- `BlitzResultScene`: «Tiden er ute», løste brett, beste, «Ny rekord!» ved `isNewBest`, knapper «Igjen», «Meny».
- Meny: knapper «Kampanje», «Daglig», «Blitz», «Innstillinger». Musikk uendret her.

- [ ] **Step 1: Tjenester og typer.** `services.ts` bygger alle fire moduser (`DailyMode(store, CONTENT_VERSION, () => new Date())`, `BlitzMode(store, new BlitzQueue(hashString(String(Date.now())), CONTENT_VERSION))`, `FreeMode(CONTENT_VERSION, createRng(Date.now() >>> 0))`).
- [ ] **Step 2: BoardScene.** Innfør `mode`-felt, HUD-varianter, timer/klokke, `loadBoard`, `inProgress`-lagring og replay, `visibilitychange`-håndtering (registrer på `document`, fjern ved shutdown). `testHook` får `mode` og `clockMs()`.
- [ ] **Step 3: Scener.** `DailyScene`, `BlitzResultScene`, endringer i `MenuScene` og `ResultScene`, registrering i `main.ts`.
- [ ] **Step 4: Verifiser.** Alle porter + `npm run e2e`. Kjør i nettleser hvis verktøy finnes: Daily fra meny til del-knapp; Blitz til «Tiden er ute».
- [ ] **Step 5: Commit.** Melding: `feat(scenes): mode-agnostic board with daily and blitz`.

---

### Task 5: Fri spilling i verdenskartet

**Files:**
- Modify: `src/scenes/WorldMapScene.ts`, `src/scenes/ResultScene.ts`

- [ ] **Step 1:** Knapp «Fri spilling» under rutenettet, aktiv når verdenen er åpen → `scene.start(SCENE.board, { mode: 'free', levelId: 'free-w{world}-1' })`. I `ResultScene` for `free`: «Neste» går til `nextLevelId` fra outcome; ingen stjerner lagres; tittel «Løst!» uten stjerneanimasjon-lagring.
- [ ] **Step 2:** Verifiser porter + e2e. Commit: `feat(scenes): free play per world`.

---

### Task 6: Interaktive introduksjoner

**Files:**
- Create: `src/game/intro.ts`, `src/game/__tests__/intro.test.ts`, `src/scenes/IntroOverlay.ts`
- Modify: `src/scenes/BoardScene.ts`

**Interfaces:**
- `type IntroMechanic = 'swap' | 'rotate' | 'mirror' | 'locked' | 'wild' | 'remove'`
- `interface IntroSpec { readonly id: string; readonly mechanic: IntroMechanic; readonly title: string; readonly text: string; readonly gesture: 'drag' | 'hold' | 'tap' | 'dragHand' }`
- `INTROS: readonly IntroSpec[]` for `w1-01` (swap: «Dra en brikke over på naboen»), `w2-01` (rotate: «Hold på en brikke og dra over flere, velg ⟲ eller ⟳»), `w3-01` (mirror: «Hold og dra over minst tre, velg ⇋»), `w4-01` (locked: «Låste brikker flytter seg ikke. Jobb rundt dem»), `w5-01` (wild: «Dra jokeren fra hånden inn i et mellomrom»), `w5-02` (remove: «Dra en brikke ned i hånden for å fjerne den»)
- `introFor(levelId): IntroSpec | null`
- `introSatisfiedBy(spec, cmd: Command): boolean` — swap→swap, rotate→rotate, mirror→mirror, wild→insertWild, remove→remove, locked→enhver godtatt kommando
- `IntroOverlay extends Container { constructor(scene, spec, onDismiss); layout(width, height) }` — panel over hånden med tittel, tekst, en enkel animert pil/hånd-glyf (tween frem og tilbake, snapp ved redusert bevegelse) og «Skjønner»-knapp.

- [ ] **Step 1: Tester** for `introFor` og `introSatisfiedBy` (alle seks).
- [ ] **Step 2: Implementer.** BoardScene viser overlay ved `create` når `introFor(levelId)` finnes og id ikke er i `store.data.introsSeen` (kun kampanje). Overlay fjernes ved «Skjønner» eller når første godtatte kommando tilfredsstiller spec; da `store.update(d => markIntroSeen(d, id))`.
- [ ] **Step 3: Verifiser porter + e2e** (e2e bruker `?level=w3-02`, ikke intro-nivå; `?level=w1-01` i nye tester må avvise overlay: hooken får `dismissIntro()`).
- [ ] **Step 4: Commit.** Melding: `feat(scenes): interactive introductions per world`.

---

### Task 7: Musikk per verden og etterslep

**Files:**
- Modify: `src/audio/sound.ts`, `src/audio/__tests__/sound.test.ts`, `src/scenes/BoardScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/ui.ts`, `e2e/board.spec.ts`

- [ ] **Step 1: Musikk.** `startMusic(track: 'menu' | 'gameplay', opts?: { transpose?: number; tempoScale?: number })`; motoren transponerer alle noter med `transpose` halvtoner og skalerer steg-tid med `1 / tempoScale`. `BoardScene.create` kaller `audio.startMusic('gameplay', { transpose: (world − 1) * 2, tempoScale: 1 + (world − 1) * 0.04 })` for kampanje/free (world fra level), `{ transpose: 0, tempoScale: 1.1 }` for blitz, `{}` for daily; `MenuScene` starter `'menu'` igjen ved `create` hvis musikk er på. Test: `startMusic('gameplay', { transpose: 4 })` kaster ikke og `isMusicPlaying()` er false i node.
- [ ] **Step 2: Etterslep.** `makeButton`: `tweens.killTweensOf(c)` før ny hover-tween. BoardScene: `private` tilbake på `effects`/`menu`/`banner`; hold utfasings-tweens i en `Set` og drep dem også i `onResize` før `pendingTweens = 0`. e2e: legg til `const _typeCheck: PalintrisHook = {} as import('../src/scenes/testHook').TestHook;` (type-only, kompilerer under e2e/tsconfig ved å tillate import type) — hvis `import type` drar inn Vite-typer, bruk i stedet en vitest-test i `src/scenes/__tests__/hookType.test.ts` som gjør `const _: PalintrisHook = {} as TestHook` med `PalintrisHook` kopiert fra spec-fila via en delt `src/scenes/hookTypes.ts` som e2e importerer. Velg det som holder typecheck og lint grønne, og noter valget.
- [ ] **Step 3: Verifiser porter. Commit.** Melding: `feat(audio): per-world music variation; misc scene follow-ups`.

---

### Task 8: CI, flere e2e-tester, README

**Files:**
- Create: `.github/workflows/ci.yml`, `e2e/hand.spec.ts`, `e2e/deadend.spec.ts`, `e2e/layoutshift.spec.ts`
- Modify: `README.md`, `e2e/board.spec.ts` (del hjelpefunksjoner til `e2e/helpers.ts`)

- [ ] **Step 1: CI.** Workflow på push og pull_request: `actions/checkout@v4`, `actions/setup-node@v4` med node 22 og npm-cache, `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run e2e`, og last opp `playwright-report/` som artefakt ved feil.
- [ ] **Step 2: e2e.** (1) `hand.spec.ts`: `?level=w6-01`: dra joker fra `zones().wild` til gapet ved folden (`screenLayout().gaps` med `at = floor(n/2)`), forvent `hand.wild` 0 og lengde +1; dra en brikke til `zones().remove`, forvent lengde −1 og `hand.remove` 0. (2) `layoutshift.spec.ts`: finn et w5-nivå med lengde 7 fra JSON (assert finnes), fjern én brikke via hånden, vent `busy() === false`, forvent `screenLayout().slots` med lik y for alle (rad-layout). (3) `deadend.spec.ts`: `?level=w1-01`, swap samme par frem og tilbake til `budgetLeft === 0`, forvent `state().name === 'idle'`, at et nytt drag ikke endrer `movesUsed`, at banner finnes (hooken får `bannerVisible()`), og at Angre fjerner banneret. Del `hook`, `drag`, `tap`, `waitIdle` til `e2e/helpers.ts`. Intro-overlay på w1-01 avvises via `dismissIntro()` i hooken.
- [ ] **Step 3: README** på norsk, kort: hva spillet er, moduser, `npm`-kommandoer (`dev`, `test`, `typecheck`, `lint`, `build`, `build:campaign`, `e2e`), struktur (`src/core`, `src/content`, `src/game`, `src/theme`, `src/audio`, `src/scenes`, `scripts`, `e2e`), innholdsversjon og regenerering av kampanjen, deploy via Vercel.
- [ ] **Step 4: Verifiser** alle porter + `npm run e2e` (4 tester). Commit: `ci: github actions; more e2e; readme`.

---

## Ferdig-kriterier for plan 3

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run e2e` grønne; `.github/workflows/ci.yml` kjører de samme.
- Ingen legacy-filer; `du -sh public` < 100 KB; ingen `*2`-scener.
- Daily, Blitz, fri spilling og introduksjoner spillbare fra menyen på 390×844.
- README beskriver det nye spillet.

## Utenfor plan 3 (egen oppfølging)

- Høy-DPR-skarphet på tekst (canvas ved DPR 1).
- Signaturnivåer (håndlagde, 3–5 per verden) — innholdsarbeid; skriptet støtter JSON-format allerede.
- Mørkt tema, konto/sky-lagring, ledertavler.
