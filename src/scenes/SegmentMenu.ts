import { screenWidth, screenHeight } from './viewport';
import Phaser from 'phaser';
import type { SegmentAction } from '../game/gestures';
import type { SegmentOption } from '../game/operations';
import { COLORS, RADIUS } from '../theme/theme';
import { makeLabel } from './ui';

const BUTTON_W = 78;
const BUTTON_H = 50;
const PITCH = 84;
const EDGE = 8;
const DIMMED = 0.65;
const EMPTY_W = 170;

const BUTTONS: ReadonlyArray<{ readonly action: SegmentAction; readonly glyph: string; readonly label: string }> = [
  { action: 'rotateLeft', glyph: '⟲', label: 'Venstre' },
  { action: 'mirror', glyph: '⇋', label: 'Speil' },
  { action: 'rotateRight', glyph: '⟳', label: 'Høyre' },
];

interface MenuButton {
  readonly action: SegmentAction;
  dx: number;
  readonly node: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
}

/**
 * Tydelige valg over et segment. Menyen tar ikke egen pekerinput: scenen løser
 * treff via hitAction() og lar GestureMachine avgjøre, så et valg ikke kan bli
 * anvendt to ganger.
 */
export class SegmentMenu extends Phaser.GameObjects.Container {
  private readonly buttons: readonly MenuButton[];
  private readonly empty: Phaser.GameObjects.Container;
  private enabled = new Set<SegmentAction>();

  /** topEdge er nederste kant av HUD-en: menyen skal aldri legge seg oppå den. */
  constructor(
    scene: Phaser.Scene,
    accent: number,
    private readonly topEdge: number
  ) {
    super(scene, 0, 0);
    this.buttons = BUTTONS.map((b) => {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.ink, 0.16);
      g.fillRoundedRect(-BUTTON_W / 2, -BUTTON_H / 2 + 3, BUTTON_W, BUTTON_H, RADIUS.button);
      g.fillStyle(accent, 1);
      g.fillRoundedRect(-BUTTON_W / 2, -BUTTON_H / 2, BUTTON_W, BUTTON_H, RADIUS.button);
      const glyph = makeLabel(scene, 0, -9, b.glyph, { size: 19, color: COLORS.panel, bold: true });
      const label = makeLabel(scene, 0, 13, b.label, { size: 10, color: COLORS.panel, font: 'body', bold: true });
      return { action: b.action, dx: 0, node: scene.add.container(0, 0, [g, glyph, label]), label };
    });
    const emptyGfx = scene.add.graphics();
    emptyGfx.fillStyle(COLORS.ink, 0.16);
    emptyGfx.fillRoundedRect(-EMPTY_W / 2, -BUTTON_H / 2 + 3, EMPTY_W, BUTTON_H, RADIUS.button);
    emptyGfx.fillStyle(COLORS.panel, 1);
    emptyGfx.fillRoundedRect(-EMPTY_W / 2, -BUTTON_H / 2, EMPTY_W, BUTTON_H, RADIUS.button);
    emptyGfx.lineStyle(2, accent, 0.7);
    emptyGfx.strokeRoundedRect(-EMPTY_W / 2, -BUTTON_H / 2, EMPTY_W, BUTTON_H, RADIUS.button);
    const emptyLabel = makeLabel(scene, 0, 0, 'Bytt to nabobrikker', { size: 13, color: COLORS.ink, font: 'body', bold: true });
    this.empty = scene.add.container(0, 0, [emptyGfx, emptyLabel]).setVisible(false);
    this.add([...this.buttons.map((b) => b.node), this.empty]);
    this.setDepth(20);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Viser bare operasjoner brettet støtter, og klemmer menyen innenfor skjermen. */
  show(x: number, y: number, options: readonly SegmentOption[]): void {
    const active = new Map(options.map((option) => [option.action, option.enabled]));
    const visible = this.buttons.filter((button) => active.has(button.action));
    this.enabled = new Set(options.filter((option) => option.enabled).map((option) => option.action));
    visible.forEach((button, i) => {
      button.dx = (i - (visible.length - 1) / 2) * PITCH;
      button.node.setPosition(button.dx, 0).setVisible(true);
      const enabled = active.get(button.action) === true;
      button.node.setAlpha(enabled ? 1 : DIMMED);
      button.label.setText(button.action === 'mirror' && !enabled ? 'Speil 3+' : BUTTONS.find((b) => b.action === button.action)?.label ?? '');
    });
    for (const button of this.buttons) {
      if (!active.has(button.action)) button.node.setVisible(false);
    }
    this.empty.setVisible(visible.length === 0);
    const halfW = visible.length === 0 ? EMPTY_W / 2 : ((visible.length - 1) * PITCH + BUTTON_W) / 2;
    const minY = this.topEdge + BUTTON_H / 2;
    const maxX = Math.max(halfW + EDGE, screenWidth(this.scene) - halfW - EDGE);
    const maxY = Math.max(minY, screenHeight(this.scene) - BUTTON_H / 2 - EDGE);
    this.setPosition(Phaser.Math.Clamp(x, halfW + EDGE, maxX), Phaser.Math.Clamp(y, minY, maxY));
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  hitAction(x: number, y: number): SegmentAction | null {
    if (!this.visible) return null;
    for (const b of this.buttons) {
      if (!b.node.visible || !this.enabled.has(b.action)) continue;
      if (Math.abs(x - (this.x + b.dx)) <= BUTTON_W / 2 && Math.abs(y - this.y) <= BUTTON_H / 2) return b.action;
    }
    return null;
  }

  positions(): { action: SegmentAction; x: number; y: number }[] {
    return this.buttons
      .filter((b) => b.node.visible && this.enabled.has(b.action))
      .map((b) => ({ action: b.action, x: this.x + b.dx, y: this.y }));
  }
}
