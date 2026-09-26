import Phaser from 'phaser';
import { journeyTrial } from '../content/journeyTrials';
import { audio } from '../audio/sound';
import { LEVELS_PER_WORLD, parseLevelId, solvedInWorld } from '../core/progression';
import { campaignProgress } from '../core/storage';
import { masteryOffer, practiceDestination } from '../game/mastery';
import { makeTile } from '../core/tiles';
import { journeyComplete, journeyDestination, nextJourneyMilestone } from '../game/journey';
import { COLORS, cssColor, worldAccent } from '../theme/theme';
import { makeBackdrop } from './art';
import { services } from './services';
import { TileView } from './TileView';
import { makeButton, makeLabel, SCENE } from './ui';
import { screenHeight, screenWidth } from './viewport';

export class MenuScene extends Phaser.Scene {
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() { super(SCENE.menu); }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
    if (services(this).settings().music && audio.isMusicPlaying() && audio.currentTrack() !== 'menu') audio.startMusic('menu');
    this.input.once('pointerdown', () => audio.startMusic('menu'));
  }

  private build(): void {
    const w = screenWidth(this);
    const h = screenHeight(this);
    const landscape = h < 560 && w > h * 1.25;
    makeBackdrop(this, 'hero', landscape ? 1000 : undefined);
    const store = services(this).store;
    const stars = store.stars();
    const access = campaignProgress(store.data).access;
    const destination = journeyDestination(stars, access);
    const milestone = nextJourneyMilestone(stars, access);
    const world = journeyTrial(destination)?.world ?? parseLevelId(destination)?.world ?? 1;
    const solved = solvedInWorld(world, stars);
    const accent = worldAccent(world);
    const start = Object.values(stars).every((value) => value <= 0);
    const complete = journeyComplete(stars, access);
    const actionLabel = start ? 'Start reisen  →' : !complete ? 'Fortsett reisen  →' : (stars[destination] ?? 0) > 0 ? 'Spill igjen  →' : 'Spill bonusbrett  →';
    const go = (): void => { this.scene.start(SCENE.board, { mode: 'campaign', levelId: destination }); };

    if (landscape) {
      const left = w * 0.27;
      const right = w * 0.72;
      const width = Math.min(320, w * 0.42);
      makeLabel(this, left, h * 0.23, 'PALINTRIS', { size: 34, color: COLORS.ink, bold: true }).setLetterSpacing(2);
      makeLabel(this, left, h * 0.35, 'Finn balansen. Åpne speilverdenen.', { size: 12, color: COLORS.inkMuted, font: 'body' });
      this.preview(left, h * 0.62, 40);
      this.milestoneCard(right, h * 0.28, width, milestone.title, milestone.detail, world, solved, accent, true);
      makeButton(this, { x: right, y: h * 0.56, width, height: 50, label: actionLabel, labelSize: 19, accent, onClick: go });
      makeButton(this, { x: right, y: h * 0.73, width, height: 44, label: 'Utfordringer', labelSize: 16, accent: COLORS.glow, onClick: () => this.scene.start(SCENE.challenges) });
      this.tools(right, h * 0.9, width);
      this.adaptiveChoice(left, h * 0.86, width, world);
      return;
    }

    const cx = w / 2;
    const width = Math.min(w - 40, 344);
    const mainY = h * 0.68;
    makeLabel(this, cx, h * 0.075, 'ET LITE EVENTYR I SYMMETRI', { size: 10, color: COLORS.star, font: 'body' }).setLetterSpacing(2.2);
    makeLabel(this, cx, h * 0.145, 'PALINTRIS', { size: Math.min(42, w * 0.105), color: COLORS.ink, bold: true })
      .setLetterSpacing(3).setShadow(0, 3, cssColor(COLORS.shadow), 8, true, true);
    makeLabel(this, cx, h * 0.205, 'Finn balansen. Åpne speilverdenen.', { size: 13, color: COLORS.inkMuted, font: 'body' });
    this.preview(cx, mainY - (h < 700 ? 255 : 265), h < 700 ? 38 : 48);
    this.milestoneCard(cx, mainY - 108, width, milestone.title, milestone.detail, world, solved, accent, false);
    makeButton(this, { x: cx, y: mainY, width, height: 58, label: actionLabel, labelSize: 21, accent, onClick: go });
    makeButton(this, { x: cx, y: mainY + 71, width, height: 48, label: 'Utfordringer', labelSize: 17, accent: COLORS.glow,
      onClick: () => this.scene.start(SCENE.challenges) });
    this.tools(cx, mainY + 137, width);
    this.adaptiveChoice(cx, mainY - 197, width, world);
  }

  private adaptiveChoice(x: number, y: number, width: number, world: number): void {
    const data = services(this).store.data;
    const offer = masteryOffer(data, world);
    const practice = offer === null ? practiceDestination(data, world) : null;
    const id = offer ?? practice;
    if (id === null) return;
    makeButton(this, { x, y, width, height: 44, label: offer !== null ? 'Prøv mestringsprøven' : 'Øv på et kjent speil',
      labelSize: 14, accent: COLORS.line, onClick: () => this.scene.start(SCENE.board, { mode: 'campaign', levelId: id }) });
  }

  private preview(cx: number, y: number, size: number): void {
    ['A', 'E', 'C', 'E', 'A'].forEach((symbol, i) => {
      const tile = new TileView(this, makeTile(i, symbol));
      tile.setTile(makeTile(i, symbol), size, services(this).settings().colorBlind);
      tile.setPosition(cx + (i - 2) * (size + 5), y + Math.abs(i - 2) * 5);
      tile.setAngle((i - 2) * 5);
    });
  }

  private milestoneCard(cx: number, y: number, width: number, title: string, detail: string, world: number, solved: number, accent: number, landscape: boolean): void {
    const height = landscape ? 104 : 112;
    const card = this.add.graphics();
    card.fillStyle(COLORS.panel, 0.94);
    card.fillRoundedRect(cx - width / 2, y - height / 2, width, height, 14);
    card.lineStyle(1, accent, 0.55);
    card.strokeRoundedRect(cx - width / 2, y - height / 2, width, height, 14);
    makeLabel(this, cx, y - 36, `VERDEN ${world}  ·  ${solved}/${LEVELS_PER_WORLD} SPEIL`, { size: 10, color: accent, font: 'body', bold: true }).setLetterSpacing(1);
    makeLabel(this, cx, y - 11, title, { size: landscape ? 17 : 19, color: COLORS.ink, bold: true });
    makeLabel(this, cx, y + 25, detail, { size: landscape ? 11 : 12, color: COLORS.inkMuted, font: 'body' })
      .setWordWrapWidth(width - 28, true).setLineSpacing(2);
  }

  private tools(cx: number, y: number, width: number): void {
    const half = (width - 12) / 2;
    makeButton(this, { x: cx - (half + 12) / 2, y, width: half, height: 44, label: 'Kart', labelSize: 14, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.worldMap) });
    makeButton(this, { x: cx + (half + 12) / 2, y, width: half, height: 44, label: 'Innstillinger', labelSize: 14, accent: COLORS.line,
      onClick: () => this.scene.start(SCENE.settings) });
  }
}
