import { screenWidth, screenHeight } from './viewport';
import Phaser from 'phaser';
import type { IntroSpec } from '../game/intro';
import { COLORS, DURATION, EASING, RADIUS, SPACE } from '../theme/theme';
import { makeButton, makeLabel } from './ui';

/** Panelhøyden når det er høyde til tittel, tekst, glyf og knapp under hverandre. */
export const INTRO_HEIGHT = 152;
/** Panelhøyden i liggende format: én linje tekst med knappen ved siden av. */
export const INTRO_COMPACT_HEIGHT = 56;
/** Under denne skjermhøyden er det ikke plass til det høye panelet uten å dekke brettet. */
export const INTRO_COMPACT_BELOW = 560;

export const introHeight = (viewportHeight: number): number =>
  viewportHeight < INTRO_COMPACT_BELOW ? INTRO_COMPACT_HEIGHT : INTRO_HEIGHT;

const BUTTON_W = 128;
const BUTTON_H = 40;
const COMPACT_BUTTON_W = 96;
const COMPACT_BUTTON_H = 32;
const GLYPH_SWING = 26;
const TITLE_SIZE = 19;
const TEXT_SIZE = 14;
const GLYPH_SIZE = 26;
const PULSE = 1.25;
/** Antall tegn hvert forkortingssteg spiser. Se elide(). */
const ELIDE_STEP = 2;

/** Glyfen og aksen den beveger seg langs. tap står i ro og pulserer i stedet. */
const GESTURE: Readonly<Record<IntroSpec['gesture'], { readonly glyph: string; readonly axis: 'x' | 'y' | 'none' }>> = {
  drag: { glyph: '☞', axis: 'x' },
  hold: { glyph: '☞', axis: 'x' },
  tap: { glyph: '☞', axis: 'none' },
  dragHand: { glyph: '☟', axis: 'y' },
};

/** Korter teksten med ellipse til den er innenfor max. Phaser måler først etter setText. */
const elide = (text: Phaser.GameObjects.Text, full: string, max: number): void => {
  text.setText(full);
  let cut = full;
  while (text.width > max && cut.length > ELIDE_STEP) {
    cut = cut.slice(0, -ELIDE_STEP);
    text.setText(`${cut}…`);
  }
};

/**
 * Forklaringspanelet for én mekanikk. Ligger mellom brettet og hånden, aldri over noen av dem,
 * og er ikke interaktivt utenom «Skjønner»-knappen.
 */
