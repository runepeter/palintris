# Speilekspedisjonen implementation plan

## Done, scope and verification
Follow the explicit Done, Out of scope and Verification sections of `docs/superpowers/specs/2026-09-25-expedition-design.md`.

> Execution: subagent implements pure domain while parent builds independent UI/integration; independent scoped code/visual review before release. User delegated autonomous design and implementation.

## Tasks
- [x] 1. Domain: `src/game/modes/expedition.ts`, `src/game/__tests__/expedition.test.ts`. Write failing tests first for deterministic boards, exact solvability, safe/risk budgets, relic effects, illegal phase transitions, repeated completion, full victory/loss, persisted replay, corrupt and denied storage. Implement the spec API exactly. Run focused Vitest. No Phaser and no changes to other modes/storage schema.
- [x] 2. Scene and integration: `src/scenes/ExpeditionScene.ts`, BoardScene/services/MenuScene/ui/main; mode kind in types. Write `e2e/expedition.spec.ts` first: enter from menu, choose route, make move, reload, solve using core solver through genuine input, draft, lose, restart. Observe missing feature failure, implement, pass. Expedition moves are irreversible; show this before play and replace unusable hand slots with relic/rule summary. Sacrifice requires confirmation. Exit suspends. Restore replay before render without duplicate checkpoints.
- [x] 3. QA and release: add production menu/resume coverage to `e2e/production`; run all suites; inspect responsive layouts and full gameplay. Independent code and visual reviewer uses actual evidence. Fix concrete findings, rerun affected checks. Update README and release notes with actual evidence. Signed branch commit if available; no push. Deploy directly to cyclaw/palintris only if CLI authenticated and checks/review pass; verify public build and play flow.

## Review focus
1. Reload after winning final move and mid-draft: no duplicate points or lost relic choices (domain + browser).
2. Repeated enter/sacrifice/draft actions: phase guards and single life loss (domain + browser).
3. Bad JSON, untrusted commands, nonfinite counts: discard bad active run, preserve records and campaign (domain).
4. Mobile landscape and large text: visible route/choice/exit controls, no overlap (browser/visual).
5. Generation with all relic combinations: legal solution in displayed budget, deterministic and bounded (domain).

## Progress / rulings
- Baseline: detached isolated worktree at origin/main 03a2bfb; only preexisting .codex untracked. No prod DB/migrations: fully static client game. Existing flows verified in BoardScene -> BoardSession -> core apply + Worker solver; SaveStore is browser-local. Reuse these flows.
- User absence/autonomy supersedes interactive skill approval steps. Use written contract and independent reviews.
- Obsidian unavailable; repository design docs and current code are context source.

- Domain review: three findings fixed and independently re-reviewed. 341 unit tests pass. Full nine-room real-input E2E passes; six production checks pass across Chromium/WebKit. Dialog gesture regression reproduced red and now green.

- Visual review passed with no blockers. Four viewport tests passed. Full development suite:32/33, old settings coordinate updated for new landscape menu and last-failed rerun1/1 passed. Production artifact will be deployed directly with Vercel Build Output API, preserving Git push restriction.
- Final production rebuild: 6/6 Chromium/WebKit checks passed. Published to palintris.vercel.app; all twelve public files match tested dist exactly. Public UI verified through first-room play, mid-room reload, resume and solve. Release details and rollback deployment are in docs/release-expedition.md.
