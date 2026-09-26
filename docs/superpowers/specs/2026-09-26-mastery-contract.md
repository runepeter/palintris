# Verdict: implementable without replacing campaign content or forging stars
Use each world's existing level 15 as optional mastery checkpoint. Store offered/passed access independently of stars. Keep current 12-solves route. Smallest honest reload contract: campaign still restarts its board, and reopening after a move terminates the original first attempt as interrupted; it never creates a fresh strong first attempt. True board resume is an optional larger alternative, not necessary for delivery 2.

## Verified code and content
- `src/core/progression.ts`: 6×15, next world after 12 solved; normal level requires its immediate predecessor solved.
- `src/game/intro.ts`: mandatory IDs w1-01,w2-01,w3-01,w4-01,w5-01 AND w5-02. `introsSeen` only means dismissed and is insufficient evidence of learning.
- `src/content/campaign.v1.json`: n15 targets 3,3,3,3,4,4; all exact. Thus n15 is harder by target than introductory n1 (1,2,2,2,3,3), without changing saved boards.
- `BoardScene` currently restarts campaign on entry, measures elapsed only for daily, and does not call `mode.isUnlocked()` before starting. Add campaign guard.
- `BoardSession.dispatch()` synchronously emits `onViewChange`, which can call `onSolved` BEFORE dispatch returns. Record accepted commands before that solve call, not after dispatch.
- Solver-only onChange has no command; it must never add moves or undo/reset observations. `unknown` is not failure.

## Exact pure interfaces / targets
- New `src/game/mastery.ts`: `familyFor(id): Family|null`, `classify(attempt, level): 'strong'|'ordinary'|'struggling'`, `recentFirstAttempts(data,family): readonly Attempt[]`, `masteryOffer(data,world): string|null`, `practiceDestination(data,world): string|null`.
- Families: w1 adjacent; w2 rotation; w3 mirror; w4 locked; w5 hand; w6 combination. Distinguish w6 from w5 although allowedOps overlap: locked+long mixed boards are a new family. Exclude checkpoint n15 from evidence samples.
- `src/core/progression.ts`: add optional third access argument to `isWorldUnlocked`, `isLevelUnlocked`; existing callers/tests retain legacy behavior without it. No import from game into core; core owns `CampaignAccess` interface.
- `src/game/modes/campaign.ts`: owns begin/accepted-command/tick/finish methods using SaveStore; `onSolved` atomically stores real stars, attempt completion, offer grant, checkpoint pass. Mode-level load is still read-only.
- `src/game/modes/types.ts`: extend SolvedInfo with optional campaign observation only if needed; avoid making daily/blitz/free know campaign state.
- `BoardScene`: calls campaign lifecycle only for campaign; fresh entry validates access. ResultScene/WorldMapScene/journey consume the same effective access, not stars-only calculations.

## Storage contract (add optional field; retain saveVersion=1 and existing SAVE_KEY)
```ts
type Family = 'adjacent'|'rotation'|'mirror'|'locked'|'hand'|'combination';
type EndReason = 'solved'|'reset'|'exhausted'|'interrupted'|'invalid';
interface FirstAttempt {
  levelId: string; contentVersion: number; ordinal: number;
  activeMs: number; movesMade: number; undoCount: number;
  end?: { reason: EndReason; movesUsed: number };
}
interface CampaignAccess { offeredCheckpoints: readonly string[]; masteredWorlds: readonly number[] }
interface CampaignProgress {
  firstAttempts: Readonly<Record<string, FirstAttempt>>;
  access: CampaignAccess;
}
// SaveData.campaign?: CampaignProgress; getter returns empty default for old saves.
```
- At first entry of an unsolved non-checkpoint ID, persist its empty record BEFORE input. Already starred legacy levels never become first attempts. Immutable ordinal=max+1 expresses first-start order; recent window sorts ordinal descending, filters completed attempts in family, takes 5.
- Reenter an existing unfinished record: if movesMade>0, finish once as interrupted BEFORE fresh board starts; otherwise keep its cumulative activeMs. Existing terminal record never overwrites/reclassifies. No command log/resume required.
- Accepted move increments movesMade even if later undone. Accepted undo increments undoCount; cannot reset historical observation. Rejected input changes nothing.
- Accepted reset ends the first attempt as reset only if movesMade>0; empty-board reset is harmless. Repeated resets/replays cannot add samples.
- Solved wins over budget-exhausted when both occur on same command. Unsolved budgetLeft<=0 terminates as exhausted. Do not terminate on solver deadEnd alone: a later undo might recover, already preventing strong classification.
- A first attempt ending reset/exhausted/interrupted stays terminal even if the later run solves; real stars still improve normally.
- Parse each optional campaign subfield independently, finite nonnegative counters/valid IDs only, no duplicate IDs/ordinals. Malformed record with identifiable ID becomes terminal invalid (never fresh strong). Bad campaign data must not drop any old stars/settings/daily/expedition.
- Validate offered checkpoint IDs are n15; accept masteredWorlds only 1..6 with corresponding real n15 stars and mandatory introductory stars. Invalid grants fail closed. Do not prune valid durable access based on moving evidence window.

