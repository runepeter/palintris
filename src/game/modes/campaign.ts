import { journeyTrial, journeyTrialUnlocked, type JourneyTrial } from '../../content/journeyTrials';
import { hasCenterBonus } from '../../core/goals';
import { isPalindrome } from '../../core/palindrome';
import { journeyNextLevel } from '../journey';
import { CAMPAIGN, getCampaignLevel } from '../../content/campaign';
import type { Command } from '../../core/commands';
import { rulesFor } from '../../core/level';
import { isLevelUnlocked, isWorldUnlocked, nextLevelId, parseLevelId, WORLD_COUNT } from '../../core/progression';
import { starsFor } from '../../core/scoring';
import { campaignProgress, recordJourneyBadge, recordStars, type FirstAttempt, type SaveData } from '../../core/storage';
import { masteryOffer } from '../mastery';
import { canUseSpeilglimt, debitSpeilglimt, speilglimtBalance } from '../tools';
import type { SessionView } from '../session';
import type { SaveStore } from '../saveStore';
import type { BoardMode, ModeLevel, SolvedInfo, SolvedOutcome } from './types';

export class CampaignMode implements BoardMode {
  readonly kind = 'campaign' as const;

  private activeId: string | null = null;
  private preview = false;
  private pendingMs = 0;
  private runAssisted = false;

  constructor(private readonly store: SaveStore) {}

  beginAttempt(id: string, preview = false): void {
    if (this.activeId !== null) this.flushAttempt(this.activeId);
    this.activeId = id;
    this.preview = preview;
    this.runAssisted = false;
    this.pendingMs = 0;
    const level = getCampaignLevel(id);
    if (preview || level === undefined || !this.isUnlocked(id) || parseLevelId(id)?.n === 15) return;
    const progress = campaignProgress(this.store.data);
    const existing = progress.firstAttempts[id];
    if (existing !== undefined) {
      if (existing.end === undefined && existing.movesMade > 0) {
        this.updateAttempt(id, (a) => ({ ...a, end: { reason: 'interrupted', movesUsed: a.movesMade } }));
      }
      return;
    }
    if ((this.store.stars()[id] ?? 0) > 0) return;
    const ordinal = Math.max(0, ...Object.values(progress.firstAttempts).map((a) => a.ordinal)) + 1;
    const attempt: FirstAttempt = { levelId: id, contentVersion: level.contentVersion, ordinal, activeMs: 0, movesMade: 0, undoCount: 0 };
    this.store.update((d) => ({ ...d, campaign: { ...campaignProgress(d), firstAttempts: { ...campaignProgress(d).firstAttempts, [id]: attempt } } }));
  }

  useSpeilglimt(id: string): boolean {
    if (this.preview || id !== this.activeId || !canUseSpeilglimt(id) || !this.isUnlocked(id) || speilglimtBalance(this.store.data) <= 0) return false;
    const elapsed = Math.round(this.pendingMs);
    const committed = this.store.tryUpdate((data) => {
      const debited = debitSpeilglimt(data);
      const progress = campaignProgress(debited);
      const attempt = progress.firstAttempts[id];
      if (attempt === undefined || attempt.end !== undefined) return debited;
      return { ...debited, campaign: { ...progress, firstAttempts: { ...progress.firstAttempts,
        [id]: { ...attempt, assisted: true, activeMs: attempt.activeMs + elapsed } } } };
    });
    if (committed) {
      this.pendingMs = 0;
      this.runAssisted = true;
    }
    return committed;
  }

  recordCommand(id: string, command: Command, view: Pick<SessionView, 'movesUsed' | 'budgetLeft' | 'solved'>): void {
    this.flushAttempt(id);
    this.updateAttempt(id, (a) => {
      if (command.type === 'reset') return a.movesMade === 0 ? a : { ...a, end: { reason: 'reset', movesUsed: view.movesUsed } };
      const next = command.type === 'undo' ? { ...a, undoCount: a.undoCount + 1 } : { ...a, movesMade: a.movesMade + 1 };
      return !view.solved && view.budgetLeft <= 0 ? { ...next, end: { reason: 'exhausted', movesUsed: view.movesUsed } } : next;
    });
  }

  tickAttempt(id: string, deltaMs: number): void {
    if (this.preview || id !== this.activeId || !Number.isFinite(deltaMs) || deltaMs <= 0 ||
      campaignProgress(this.store.data).firstAttempts[id]?.end !== undefined || campaignProgress(this.store.data).firstAttempts[id] === undefined) return;
    this.pendingMs += deltaMs;
    if (this.pendingMs >= 1000) this.flushAttempt(id);
  }

  flushAttempt(id: string): void {
    if (id !== this.activeId || this.pendingMs <= 0) return;
    const elapsed = Math.round(this.pendingMs);
    this.pendingMs = 0;
    this.updateAttempt(id, (a) => ({ ...a, activeMs: a.activeMs + elapsed }));
  }

  private updateAttempt(id: string, update: (a: FirstAttempt) => FirstAttempt): void {
    if (this.preview || id !== this.activeId) return;
    const attempt = campaignProgress(this.store.data).firstAttempts[id];
    if (attempt === undefined || attempt.end !== undefined) return;
    this.store.update((d) => {
      const progress = campaignProgress(d);
      const next = update(attempt);
      const updated = { ...d, campaign: { ...progress, firstAttempts: { ...progress.firstAttempts, [id]: next } } };
      return next.end === undefined ? updated : this.grantOffers(updated);
    });
  }

