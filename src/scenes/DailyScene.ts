import Phaser from 'phaser';
import type { DailyAttempt } from '../core/storage';
import { bestAttempt, dailyShareText, mmss, parseDailyPuzzleId, sharedAttempt } from '../game/daily';
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
    const s = services(this);
    const cx = this.scale.width / 2;
    const h = this.scale.height;
    const id = s.modes.daily.todayId();
    const attempts = s.store.data.daily.attempts;
    const best = bestAttempt(attempts, id);
    const share = sharedAttempt(attempts, id);
    const streak = s.store.data.daily.streak;

    const top = h * 0.18;
    makeLabel(this, cx, top, 'Daglig', { size: 44, color: COLORS.inkMuted, bold: true });
    makeLabel(this, cx, top + 44, parseDailyPuzzleId(id)?.dateKey ?? '', { size: 18, color: COLORS.inkMuted, font: 'body' });
    makeLabel(this, cx, top + 74, `Rekke: ${streak} ${streak === 1 ? 'dag' : 'dager'}`, { size: 16, color: COLORS.inkMuted, font: 'body' });
    makeLabel(this, cx, top + 110, this.status(best), { size: 18, font: 'body' });

    const buttonsTop = h * 0.58;
    const pitch = BUTTON_H + SPACE.md;
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
