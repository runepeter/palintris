import { journeyTrial, journeyTrialUnlocked } from '../content/journeyTrials';
import { screenWidth, screenHeight } from './viewport';
import { makeBackdrop } from './art';
import Phaser from 'phaser';
import { campaignProgress } from '../core/storage';
import { journeyNextLevel } from '../game/journey';
import { masteryProgressCount, masteryOffer, practiceDestination } from '../game/mastery';
import { isWorldUnlocked, parseLevelId, WORLD_COUNT } from '../core/progression';
import { dailyShareText, mmss, sharedAttempt } from '../game/daily';
import { resultPresentation } from '../game/feedback';
import { parseFreeLevelId } from '../game/modes/free';
import type { SolvedOutcome } from '../game/modes/types';
import { COLORS, cssColor, durations, EASING, RADIUS, SPACE, worldAccent } from '../theme/theme';
import type { ModeKind } from './BoardScene';
import { Effects } from './effects';
import { services } from './services';
import { contentWidth, copyText, makeButton, makeLabel, SCENE } from './ui';

interface ResultData {
  readonly mode: ModeKind;
  readonly levelId: string;
  readonly outcome: SolvedOutcome;
  readonly movesUsed: number;
  readonly target: number;
  /** Bare daglig måler tid; ellers 0. */
  readonly timeMs: number;
}

const EMPTY_OUTCOME: SolvedOutcome = { stars: 0, previousStars: 0, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };

export class ResultScene extends Phaser.Scene {
  private mode: ModeKind = 'campaign';
  private levelId = '';
  private outcome: SolvedOutcome = EMPTY_OUTCOME;
  private movesUsed = 0;
  private target = 0;
  private timeMs = 0;
  private copied: 'idle' | 'ok' | 'fail' = 'idle';
  /** Sann etter første build; en resize skal tegne stjernene statisk uten å gjenta tweens/effekter. */
  private celebrated = false;

