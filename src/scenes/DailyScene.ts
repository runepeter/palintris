import { screenWidth, screenHeight } from './viewport';
import { makeBackdrop } from './art';
import Phaser from 'phaser';
import type { DailyAttempt } from '../core/storage';
import { bestAttempt, dailyShareText, displayStreak, formatDailyDate, mmss, parseDailyPuzzleId, sharedAttempt } from '../game/daily';
import { COLORS, SPACE } from '../theme/theme';
import { services } from './services';
import { copyText, makeButton, makeLabel, SCENE } from './ui';

const BUTTON_W = 220;
const BUTTON_H = 52;

export class DailyScene extends Phaser.Scene {
  /** Usann til brettet er regnet ut; genereringen tar et par sekunder på telefon. */
  private ready = false;
  private missing = false;
  private copied: 'idle' | 'ok' | 'fail' = 'idle';

  /** Fast referanse, så SHUTDOWN kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => this.rebuild();

  constructor() {
    super(SCENE.daily);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(): void {
    this.ready = false;
    this.missing = false;
    this.copied = 'idle';
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
    // Genereringen blokkerer tråden, så etiketten må rekke å bli malt først.
    this.time.delayedCall(0, () => this.prepare());
  }

  private prepare(): void {
    const daily = services(this).modes.daily;
    this.missing = daily.load(daily.todayId()) === null;
    this.ready = true;
    this.rebuild();
  }

  private rebuild(): void {
    this.children.removeAll(true);
    this.build();
  }

  private build(): void {
    makeBackdrop(this);
    const s = services(this);
    const cx = screenWidth(this) / 2;
    const h = screenHeight(this);
    const id = s.modes.daily.todayId();
    const attempts = s.store.data.daily.attempts;
    const best = bestAttempt(attempts, id);
    const share = sharedAttempt(attempts, id);
    const dateKey = parseDailyPuzzleId(id)?.dateKey ?? '';
    const streak = displayStreak(s.store.data, dateKey);

    // Liggende telefon har under 400 px: tettere topp og knapper som aldri går ut av skjermen.
    const compact = h < 560;
    const top = compact ? h * 0.12 : h * 0.18;
    const step = compact ? 0.78 : 1;
    makeLabel(this, cx, top, 'Daglig', { size: compact ? 34 : 44, color: COLORS.ink, bold: true });
    makeLabel(this, cx, top + 44 * step, formatDailyDate(dateKey), { size: 18, color: COLORS.inkMuted, font: 'body' });
    makeLabel(this, cx, top + 74 * step, `Rekke: ${streak} ${streak === 1 ? 'dag' : 'dager'}`, { size: 16, color: COLORS.inkMuted, font: 'body' });
    makeLabel(this, cx, top + 110 * step, this.status(best), { size: 18, font: 'body' });

    const pitch = BUTTON_H + SPACE.md;
    const buttonsTop = Math.min(h * 0.58, h - pitch * 2 - BUTTON_H / 2 - 20);
    makeButton(this, {
      x: cx, y: buttonsTop, width: BUTTON_W, height: BUTTON_H,
      label: best === undefined ? 'Spill' : 'Nytt forsøk',
      accent: COLORS.inkMuted,
      enabled: this.ready && !this.missing && this.scene.get(SCENE.board) !== null,
      onClick: () => this.scene.start(SCENE.board, { mode: 'daily' }),
    });
    const text = share === undefined ? null : dailyShareText(share);
    makeButton(this, {
      x: cx, y: buttonsTop + pitch, width: BUTTON_W, height: BUTTON_H,
      label: this.copied === 'ok' ? 'Kopiert' : 'Del',
      accent: COLORS.inkMuted,
      enabled: text !== null,
      onClick: () => {
        if (text !== null) this.copy(text);
      },
    });
    if (this.copied === 'fail') {
      makeLabel(this, cx, buttonsTop + pitch + BUTTON_H, 'Kunne ikke kopiere', { size: 14, color: COLORS.danger, font: 'body' });
    }
    makeButton(this, {
      x: cx, y: buttonsTop + pitch * 2, width: BUTTON_W, height: BUTTON_H,
      label: 'Meny', accent: COLORS.inkMuted, onClick: () => this.scene.start(SCENE.menu),
    });
  }

  private status(best: DailyAttempt | undefined): string {
    if (!this.ready) return 'Lager dagens brett…';
    if (this.missing) return 'Fant ikke dagens brett';
    if (best === undefined) return 'Ikke spilt i dag';
    return `Beste: ${best.moves} trekk · ${mmss(best.timeMs)}`;
  }

  private copy(text: string): void {
    void copyText(text).then((ok) => {
      this.copied = ok ? 'ok' : 'fail';
      this.rebuild();
    });
  }
}
