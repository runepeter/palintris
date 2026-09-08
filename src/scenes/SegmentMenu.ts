import Phaser from 'phaser';
import type { SegmentAction } from '../game/gestures';
import { COLORS } from '../theme/theme';
import { makeLabel } from './ui';

const R = 22;
const PITCH = 56;
const HIT_R = 26;
const EDGE = 8;
const DIMMED = 0.4;

const BUTTONS: ReadonlyArray<{ readonly action: SegmentAction; readonly glyph: string }> = [
  { action: 'rotateLeft', glyph: '⟲' },
  { action: 'mirror', glyph: '⇋' },
  { action: 'rotateRight', glyph: '⟳' },
];

interface MenuButton {
  readonly action: SegmentAction;
  readonly dx: number;
  readonly node: Phaser.GameObjects.Container;
}

/**
 * Tre runde valg over et segment. Menyen tar ikke egen pekerinput: scenen løser
 * treff via hitAction() og lar GestureMachine avgjøre, så et valg ikke kan bli
 * anvendt to ganger.
 */
export class SegmentMenu extends Phaser.GameObjects.Container {
  private readonly buttons: readonly MenuButton[];

  /** topEdge er nederste kant av HUD-en: menyen skal aldri legge seg oppå den. */
  constructor(
    scene: Phaser.Scene,
    accent: number,
    private readonly topEdge: number
  ) {
    super(scene, 0, 0);
    this.buttons = BUTTONS.map((b, i) => {
      const dx = (i - 1) * PITCH;
      const g = scene.add.graphics();
      g.fillStyle(COLORS.ink, 0.18);
      g.fillCircle(0, 3, R);
      g.fillStyle(accent, 1);
      g.fillCircle(0, 0, R);
      const label = makeLabel(scene, 0, 0, b.glyph, { size: 22, color: COLORS.panel, bold: true });
      return { action: b.action, dx, node: scene.add.container(dx, 0, [g, label]) };
    });
    this.add(this.buttons.map((b) => b.node));
    this.setDepth(20);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Klemmes innenfor skjermen, så ytterste knapp aldri havner utenfor kanten. */
  show(x: number, y: number, mirrorEnabled: boolean): void {
    const halfW = PITCH + R;
    const minY = this.topEdge + R;
    const maxX = Math.max(halfW + EDGE, this.scene.scale.width - halfW - EDGE);
    const maxY = Math.max(minY, this.scene.scale.height - R - EDGE);
    this.setPosition(Phaser.Math.Clamp(x, halfW + EDGE, maxX), Phaser.Math.Clamp(y, minY, maxY));
    for (const b of this.buttons) b.node.setAlpha(b.action === 'mirror' && !mirrorEnabled ? DIMMED : 1);
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  hitAction(x: number, y: number): SegmentAction | null {
    if (!this.visible) return null;
    for (const b of this.buttons) {
      if (Math.hypot(x - (this.x + b.dx), y - this.y) <= HIT_R) return b.action;
    }
    return null;
  }

  positions(): { action: SegmentAction; x: number; y: number }[] {
    return this.buttons.map((b) => ({ action: b.action, x: this.x + b.dx, y: this.y }));
  }
}