  /** Fast referanse, så teardown kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => this.rebuild();

  constructor() {
    super(SCENE.result);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: Partial<ResultData> = {}): void {
    this.mode = data.mode ?? 'campaign';
    this.levelId = data.levelId ?? '';
    this.outcome = data.outcome ?? EMPTY_OUTCOME;
    this.movesUsed = data.movesUsed ?? 0;
    this.target = data.target ?? 0;
    this.timeMs = data.timeMs ?? 0;
    this.copied = 'idle';
    this.celebrated = false;
  }

  private rebuild(): void {
    this.children.removeAll(true);
    this.build();
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private build(): void {
    const landscape = screenHeight(this) < 560 && screenWidth(this) > screenHeight(this) * 1.25;
    makeBackdrop(this, 'hero', landscape ? 720 : 480);
    const s = services(this);
    const reducedMotion = s.settings().reducedMotion;
    const d = durations(reducedMotion);
    const effects = new Effects(this, reducedMotion);
    // Fri spilling bruker et eget id-format (free-w{verden}-{n}), ikke kampanjens w{verden}-{nn}.
    const parsed = this.mode === 'free' ? parseFreeLevelId(this.levelId) : parseLevelId(this.levelId);
    const trial = this.mode === 'campaign' ? journeyTrial(this.levelId) : undefined;
    const world = trial?.world ?? parsed?.world ?? 1;
    // Dagens brett hører ikke til en verden og bruker modusens egen farge.
    const accent = this.mode === 'daily' ? COLORS.inkMuted : worldAccent(world);
    const h = screenHeight(this);
    const w = screenWidth(this);
    const cx = w / 2;
    const summaryX = landscape ? cx - Math.min(170, w * 0.2) : cx;
    const summaryY = landscape ? h * 0.52 : h * 0.31;
    const titleY = landscape ? 78 : Math.min(h * 0.165, summaryY - 120);
    const presentation = resultPresentation(this.outcome.stars, this.outcome.previousStars);

    const animate = !this.celebrated;
    makeLabel(this, summaryX, titleY - 36, this.resultEyebrow(world), {
      size: 10, color: COLORS.star, font: 'body', bold: true,
    }).setLetterSpacing(2.2);
    const title = makeLabel(this, summaryX, titleY, presentation.title, {
      size: landscape ? 30 : Math.min(38, w * 0.095), color: COLORS.ink, bold: true,
    }).setShadow(0, 3, cssColor(COLORS.shadow), 8, true, true);
    const titleWidth = landscape ? Math.min(320, w / 2 - 36) : w - 40;
    title.setScale(Math.min(1, titleWidth / title.width));
    this.buildRatingSeal(summaryX, summaryY, accent, d, effects, animate);
    this.celebrated = true;
    makeLabel(this, summaryX, summaryY + 83, `${this.movesUsed} trekk  ·  mål ${this.target}`, {
      size: 15, color: COLORS.inkMuted, font: 'body',
    }).setStroke(cssColor(COLORS.shadow), 4);
    if (presentation.isPersonalBest) {
      makeLabel(this, summaryX, summaryY + 110, this.outcome.previousStars > 0 ? 'NY PERSONLIG BESTE' : 'FØRSTE SEIER', {
        size: 11, color: COLORS.success, font: 'body', bold: true,
      }).setLetterSpacing(1.5).setStroke(cssColor(COLORS.shadow), 4);
    }
    if (trial?.bonusGoal !== undefined) {
      const earned = this.outcome.bonusEarned === true;
      const held = s.store.data.journeyBadges?.includes(trial.id) === true;
      makeLabel(this, summaryX, summaryY + 138, earned ? '◆ MIDTBONUS · riktig brikke i midten!' : held ? '◆ MIDTBONUS · merket er bevart' : 'Speilet er løst. Prøv med ◆ i midten!',
        { size: landscape ? 11 : 12, color: earned || held ? COLORS.star : COLORS.inkMuted, font: 'body', bold: earned });
    }
    if (this.mode === 'daily') this.buildDailyStats(summaryX, summaryY + (presentation.isPersonalBest ? 136 : 112));
    if (this.outcome.worldJustUnlocked !== null) {
      this.buildUnlockBanner(summaryX, summaryY + (presentation.isPersonalBest ? 142 : 116), this.outcome.worldJustUnlocked);
    }

    const buttonsX = landscape ? cx + Math.min(170, w * 0.2) : cx;
    const buttonsTop = landscape ? h * 0.39 : h * 0.66;
    if (this.mode === 'daily') {
      this.buildDailyButtons(buttonsX, buttonsTop, accent, landscape);
      return;
    }
    const nextLevel = this.mode === 'campaign' ? journeyNextLevel(s.store.stars(), campaignProgress(s.store.data).access) : this.outcome.nextLevelId;
    const isFree = this.mode === 'free';
    const canContinue = nextLevel !== null && (isFree || (this.mode === 'campaign' ? s.modes.campaign.isUnlocked(nextLevel) : this.outcome.nextUnlocked));
    const toWorldMap = this.mode === 'campaign' || isFree;
    makeButton(this, {
      x: buttonsX, y: buttonsTop, width: 268, height: 58,
      label: canContinue ? (this.mode === 'sticky' ? 'Neste prøvebrett  →' : 'Neste speil  →') : toWorldMap ? 'Til verdenskartet  →' : 'Til menyen  →', accent,
      onClick: () => {
        if (canContinue && nextLevel !== null) {
          this.scene.start(SCENE.board, { mode: this.mode, levelId: nextLevel });
        } else {
          this.scene.start(toWorldMap ? SCENE.worldMap : SCENE.menu, toWorldMap ? { world } : undefined);
        }
      },
    });
    if (this.mode === 'campaign' && trial !== undefined && trial.id === 'journey-quota-01' && journeyTrialUnlocked('journey-quota-02', s.store.data)) {
      makeButton(this, { x: buttonsX, y: buttonsTop + 126, width: 268, height: 44, label: 'Øv mer: Spar flyttene', labelSize: 14, accent: COLORS.line,
        onClick: () => this.scene.start(SCENE.board, { mode: 'campaign', levelId: 'journey-quota-02' }) });
    }
    if (this.mode === 'campaign' && trial === undefined) {
      const offer = masteryOffer(s.store.data, world);
      const practice = offer === null ? practiceDestination(s.store.data, world) : null;
      const adaptive = offer ?? practice;
      if (adaptive !== null) {
        makeButton(this, { x: buttonsX, y: buttonsTop + 126, width: 268, height: 44,
          label: offer !== null ? 'Prøv mestringsprøven' : 'Øv på et kjent speil', labelSize: 14, accent: COLORS.line,
          onClick: () => this.scene.start(SCENE.board, { mode: 'campaign', levelId: adaptive }) });
        const checkpoint = offer === null ? null : s.modes.campaign.load(offer);
        if (checkpoint !== null) {
          const opensWorld = world < WORLD_COUNT && !isWorldUnlocked(world + 1, s.store.stars(), campaignProgress(s.store.data).access);
          const reward = opensWorld ? `Åpne verden ${world + 1}` : 'Få mestringsmerket';
          makeLabel(this, buttonsX, buttonsTop + 160, `${reward} · høyst ${checkpoint.target + 1} trekk`,
            { size: 11, color: COLORS.inkMuted, font: 'body' });
        }
      } else if (this.outcome.worldJustUnlocked === null && !campaignProgress(s.store.data).access.masteredWorlds.includes(world)) {
        const progress = masteryProgressCount(s.store.data, world);
        if (progress !== null) makeLabel(this, buttonsX, buttonsTop + 126, `${Math.min(3, progress)}/3 sterke forsøk mot mestringsprøven`,
          { size: 12, color: COLORS.inkMuted, font: 'body' });
      }
    }
    const secondaryY = buttonsTop + 70;
    if (!isFree) {
      makeButton(this, {
        x: buttonsX - 70, y: secondaryY, width: 132, height: 44, label: 'Spill igjen', labelSize: 13, accent: COLORS.line,
        onClick: () => this.scene.start(SCENE.board, { mode: this.mode, levelId: this.levelId }),
      });
    }
    makeButton(this, {
      x: isFree ? buttonsX : buttonsX + 70, y: secondaryY, width: 132, height: 44, label: toWorldMap ? 'Verdenskart' : 'Meny',
      labelSize: 13, accent: COLORS.line,
      onClick: () => {
        if (toWorldMap) this.scene.start(SCENE.worldMap, { world });
        else this.scene.start(SCENE.menu);
      },
    });
  }

  /** Streaken leses som lagret: modusen har alt oppdatert den for dagens første løsning. */
  private buildDailyStats(cx: number, y: number): void {
    const daily = services(this).store.data.daily;
    const attempt = daily.attempts.filter((a) => a.puzzleId === this.levelId).length;
    makeLabel(this, cx, y, `Tid ${mmss(this.timeMs)} · forsøk ${attempt} · rekke ${daily.streak}`, {
      size: 16, color: COLORS.inkMuted, font: 'body',
    }).setStroke(cssColor(COLORS.shadow), 4);
  }