export class IntroOverlay extends Phaser.GameObjects.Container {
  /** Egen referanse: Phaser nuller this.scene i destroy(), og tweenen må ryddes der. */
  private readonly host: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly blurb: Phaser.GameObjects.Text;
  /** Glyfen tweenes om sitt eget nullpunkt, så layout kan flytte holderen fritt. */
  private readonly glyphHolder: Phaser.GameObjects.Container;
  private readonly glyph: Phaser.GameObjects.Text;
  private button: Phaser.GameObjects.Container | null = null;
  private panelWidth = 0;
  private panelHeight = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly spec: IntroSpec,
    reduced: boolean,
    private readonly onDismiss: () => void
  ) {
    super(scene, 0, 0);
    this.host = scene;
    this.panel = scene.add.graphics();
    this.title = makeLabel(scene, 0, 0, spec.title, { size: TITLE_SIZE, bold: true });
    this.blurb = makeLabel(scene, 0, 0, spec.text, { size: TEXT_SIZE, color: COLORS.inkMuted, font: 'body' });
    this.glyph = makeLabel(scene, 0, 0, GESTURE[spec.gesture].glyph, { size: GLYPH_SIZE });
    this.glyphHolder = scene.add.container(0, 0, [this.glyph]);
    this.add([this.panel, this.title, this.blurb, this.glyphHolder]);
    this.setDepth(22);
    scene.add.existing(this);
    if (!reduced) this.animateGlyph(GESTURE[spec.gesture].axis);
  }

  /** Frem og tilbake langs gestens akse. Redusert bevegelse får en glyf som står stille. */
  private animateGlyph(axis: 'x' | 'y' | 'none'): void {
    const tween = (vars: Record<string, number>): void => {
      this.host.tweens.add({ targets: this.glyph, ...vars, duration: DURATION.calm, yoyo: true, repeat: -1, ease: EASING.fade });
    };
    if (axis === 'none') {
      tween({ scale: PULSE });
      return;
    }
    const swing = axis === 'x' ? GLYPH_SWING : GLYPH_SWING / 2;
    this.glyph.setPosition(axis === 'x' ? -swing : 0, axis === 'y' ? -swing : 0);
    tween(axis === 'x' ? { x: swing } : { y: swing });
  }

  /**
   * Plasserer panelet med gitt bredde slik at underkanten treffer bottom. Kalles ved hver
   * relayout, og bygger innholdet på nytt fordi både bredden og varianten kan ha endret seg.
   */
  layout(width: number, bottom: number): void {
    const h = introHeight(screenHeight(this.host));
    this.panelWidth = width;
    this.panelHeight = h;
    this.setPosition(screenWidth(this.host) / 2, bottom - h / 2);
    this.panel.clear();
    this.panel.fillStyle(COLORS.panel, 1);
    this.panel.fillRoundedRect(-width / 2, -h / 2, width, h, RADIUS.panel);
    this.panel.lineStyle(3, COLORS.ink, 0.15);
    this.panel.strokeRoundedRect(-width / 2, -h / 2, width, h, RADIUS.panel);
    this.button?.destroy();
    this.button = h === INTRO_COMPACT_HEIGHT ? this.layoutCompact(width) : this.layoutFull(width, h);
    this.add(this.button);
  }

  private layoutFull(width: number, h: number): Phaser.GameObjects.Container {
    this.title.setVisible(true).setOrigin(0.5, 0.5).setPosition(0, -h / 2 + SPACE.xl);
    this.glyphHolder.setVisible(true).setPosition(0, SPACE.md);
    this.blurb.setOrigin(0.5, 0.5);
    this.blurb.setText(this.spec.text);
    this.blurb.setWordWrapWidth(width - SPACE.xl * 2);
    this.blurb.setPosition(0, -h / 2 + SPACE.xl + SPACE.xl);
    return makeButton(this.host, {
      x: 0,
      y: h / 2 - SPACE.xl - SPACE.xs,
      width: BUTTON_W,
      height: BUTTON_H,
      label: 'Skjønner',
      accent: COLORS.ink,
      onClick: this.onDismiss,
    });
  }

  /**
   * Liggende format: handlingsteksten på én linje til venstre, knappen til høyre. Tittelen
   * utelates — den sier ingenting teksten ikke sier, og linja er for kort til begge.
   */
  private layoutCompact(width: number): Phaser.GameObjects.Container {
    this.title.setVisible(false);
    this.glyphHolder.setVisible(false);
    this.blurb.setOrigin(0, 0.5);
    // Ombrytingen fra det høye panelet må vekk: én linje er hele plassen, så teksten forkortes.
    this.blurb.setWordWrapWidth(null);
    this.blurb.setPosition(-width / 2 + SPACE.lg, 0);
    elide(this.blurb, this.spec.compactText ?? this.spec.text, width - SPACE.lg * 2 - COMPACT_BUTTON_W - SPACE.md);
    return makeButton(this.host, {
      x: width / 2 - SPACE.lg - COMPACT_BUTTON_W / 2,
      y: 0,
      width: COMPACT_BUTTON_W,
      height: COMPACT_BUTTON_H,
      label: 'Skjønner',
      accent: COLORS.ink,
      onClick: this.onDismiss,
    });
  }

  /** Sant når skjermpunktet ligger på panelet. Scenen slipper da å tolke trykket som et grep. */
  hitPanel(x: number, y: number): boolean {
    if (this.panelWidth === 0) return false;
    return Math.abs(x - this.x) <= this.panelWidth / 2 && Math.abs(y - this.y) <= this.panelHeight / 2;
  }

  override destroy(fromScene?: boolean): void {
    // Løkken på glyfen overlever ikke objektet den flytter; Phaser rydder den ikke selv.
    this.host.tweens.killTweensOf(this.glyph);
    super.destroy(fromScene);
  }
}