## Active clock and classifications
- Count visible, active board-thinking time from entry after introduction dismissal; include deliberation BEFORE first move. This avoids rewarding a long first-move think with zero seconds.
- Tick only if campaign, unfinished, !document.hidden, scene active, no pause/settings/intro overlay, no pending move tween/input animation, no pending victory. Do NOT pause just because the segment-command chooser is open: it is gameplay.
- Use frame delta only while eligible; exclude resume's stale delta (reset last-active sample on visibility/pause transition). Persist every accepted command, once/sec, visibility/pagehide, menu exit and teardown. Cumulative zero-move time survives reentry. Background time never added from wall clock.
- Strong iff terminal solved, exact target, undoCount===0, and either movesUsed<=target (ANY active time) or movesUsed===target+1 && activeMs<=15000*max(1,target). Target-normalized speed only supports near-optimal play; never reduces optimum.
- Struggling iff terminal reset/exhausted (only after >=1 move). Interrupted or invalid telemetry is ordinary, not struggling: closing a phone tab is not evidence of low skill. A slow completed solve alone is ordinary; never a downgrade.
- Windows are up to five most recently STARTED and now completed distinct new levels in that family; 3 strong among that window triggers, including a window of length3. Replaying a solved level, practice or side mode never inserts/replaces samples.

## Exact unlock / bonus / checkpoint semantics
- Offer n15 when >=3 strong/last5 in its world family AND every intro in that world has actual star>0 AND world currently unlocked. Persist offer when an attempt ends; available forever even if later performance weakens.
- Offer unlocks only n15 early. It does not unlock any later world or repeated nodes by itself. User explicitly chooses secondary action “Prøv mestringsprøven”; regular next level remains primary.
- When offered n15 is actually solved with movesUsed<=target+1, persist masteredWorlds += world. Checkpoint retries are allowed and need not be first attempts; time is irrelevant. Undo/reset do not create evidence samples and never revoke offer; final checkpoint solution is its own pass criterion.
- Passing grants next world's n1 (if world<6), plus bonus access to skipped repetition levels in mastered world. Grant each repeat only when every earlier introduction in that world has real stars; never grant intro levels through bonus access. Skipped levels keep zero stars and remain playable bonus content.
- `isWorldUnlocked(w,stars,access) = legacyGate(w) || masteredWorlds.includes(w-1)` for valid w only.
- `isLevelUnlocked`: require effective world gate, then accept n1, solved immediate predecessor, explicit offered checkpoint with intro prerequisites, or bonus repeat in mastered world with intro prerequisites. Sequential progression must use EFFECTIVE world gate (not call old stars-only legacyUnlock). Already-starred levels remain replayable.
- n15 ordinary solve without offered access follows old progression only; legacy n15 star is not automatically a new mastery pass. This avoids silently changing old routes.
- Journey prioritizes current highest effectively unlocked world's mandatory intro, then normal unsolved progression. It never sends players back to starless skipped repetitions after they pass a checkpoint. All 6 worlds mastered => journey complete; stars remain an independent collection objective.
- Practice offer: >=3 struggling among same family window, evaluated between boards. Choose already solved non-checkpoint same-family ID with lowest target, then shortest board, then ID. It is an explicit optional campaign replay; no extra save field/mode. If none solved, no claim of easier available practice. Never change normal recommendation/access or an ongoing board.

## Required regression tests
1. Old save retains stars/settings/intros/daily; corrupt campaign telemetry cannot erase these or grant illegal worlds.
2. Same optimal solution at 1sec vs1hour both strong; target+1 qualifies only within normalized threshold; long time alone never struggling.
3. Accepted undo cannot be erased by reset/reload; failed input doesn't count; winning move recorded before synchronous onSolved.
4. Reload after movement ends first attempt once as ordinary, never struggling; repeated reentry/reset/replay never creates 3 strong signals from one ID. Reload before first move retains time. Side modes untouched.
5. Visible idle thinking counts; hidden/pause/intro/movement/victory time does not; resume delta ignored; menu/pagehide flush tested.
6. Three strong in3 and3in5 offer;2in5 do not; latest-start ordering and family separation explicit; checkpoint excluded.
7. Offer w5-15 blocked until BOTH w5-01 and w5-02 solved, even when introsSeen contains them. Direct board navigation guarded.
8. w1-01..03 strong -> optional w1-15, w1-04 regular; n15 pass -> w2-01 and w1 bonus repeats, no fake stars; w2-02 locked until w2-01 solved.
9. Normal12-solves gate preserved; offer/pass persist through reload and weaker later attempts; duplicate onSolved idempotent; w6 mastery never creates world7.
10. Practice replay never replaces first sample, demotes access, steals Continue focus, or changes active puzzle; checkpoint fail allows retry.