  private buildDailyButtons(cx: number, top: number, accent: number, landscape: boolean): void {
    makeButton(this, {
      x: cx, y: top, width: 268, height: 58, label: 'Nytt forsøk  →', accent,
      onClick: () => this.scene.start(SCENE.board, { mode: 'daily' }),
    });
    const share = sharedAttempt(services(this).store.data.daily.attempts, this.levelId);
    const text = share === undefined ? null : dailyShareText(share);
    makeButton(this, {
      x: cx - 70, y: top + 70, width: 132, height: 44,
      label: this.copied === 'ok' ? 'Kopiert' : 'Del', labelSize: 13, accent: COLORS.line, enabled: text !== null,
      onClick: () => {
        if (text === null) return;
        void copyText(text).then((ok) => {
          this.copied = ok ? 'ok' : 'fail';
          this.rebuild();
        });
      },
    });
    if (this.copied === 'fail') {
      makeLabel(this, cx, top + (landscape ? 105 : 126), 'Kunne ikke kopiere', { size: 12, color: COLORS.danger, font: 'body' });
    }
    makeButton(this, {
      x: cx + 70, y: top + 70, width: 132, height: 44, label: 'Daglig', labelSize: 13, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.daily),
    });
  }

  /** Medaljongene tegnes som grafikk, så belønningen matcher juvelene uten fontavhengige stjernetegn. */
  private buildRatingSeal(cx: number, y: number, accent: number, d: ReturnType<typeof durations>, effects: Effects, animate: boolean): void {
    const seal = this.add.graphics();
    seal.fillStyle(COLORS.shadow, 0.72);
    seal.fillCircle(cx, y + 5, 77);
    seal.fillStyle(COLORS.panel, 0.94);
    seal.fillCircle(cx, y, 74);
    seal.lineStyle(1, accent, 0.22);
    seal.strokeCircle(cx, y, 66);
    seal.lineStyle(2, accent, 0.7);
    seal.strokeCircle(cx, y, 74);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const inner = 79;
      const outer = i % 3 === 0 ? 88 : 84;
      seal.lineStyle(i % 3 === 0 ? 2 : 1, accent, i % 3 === 0 ? 0.7 : 0.28);
      seal.lineBetween(cx + Math.cos(angle) * inner, y + Math.sin(angle) * inner, cx + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }

    for (let i = 0; i < 3; i++) {
      const filled = i < this.outcome.stars;
      const x = cx + (i - 1) * 49;
      const medal = this.add.graphics();
      medal.fillStyle(COLORS.shadow, 0.85);
      medal.fillCircle(0, 3, 22);
      medal.fillStyle(filled ? COLORS.panel : COLORS.background, 1);
      medal.fillCircle(0, 0, 21);
      medal.lineStyle(filled ? 2.5 : 1.5, filled ? COLORS.star : COLORS.locked, filled ? 1 : 0.55);
      medal.strokeCircle(0, 0, 21);
      medal.lineStyle(1, filled ? COLORS.star : COLORS.line, filled ? 0.45 : 0.3);
      medal.strokeCircle(0, 0, 16);
      const glyph = filled ? COLORS.star : COLORS.locked;
      medal.fillStyle(glyph, filled ? 1 : 0.4);
      medal.fillPoints([{ x: 0, y: -11 }, { x: 4, y: -4 }, { x: 11, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 11 }, { x: -4, y: 4 }, { x: -11, y: 0 }, { x: -4, y: -4 }], true);
      const holder = this.add.container(x, y, [medal]);
      if (filled && animate) {
        holder.setScale(0);
        this.tweens.add({ targets: holder, scale: 1, duration: d.normal, ease: EASING.pop, delay: i * d.snap });
      }
    }
    if (animate && this.outcome.stars === 3) {
      effects.confetti(cx, y, 54);
    }
  }

  private resultEyebrow(world: number): string {
    if (this.mode === 'sticky') return `STICKY  ·  PRØVEBRETT ${this.levelId.slice(-2)}/03`;
    if (this.mode === 'daily') return 'DAGENS SPEIL ER ÅPNET';
    if (this.mode === 'free') return `FRI SPILLING  ·  VERDEN ${world}`;
    const trial = journeyTrial(this.levelId);
    return trial === undefined ? `SPEIL ${this.levelId.toUpperCase()}  ·  VERDEN ${world}` : `${trial.displayTitle.toUpperCase()}  ·  VERDEN ${world}`;
  }

  private buildUnlockBanner(x: number, y: number, world: number): void {
    const w = Math.min(contentWidth(this) - SPACE.xl, 320);
    const height = 48;
    const g = this.add.graphics();
    g.fillStyle(worldAccent(world), 1);
    g.fillRoundedRect(-w / 2, -height / 2, w, height, RADIUS.panel);
    const label = makeLabel(this, 0, 0, `Verden ${world} låst opp!`, { size: 16, color: COLORS.background, bold: true });
    this.add.container(x, y, [g, label]);
  }
}
