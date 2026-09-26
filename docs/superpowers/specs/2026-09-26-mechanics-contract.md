# Verdict: three small fixtures verified; no campaign regeneration required
Two quota boards and one marked-center board have exact legal traces through the CURRENT engine, wrapped by the proposed quota postcheck. The center board has genuinely different ordinary/bonus solutions, and the bonus route never passes an earlier auto-completing palindrome. No product files edited.

## Evidence / rerun
- Probe: `/tmp/palintris-mechanics-probe.ts`; output: `/tmp/palintris-mechanics-evidence.json.txt`.
- Run from repo: `node --import tsx /tmp/palintris-mechanics-probe.ts`. Final output `ALL_FIXTURE_ASSERTIONS_PASSED` verified.
- Probe imports real `applyMove`, `legalMoves`, `makeSnapshot`, `tilesFromString`, `makeRules`, `isPalindrome`; only added rule is immutable identity-based quota charging after real engine movement.
- BFS keys all IDs and quotas; never expands ANY palindrome, matching BoardScene's immediate win. Search minima below are exact within the supplied swap-only rules, not claimed for future rotate/mirror-enabled variants.

## Representation and engine contract
```ts
// src/core/tiles.ts, makeTile option too
readonly movesLeft?: number; // absent unlimited; integer >=0, zero means immovable
// src/core/level.ts plus ModeLevel: ordinary win remains palindrome
readonly bonusGoal?: { readonly kind:'centerTile'; readonly tileId:number };
readonly bonusTarget?: number; // separate exact bonus-route minimum, optional display
// src/core/solver.ts + solverProtocol.ts
readonly objective?: { readonly kind:'centerBonus'; readonly tileId:number };
```
- `movesLeft` belongs to Tile, so swap/rotate/mirror move it with identity, and snapshots/undo/reset naturally preserve/restore it. Do not store quota by position.
- In `applyMove`, produce candidate with existing rules, then compare each existing tile's old index with candidate index. Every limited tile whose index changed consumes exactly1. Reject whole candidate with new RejectReason `quotaExhausted` if any moved tile had0. Return fresh tile objects only for charged tiles; do not mutate original snapshots.
- Both swap participants count, even equal symbols. Rotate counts every changed identity, including wrap. Odd mirror leaves middle identity unchanged and consumes no quota there. Quota0 is NOT locked=true: a zero-quota mirror middle must remain legal although current `segment()` rejects any locked member.
- Initial quota content rejects hand cards, wild/sticky/bonded/locked tiles during content validation and enables only swap. Broader mixed mechanics remain outside delivery4 fixtures. Still implement/test rotate+mirror quota behavior in core now.
- `legalMoves` may keep generating quota-invalid candidates because BFS already filters through applyMove; optional filtering is optimization only.
- Preserve fast current symbolKey for unconstrained ordinary requests. When quotas or center objective occur, key must include ordered tile IDs, symbols/flags, remaining quotas, hand counts and existing sticky structure. Quota presence/absence and 0 differ. Never use symbolKey alone.
- Solver normal request still seeks any palindrome. centerBonus request accepts palindrome only with matching center ID, and MUST stop expanding non-bonus palindromes; gameplay already auto-completes them. Initially solved non-bonus request returns unreachable. Pass objective through worker JSON both ways.
- Pure `hasCenterBonus(tiles,goal)` checks odd length, palindrome AND center.id===goal.tileId. Require exactly one matching ID and >=3 tiles of marked tile's symbol in fixture validation. A missing/removed marked ID is no bonus.
- `BoardSession` remains ordinary-palindrome completion. Pass finalTiles via optional SolvedInfo to CampaignMode, which computes bonus using content goal; never grant on symbol match alone. Store badge monotonically in a separate optional `journeyBadges` ID set; replay without bonus does not erase it.

## Exact fixtures (indices zero-based; A0 means symbol A / immutable id0)
All tiles initially unlocked/nonwild; hand={wild:0,remove:0}; allowedOps=['swap']; q is movesLeft. All starts are non-palindromes.
1. `journey-quota-01`, title “To flytt”, target=2,targetExact=true,budget=6.
   Start `A0 A1 B2[q2] A3 B4`.
   `{type:'swap',a:1,b:2}` -> `A0 B2[q1] A1 A3 B4`.
   `{type:'swap',a:0,b:1}` -> `B2[q0] A0 A1 A3 B4` = BAAAB, ordinary win.
   Exact minimum2 verified. Alternate two swaps (1,2),(1,2) leave original symbols with B2[q0] trapped at center; no reachable palindrome remains. Shows quota affects actual solvability, not just decoration.
