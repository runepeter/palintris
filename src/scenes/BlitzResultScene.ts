import { screenWidth, screenHeight } from './viewport';
import { makeBackdrop } from './art';
import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, cssColor, durations, EASING } from '../theme/theme';
import { Effects } from './effects';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';

interface BlitzResultData {
  readonly solved: number;
  readonly best: number;
  readonly isNewBest: boolean;
}

const BUTTON_W = 220;

export class BlitzResultScene extends Phaser.Scene {
  private solved = 0;
  private best = 0;
  private isNewBest = false;
  private celebrated = false;

  /** Fast referanse, så SHUTDOWN kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() {
    super(SCENE.blitzResult);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: Partial<BlitzResultData> = {}): void {
    this.solved = data.solved ?? 0;
    this.best = data.best ?? 0;
    this.isNewBest = data.isNewBest ?? false;
    this.celebrated = false;
  }

  create(): void {
    this.build();
    if (this.isNewBest) audio.playAchievement();
    else audio.playFailure();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private build(): void {
    makeBackdrop(this, 'hero');
    const w = screenWidth(this);
    const cx = w / 2;
    const h = screenHeight(this);
    const landscape = w > h * 1.25;
    const summaryX = landscape ? cx - Math.min(170, w * 0.2) : cx;
    const summaryY = landscape ? h * 0.52 : h * 0.35;
    const buttonsX = landscape ? cx + Math.min(170, w * 0.2) : cx;
    const accent = this.isNewBest ? COLORS.success : COLORS.danger;
    const reducedMotion = services(this).settings().reducedMotion;
    const animate = !this.celebrated;

    makeLabel(this, summaryX, landscape ? 42 : h * 0.105, 'BLITZ  ·  TIDEN ER UTE', {
      size: 10, color: COLORS.star, font: 'body', bold: true,
    }).setLetterSpacing(2.2);
    makeLabel(this, summaryX, landscape ? 78 : h * 0.165, this.isNewBest ? 'Ny rekord' : 'Sterk runde', {
      size: landscape ? 32 : Math.min(40, w * 0.1), color: COLORS.ink, bold: true,
    }).setShadow(0, 3, cssColor(COLORS.shadow), 8, true, true);
    this.buildScoreSeal(summaryX, summaryY, accent, animate, reducedMotion);
    makeLabel(this, summaryX, summaryY + 102, `Personlig beste  ·  ${this.best}`, {
      size: 15, color: COLORS.inkMuted, font: 'body',
    });
    if (this.isNewBest) {
      makeLabel(this, summaryX, summaryY + 130, 'NY PERSONLIG BESTE', {
        size: 11, color: COLORS.success, font: 'body', bold: true,
      }).setLetterSpacing(1.5);
    }

    const buttonsTop = landscape ? h * 0.43 : h * 0.68;
    makeButton(this, {
      x: buttonsX, y: buttonsTop, width: 268, height: 58, label: 'Én runde til  →', accent,
      enabled: this.scene.get(SCENE.board) !== null,
      onClick: () => this.scene.start(SCENE.board, { mode: 'blitz' }),
    });
    makeButton(this, {
      x: buttonsX, y: buttonsTop + 68, width: BUTTON_W, height: 40, label: 'Til menyen', labelSize: 13, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.menu),
    });
  }

  private buildScoreSeal(x: number, y: number, accent: number, animate: boolean, reducedMotion: boolean): void {
    const root = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(COLORS.shadow, 0.78);
    g.fillCircle(0, 6, 88);
    g.fillStyle(COLORS.panel, 0.95);
    g.fillCircle(0, 0, 84);
    g.lineStyle(1, accent, 0.24);
    g.strokeCircle(0, 0, 72);
    g.lineStyle(2.5, accent, 0.82);
    g.strokeCircle(0, 0, 84);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const inner = 90;
      const outer = i % 4 === 0 ? 100 : 95;
      g.lineStyle(i % 4 === 0 ? 2 : 1, accent, i % 4 === 0 ? 0.72 : 0.3);
      g.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    const number = makeLabel(this, 0, -5, String(this.solved), { size: 64, color: COLORS.ink, bold: true });
    const caption = makeLabel(this, 0, 47, 'SPEIL ÅPNET', {
      size: 9, color: accent, font: 'body', bold: true,
    }).setLetterSpacing(1.8);
    root.add([g, number, caption]);
    if (animate && !reducedMotion) {
      root.setScale(0.72).setAlpha(0);
      this.tweens.add({ targets: root, scale: 1, alpha: 1, duration: durations(false).calm, ease: EASING.pop });
    }
    if (animate && this.isNewBest) new Effects(this, reducedMotion).confetti(x, y, 48);
    this.celebrated = true;
  }
}
