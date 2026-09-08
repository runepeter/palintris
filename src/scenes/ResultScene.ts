import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { parseLevelId } from '../core/progression';
import { dailyShareText, mmss, sharedAttempt } from '../game/daily';
import { parseFreeLevelId } from '../game/modes/free';
import type { SolvedOutcome } from '../game/modes/types';
import { COLORS, durations, EASING, RADIUS, SPACE, worldAccent } from '../theme/theme';
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

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';
const STAR_SPACING = 64;

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
    this.playResultSound();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private playResultSound(): void {
    if (this.outcome.stars === 3) audio.playVictoryJingle();
    else audio.playPalindrome();
  }

  private build(): void {
    const s = services(this);
    const reducedMotion = s.settings().reducedMotion;
    const d = durations(reducedMotion);
    const effects = new Effects(this, reducedMotion);
    // Fri spilling bruker et eget id-format (free-w{verden}-{n}), ikke kampanjens w{verden}-{nn}.
    const parsed = this.mode === 'free' ? parseFreeLevelId(this.levelId) : parseLevelId(this.levelId);
    const world = parsed?.world ?? 1;
    // Dagens brett hører ikke til en verden og bruker modusens egen farge.
    const accent = this.mode === 'daily' ? COLORS.inkMuted : worldAccent(world);
    const h = this.scale.height;
    const cx = this.scale.width / 2;
    const starsY = h * 0.32;

    const animate = !this.celebrated;
    makeLabel(this, cx, h * 0.14, 'Løst!', { size: 40, color: accent, bold: true });
    this.buildStars(cx, starsY, d, effects, animate);
    this.celebrated = true;
    makeLabel(this, cx, starsY + 56, `${this.movesUsed} trekk · mål ${this.target}`, { size: 18, color: COLORS.inkMuted, font: 'body' });
    if (this.mode === 'daily') this.buildDailyStats(cx, starsY + 86);
    if (this.outcome.worldJustUnlocked !== null) {
      this.buildUnlockBanner(cx, starsY + 104, this.outcome.worldJustUnlocked);
    }

    const buttonsTop = h * 0.62;
    if (this.mode === 'daily') {
      this.buildDailyButtons(cx, buttonsTop, accent);
      return;
    }
    const nextLevel = this.outcome.nextLevelId;
    const isFree = this.mode === 'free';
    // Fri spilling har ingen låst progresjon; neste brett er alltid klart.
    makeButton(this, {
      x: cx, y: buttonsTop, width: 220, height: 52, label: 'Neste', accent, enabled: isFree || this.outcome.nextUnlocked,
      onClick: () => {
        if (nextLevel !== null) this.scene.start(SCENE.board, { mode: this.mode, levelId: nextLevel });
      },
    });
    // Fri spilling gir alltid et nytt brett; «Spill igjen» har ingenting å gjenta.
    if (!isFree) {
      makeButton(this, {
        x: cx, y: buttonsTop + 60, width: 220, height: 44, label: 'Spill igjen', accent: COLORS.inkMuted,
        onClick: () => this.scene.start(SCENE.board, { mode: this.mode, levelId: this.levelId }),
      });
    }
    // Kampanje og fri spilling går tilbake til verdenskartet; ingen andre moduser har et kart.
    const toWorldMap = this.mode === 'campaign' || isFree;
    makeButton(this, {
      x: cx, y: isFree ? buttonsTop + 60 : buttonsTop + 120, width: 220, height: 44,
      label: toWorldMap ? 'Verdenskart' : 'Meny', accent: COLORS.inkMuted,
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
    });
  }

  private buildDailyButtons(cx: number, top: number, accent: number): void {
    makeButton(this, {
      x: cx, y: top, width: 220, height: 52, label: 'Nytt forsøk', accent,
      onClick: () => this.scene.start(SCENE.board, { mode: 'daily' }),
    });
    const share = sharedAttempt(services(this).store.data.daily.attempts, this.levelId);
    const text = share === undefined ? null : dailyShareText(share);
    makeButton(this, {
      x: cx, y: top + 60, width: 220, height: 44,
      label: this.copied === 'ok' ? 'Kopiert' : 'Del', accent: COLORS.inkMuted, enabled: text !== null,
      onClick: () => {
        if (text === null) return;
        void copyText(text).then((ok) => {
          this.copied = ok ? 'ok' : 'fail';
          this.rebuild();
        });
      },
    });
    if (this.copied === 'fail') {
      makeLabel(this, cx, top + 90, 'Kunne ikke kopiere', { size: 14, color: COLORS.danger, font: 'body' });
    }
    makeButton(this, {
      x: cx, y: top + 120, width: 220, height: 44, label: 'Daglig', accent: COLORS.inkMuted,
      onClick: () => this.scene.start(SCENE.daily),
    });
  }

  /** animate er usann ved en resize-ombygging: stjernene tegnes da i sluttilstand, uten å gjenta tweens eller seremonieffekter. */
  private buildStars(cx: number, y: number, d: ReturnType<typeof durations>, effects: Effects, animate: boolean): void {
    for (let i = 0; i < 3; i++) {
      const filled = i < this.outcome.stars;
      const label = makeLabel(this, cx + (i - 1) * STAR_SPACING, y, filled ? STAR_FILLED : STAR_EMPTY, {
        size: 48, color: filled ? COLORS.star : COLORS.locked,
      });
      if (!filled) continue;
      if (!animate) continue;
      label.setScale(0);
      this.tweens.add({ targets: label, scale: 1, duration: d.normal, ease: EASING.pop, delay: i * d.snap });
    }
    if (animate && this.outcome.stars === 3) {
      effects.starFall(12);
      effects.confetti(cx, y, 60);
    }
  }

  private buildUnlockBanner(x: number, y: number, world: number): void {
    const w = Math.min(contentWidth(this) - SPACE.xl, 320);
    const height = 48;
    const g = this.add.graphics();
    g.fillStyle(worldAccent(world), 1);
    g.fillRoundedRect(-w / 2, -height / 2, w, height, RADIUS.panel);
    const label = makeLabel(this, 0, 0, `Verden ${world} låst opp!`, { size: 16, color: COLORS.panel, bold: true });
    this.add.container(x, y, [g, label]);
  }
}