2. `journey-quota-02`, title “Spar flyttene”, target=3,targetExact=true,budget=7.
   Start `A0[q2] B1 C2 A3 B4 C5`.
   swap(0,1) -> `B1 A0[q1] C2 A3 B4 C5`.
   swap(1,2) -> `B1 C2 A0[q0] A3 B4 C5`.
   swap(0,1) -> `C2 B1 A0[q0] A3 B4 C5` = CBAABC, ordinary win.
   Exact minimum3 verified; last move leaves exhausted A0 untouched.
3. `journey-center-01`, title “Din midtbrikke”, target=2,targetExact=true,budget=6,bonusTarget=3,bonusGoal={kind:'centerTile',tileId:0}.
   Start `A0* A1 B2 A3 B4`; star denotes marked identity, NOT wild. There are3 A tiles.
   Ordinary: swap(1,2) -> `A0* B2 A1 A3 B4`; swap(0,1) -> `B2 A0* A1 A3 B4` = BAAAB, center A1, NO badge. Exact minimum2.
   Bonus: swap(0,1) -> `A1 A0* B2 A3 B4`; swap(1,2) -> `A1 B2 A0* A3 B4`; swap(0,1) -> `B2 A1 A0* A3 B4` = BAAAB, center A0, badge. Exact bonus minimum3.
   First bonus move swaps identical symbols with different identities: current symbol-only search key loses this necessary distinction. Every preterminal state above is non-palindromic.
   Normal stars remain based on2; bonus on3 yields independent badge, not fake3 stars. UI must show bonus goal separately before first move, not imply bonus is required for completion.

## Minimal placement / access in the same journey
- New `src/content/journeyTrials.ts` immutable registry; preserve all old90 JSON records, IDs, seeds, solutions and contentVersion. No generator changes needed for these authored fixtures.
- These are CampaignMode content, not a new BoardMode or main menu. `CampaignMode.load` looks up registry before legacy parse; trials supply world/accent and displayTitle explicitly. Keep parseLevelId strict for old90 counts.
- Quota01 unlock: actual w2-01 star AND (world2 mastery passed OR >=12 real solved levels in world2). Thus introduced rotation cannot be skipped. Both ordinary and mastery routes reach new content.
- Quota02 unlock: quota01 real star; optional further practice.
- Center01 unlock: quota01 real star AND w3-01 real star. Do not require optional quota02 or its badge. New mechanics are never silently marked solved through access grants.
- Existing old90 paths are not blocked by these additions. Journey offers newly available trial through existing main Continue/reward card; existing next legacy intro takes priority. Trial result returns to normal journey recommendation, with quota02 optional secondary practice.
- Map exposes unlocked trials as small bonus cards under their world, not extra lobby buttons or counterfeit numbered nodes. Old90 total/stars remain90; trial progress/badge are separate. Already-completed legacy saves see newly unlocked trial as next new journey content.
- Store trial stars using existing recordStars IDs (parser already permits arbitrary keys); old90 solvedInWorld correctly ignores these. Access helper must explicitly whitelist trial IDs, validate prerequisites, and never infer access merely from unrecognized stars.
- Add intro specs by exact trial ID; mark quota count visually on limited identity and center badge on marked identity. Intro-seen flag is presentation only; access requires actual trial completion.

## Necessary tests / verified limits
- Probe already checks quota0 unchanged mirror center succeeds, quota0 moved swap rejects atomically, rotation decrements wrapped/moved quota correctly, both fixture minima, exact center routes, and quota trap.
- Production tests still required: both limited swap tiles decrement, negative/fractional quota validation, undo/reset restore, equal-symbol identity moves consume, move rejection leaves history/hand/nextId unchanged, solver key quota/identity distinctions, worker objective roundtrip, center ordinary win/no badge, bonus badge monotonic, legacy save migration, and all access prerequisites.
- Headless content test executes each stored trace through production applyMove, checks no earlier palindrome, then exact solver normal and bonus minima. Unknown solver result is failure to verify, never proof of impossibility.
- Probe is feasibility evidence, not implemented quota support: current shipped applyMove ignores movesLeft and current solver does not have a center objective. Parent implementation must add those contracts before exposing fixtures.