  private grantOffers(data: SaveData): SaveData {
    const progress = campaignProgress(data);
    const offered = [...progress.access.offeredCheckpoints];
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const offer = masteryOffer(data, world);
      if (offer !== null && !offered.includes(offer)) offered.push(offer);
    }
    return { ...data, campaign: { ...progress, access: { ...progress.access, offeredCheckpoints: offered } } };
  }

  load(levelId: string): ModeLevel | null {
    const trial = journeyTrial(levelId);
    if (trial !== undefined) return trial;
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
      targetExact: level.targetExact,
      budget: level.budget,
      contentVersion: CAMPAIGN.contentVersion,
      showBudget: true,
    };
  }

  isUnlocked(levelId: string): boolean {
    if (journeyTrial(levelId) !== undefined) return journeyTrialUnlocked(levelId, this.store.data);
    return isLevelUnlocked(levelId, this.store.stars(), campaignProgress(this.store.data).access);
  }

  onSolved(levelId: string, movesUsed: number, info?: SolvedInfo): SolvedOutcome {
    const trial = journeyTrial(levelId);
    if (trial !== undefined) return this.onTrialSolved(trial, movesUsed, info);
    const level = getCampaignLevel(levelId);
    const parsed = parseLevelId(levelId);
    const previousStars = this.store.stars()[levelId] ?? 0;
    if (level === undefined || parsed === null) {
      return { stars: 0, previousStars, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
    }
    const stars = starsFor(movesUsed, level.target, level.budget);

    this.flushAttempt(levelId);
    const unlockedBefore = this.unlockedWorlds();
    if (stars > 0) {
      this.store.update((d) => {
        let updated = recordStars(d, levelId, stars, CAMPAIGN.contentVersion);
        if (this.preview) return updated;
        const progress = campaignProgress(updated);
        const attempt = progress.firstAttempts[levelId];
        if (attempt !== undefined && attempt.end === undefined && this.activeId === levelId) {
          updated = { ...updated, campaign: { ...progress, firstAttempts: { ...progress.firstAttempts,
            [levelId]: { ...attempt, end: { reason: 'solved', movesUsed } } } } };
        }
        const access = campaignProgress(updated).access;
        if (access.offeredCheckpoints.includes(levelId) && movesUsed <= level.target + 1 && !access.masteredWorlds.includes(parsed.world)) {
          updated = { ...updated, campaign: { ...campaignProgress(updated), access: { ...access, masteredWorlds: [...access.masteredWorlds, parsed.world] } } };
        }
        return updated.campaign === undefined ? updated : this.grantOffers(updated);
      });
    }
    const unlockedAfter = this.unlockedWorlds();
    const worldJustUnlocked = unlockedAfter.find((w) => !unlockedBefore.includes(w)) ?? null;

    const next = nextLevelId(levelId);
    return {
      ...(this.runAssisted && this.activeId === levelId ? { assisted: true } : {}),
      stars,
      previousStars,
      nextLevelId: next,
      nextUnlocked: next !== null && this.isUnlocked(next),
      worldJustUnlocked,
    };
  }

  private onTrialSolved(trial: JourneyTrial, movesUsed: number, info?: SolvedInfo): SolvedOutcome {
    const previousStars = this.store.stars()[trial.id] ?? 0;
    const tiles = info?.finalTiles;
    const bonusReached = tiles !== undefined && trial.bonusGoal !== undefined && hasCenterBonus(tiles, trial.bonusGoal);
    const valid = this.isUnlocked(trial.id) && Number.isInteger(movesUsed) && movesUsed >= trial.target &&
      tiles !== undefined && tiles.length === trial.tiles.length && new Set(tiles.map((tile) => tile.id)).size === tiles.length &&
      tiles.every((tile) => trial.tiles.some((original) => original.id === tile.id && original.symbol === tile.symbol &&
        original.wild === tile.wild && original.locked === tile.locked && original.sticky === tile.sticky && original.bondedTo === tile.bondedTo &&
        (original.movesLeft === undefined ? tile.movesLeft === undefined : tile.movesLeft !== undefined &&
          Number.isSafeInteger(tile.movesLeft) && tile.movesLeft >= 0 && tile.movesLeft <= original.movesLeft))) && isPalindrome(tiles) &&
      (!bonusReached || movesUsed >= (trial.bonusTarget ?? trial.target));
    if (!valid || tiles === undefined) return { stars: 0, previousStars, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null, bonusEarned: false };
    const stars = starsFor(movesUsed, trial.target, trial.budget);
    const bonusEarned = stars > 0 && bonusReached;
    if (stars > 0) this.store.update((data) => {
      const updated = recordStars(data, trial.id, stars, trial.contentVersion);
      return bonusEarned ? recordJourneyBadge(updated, trial.id) : updated;
    });
    const next = journeyNextLevel(this.store.stars(), campaignProgress(this.store.data).access);
    return { stars, previousStars, nextLevelId: next, nextUnlocked: next !== null && this.isUnlocked(next), worldJustUnlocked: null, bonusEarned };
  }

  private unlockedWorlds(): number[] {
    const stars = this.store.stars();
    const out: number[] = [];
    for (let w = 1; w <= WORLD_COUNT; w++) if (isWorldUnlocked(w, stars, campaignProgress(this.store.data).access)) out.push(w);
    return out;
  }
}
