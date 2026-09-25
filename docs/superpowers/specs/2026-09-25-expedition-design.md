# Speilekspedisjonen

## Done
A complete, replayable nine-room roguelite playable from the production menu. Route choices trade move allowance for score. Three lives, four relic drafts, guardians every third room, persistent resumable runs, victory/defeat and local records. Existing modes and saves keep working. Unit, type, lint, development browser and production Chromium/WebKit checks pass; responsive visual review completed.

## Out of scope
Accounts, payments, remote leaderboards, campaign rewrites, new dependencies, changes to the development-only sticky prototype. No Git push: deployment may use the existing Vercel project directly if verified and available.

## Verification
`npm test`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run e2e -- --workers=1`; `npm run e2e:release`. Inspect 360×640, 390×844, 844×390, 1440×900. Test full run, reload during board and draft, loss, new run, storage denied, actual production controls.

## Intent and decision
User explicitly delegates ambitious feature selection, design, implementation and optional production deployment while away. This supersedes interactive approval handoffs. Architectural change, planned and executed in the existing isolated worktree. Alternatives considered: more campaign worlds (content, limited new decisions); sticky expansion (interesting local mechanic, less replay structure); expedition (chosen: meaningful decisions linking puzzles into a run).

## Experience
A dedicated atmospheric expedition screen doubles as entrance, route map, relic draft and results. Nine connected nodes in three chapters. Normal rooms offer safe and risk routes; rooms 3/6/9 offer a guardian. Safe grants target+3 moves, risk target+1, guardian target+2. Base score 100/180/300; perfect solutions add 50, streaks reward consistent play. No timer. All legal forward moves are final: no undo/reset in expedition; sacrificing a life restarts the room with a fresh route choice. Menus and reload preserve the current attempt. Explain these stakes before starting and in-board.

Start with swap only. Relics include rotation, mirroring, +1 move, enhanced perfect bonus, recovery on guardian victory and 25% score bonus. Draft three distinct unowned relics after rooms 2,4,6,8. Six relics mean at least three choices until the last draft. Relics visibly change moves, rules or scoring, and their effects appear in the HUD/draft. Guardians ramp length/difficulty and use exact verified solvable puzzles. Failed rooms consume one life and no points. Final room victory ends the run.

## Architecture and contracts
`src/game/modes/expedition.ts`: pure TypeScript ExpeditionMode implements BoardMode (kind expedition); deterministic puzzle generation using existing core, state machine, separate versioned local storage. No Phaser. Separate key isolates corrupt expedition data from campaign saves. Validate persisted state and replay commands through core before restoring, bounded data and generator work; blocked storage remains playable in memory.

API: constructor(storage: StorageLike); readonly state: ExpeditionState|null; readonly records: {bestScore:number; wins:number; runs:number}; start(seed:number):void; chooseRoute(route:RouteKind):boolean; offers(): readonly RelicId[]; claimRelic(id:RelicId):boolean; fail():void; recordCommand(command:Command):boolean; load(id:string):ModeLevel|null; onSolved(id,moves):SolvedOutcome; isUnlocked():boolean.

State: seed, floor(1..9), phase('route'|'board'|'reward'|'won'|'lost'), lives, score, streak, relics:RelicId[], route:RouteKind|null, commands:Command[], lastResult:{kind:'solved'|'failed';points:number;perfect:boolean}|null. Export RELICS mapping id to {name,description,glyph}, RouteKind='safe'|'risk'|'guardian', EXPEDITION_SAVE_KEY, EXPEDITION_ROOMS=9. onSolved validates a solved replay, awards once and advances floor (won retains floor9). floor represents upcoming room during reward. fail clears attempt and returns route at same floor, or lost at zero lives. start resets run while preserving records. Records counted once at terminal phase. load regenerates current board consistently; no new puzzle on resize/reload. recordCommand only accepts legal forward commands within budget, no undo/reset; it saves before transition. Recovery ignores malformed run without losing valid records.

`ExpeditionScene.ts`: all between-board UI, routing based on phase, semantic button names for browser tests. `BoardScene.ts`: reuse visuals/input/session, replay validated commands silently, checkpoint each successful forward move, expedition HUD and sacrifice action, route solved state back to expedition screen. `services.ts`: instantiate mode once; `MenuScene`, `main`, `ui`: register and surface new mode. Existing save schema unchanged.

## Risks
Synchronous generation must stay bounded; validate seed matrix and use guaranteed fallback if necessary. Reload must not refund moves or reaward points. Rapid clicks must not choose twice. New screen must fit compact landscape and mobile with readable copy and 44px controls. Default menu redesign must keep existing main entry and daily/blitz hit targets discoverable; update coordinate-based tests intentionally.

## Validated tuning
Normal target minima rise 1/2/3 by chapter; guardians 2/2/3 with lengths up to 11. Exact generator uses bounded attempts and verified fallback. Runemynt grants +25% rounded score so Gullsegl remains a meaningful alternative. Invalid floor/relic-count combinations are rejected on restore. Independent reviews reproduced and fixed modal gesture leakage, corrupt fifth-relic saves and initial weak balance.
