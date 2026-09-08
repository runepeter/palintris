import Phaser from 'phaser';
import type { IntroSpec } from '../game/intro';
import { COLORS, DURATION, EASING, RADIUS, SPACE } from '../theme/theme';
import { makeButton, makeLabel } from './ui';

/** Høyden panelet opptar. BoardScene krymper brettflaten med den mens introen står. */
export const INTRO_HEIGHT = 152;

const BUTTON_W = 128;
const BUTTON_H = 40;
const GLYPH_SWING = 26;
const TITLE_SIZE = 19;
const TEXT_SIZE = 14;
const GLYPH_SIZE = 26;
const PULSE = 1.25;

/** Glyfen og aksen den beveger seg langs. tap står i ro og pulserer i stedet. */
const GESTURE: Readonly<Record<IntroSpec['gesture'], { readonly glyph: string; readonly axis: 'x' | 'y' | 'none' }>> = {
  drag: { glyph: '☞', axis: 'x' },
  hold: { glyph: '☞', axis: 'x' },
  tap: { glyph: '☞', axis: 'none' },
  dragHand: { glyph: '☟', axis: 'y' },
};

/**
 * Forklaringspanelet for én mekanikk. Ligger mellom brettet og hånden, og er ikke
 * interaktivt utenom «Skjønner»-knappen: brikkene under skal fortsatt kunne gripes.
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

  constructor(scene: Phaser.Scene, spec: IntroSpec, reduced: boolean, private readonly onDismiss: () => void) {
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
   * relayout, og bygger knappen på nytt fordi den er tegnet mot den gamle bredden.
   */
  layout(width: number, bottom: number): void {
    this.panelWidth = width;
    const h = INTRO_HEIGHT;
    this.setPosition(this.host.scale.width / 2, bottom - h / 2);
    this.panel.clear();
    this.panel.fillStyle(COLORS.panel, 1);
    this.panel.fillRoundedRect(-width / 2, -h / 2, width, h, RADIUS.panel);
    this.panel.lineStyle(3, COLORS.ink, 0.15);
    this.panel.strokeRoundedRect(-width / 2, -h / 2, width, h, RADIUS.panel);
    this.title.setPosition(0, -h / 2 + SPACE.xl);
    this.blurb.setWordWrapWidth(width - SPACE.xl * 2);
    this.blurb.setPosition(0, -h / 2 + SPACE.xl + SPACE.xl);
    this.glyphHolder.setPosition(0, SPACE.md);
    this.button?.destroy();
    this.button = makeButton(this.host, {
      x: 0,
      y: h / 2 - SPACE.xl - SPACE.xs,
      width: BUTTON_W,
      height: BUTTON_H,
      label: 'Skjønner',
      accent: COLORS.ink,
      onClick: this.onDismiss,
    });
    this.add(this.button);
  }

  /** Sant når skjermpunktet ligger på panelet. Scenen slipper da å tolke trykket som et grep. */
  hitPanel(x: number, y: number): boolean {
    if (this.panelWidth === 0) return false;
    return Math.abs(x - this.x) <= this.panelWidth / 2 && Math.abs(y - this.y) <= INTRO_HEIGHT / 2;
  }

  override destroy(fromScene?: boolean): void {
    // Løkken på glyfen overlever ikke objektet den flytter; Phaser rydder den ikke selv.
    this.host.tweens.killTweensOf(this.glyph);
    super.destroy(fromScene);
  }
}
