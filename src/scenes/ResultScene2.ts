import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { parseLevelId } from '../core/progression';
import type { SolvedOutcome } from '../game/modes/types';
import { COLORS, durations, EASING, RADIUS, SPACE, worldAccent } from '../theme/theme';
import { Effects } from './effects';
import { services } from './services';
import { contentWidth, makeButton, makeLabel, SCENE } from './ui';

interface ResultData {
  readonly levelId: string;
  readonly outcome: SolvedOutcome;
  readonly movesUsed: number;
  readonly target: number;
}

const EMPTY_OUTCOME: SolvedOutcome = { stars: 0, previousStars: 0, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';
const STAR_SPACING = 64;

export class ResultScene2 extends Phaser.Scene {
  private levelId = '';
  private outcome: SolvedOutcome = EMPTY_OUTCOME;
  private movesUsed = 0;
  private target = 0;
  /** Sann etter første build; en resize skal tegne stjernene statisk uten å gjenta tweens/effekter. */
  private celebrated = false;

  /** Fast referanse, så teardown kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() {
    super(SCENE.result);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: Partial<ResultData> = {}): void {
    this.levelId = data.levelId ?? '';
    this.outcome = data.outcome ?? EMPTY_OUTCOME;
    this.movesUsed = data.movesUsed ?? 0;
    this.target = data.target ?? 0;
    this.celebrated = false;
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
    const parsed = parseLevelId(this.levelId);
    const world = parsed?.world ?? 1;
    const accent = worldAccent(world);
    const h = this.scale.height;
    const cx = this.scale.width / 2;
    const starsY = h * 0.32;

    const animate = !this.celebrated;
    makeLabel(this, cx, h * 0.14, 'Løst!', { size: 40, color: accent, bold: true });
    this.buildStars(cx, starsY, d, effects, animate);
    this.celebrated = true;
    makeLabel(this, cx, starsY + 56, `${this.movesUsed} trekk · mål ${this.target}`, { size: 18, color: COLORS.inkMuted, font: 'body' });
    if (this.outcome.worldJustUnlocked !== null) {
      this.buildUnlockBanner(cx, starsY + 104, this.outcome.worldJustUnlocked);
    }

    const buttonsTop = h * 0.62;
    const nextLevel = this.outcome.nextLevelId;
    makeButton(this, {
      x: cx, y: buttonsTop, width: 220, height: 52, label: 'Neste', accent, enabled: this.outcome.nextUnlocked,
      onClick: () => {
        if (nextLevel !== null) this.scene.start(SCENE.board, { levelId: nextLevel });
      },
    });
    makeButton(this, {
      x: cx, y: buttonsTop + 60, width: 220, height: 44, label: 'Spill igjen', accent: COLORS.inkMuted,
      onClick: () => this.scene.start(SCENE.board, { levelId: this.levelId }),
    });
    makeButton(this, {
      x: cx, y: buttonsTop + 120, width: 220, height: 44, label: 'Verdenskart', accent: COLORS.inkMuted,
      onClick: () => this.scene.start(SCENE.worldMap, { world }),
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
