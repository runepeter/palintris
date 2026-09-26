import type { BoardLayout } from './layout';
import type { MoveCommand } from '../core/commands';
import { DURATION } from '../theme/theme';

export interface MoveAnimationOptions {
  readonly clear: boolean;
  readonly reduced: boolean;
  readonly timed: boolean;
}

export interface MoveAnimation {
  readonly detailed: boolean;
  readonly moveMs: number;
  readonly moveDelayMs: number;
  readonly enterMs: number;
  readonly enterDelayMs: number;
  readonly exitMs: number;
  readonly totalMs: number;
}

const fastAnimation = (reduced: boolean): MoveAnimation => {
  const moveMs = reduced ? DURATION.snap : DURATION.normal;
  return {
    detailed: false,
    moveMs,
    moveDelayMs: 0,
    enterMs: moveMs,
    enterDelayMs: 0,
    exitMs: DURATION.snap,
    totalMs: moveMs,
  };
};

const detailed = (values: Omit<MoveAnimation, 'detailed' | 'totalMs'>): MoveAnimation => ({
  detailed: true,
  ...values,
  totalMs: Math.max(values.moveDelayMs + values.moveMs, values.enterDelayMs + values.enterMs, values.exitMs),
});

export const moveAnimationFor = (type: MoveCommand['type'], options: MoveAnimationOptions): MoveAnimation => {
  if (!options.clear || options.reduced || options.timed) return fastAnimation(options.reduced);
  switch (type) {
    case 'swap':
      return detailed({ moveMs: 520, moveDelayMs: 0, enterMs: 220, enterDelayMs: 0, exitMs: 120 });
    case 'rotate':
      return detailed({ moveMs: 760, moveDelayMs: 0, enterMs: 220, enterDelayMs: 0, exitMs: 120 });
    case 'mirror':
      return detailed({ moveMs: 820, moveDelayMs: 0, enterMs: 220, enterDelayMs: 0, exitMs: 120 });
    case 'insertWild':
      return detailed({ moveMs: 620, moveDelayMs: 0, enterMs: 480, enterDelayMs: 220, exitMs: 120 });
    case 'remove':
      return detailed({ moveMs: 620, moveDelayMs: 200, enterMs: 220, enterDelayMs: 0, exitMs: 360 });
  }
};

type Point = { readonly x: number; readonly y: number };
export interface RotationPath {
  readonly start: Point;
  readonly control: Point;
  readonly end: Point;
}

interface RotationControlsLayout {
  readonly mode: 'bottom' | 'sides' | 'toolbar';
  readonly width: number;
  readonly height: number;
  readonly boardTop: number;
  readonly left: Point;
  readonly right: Point;
}

export const rotationControlsLayout = (width: number, height: number): RotationControlsLayout => {
  const side = (width - Math.min(width, 480)) / 2;
  const mode = height >= 540 ? 'bottom' : side >= 168 ? 'sides' : 'toolbar';
  const y = mode === 'bottom' ? height - 154 : mode === 'sides' ? (96 + height - 120) / 2 : 122;
  return {
    mode, width: 152, height: 44, boardTop: mode === 'toolbar' ? 152 : 96,
    left: { x: mode === 'sides' ? side / 2 : width / 2 - 82, y },
    right: { x: mode === 'sides' ? width - side / 2 : width / 2 + 82, y },
  };
};

export const wholeRotationPath = (layout: BoardLayout, origin: Point, dir: 'left' | 'right', bounds: { left: number; right: number; top: number; bottom: number }): RotationPath => {
  const point = (index: number): Point => {
    const slot = layout.slots[index];
    if (slot === undefined) throw new RangeError('Rotasjon trenger to endepunkter');
    return { x: origin.x + slot.x * layout.scale, y: origin.y + slot.y * layout.scale };
  };
  const start = point(dir === 'left' ? 0 : layout.count - 1);
  const end = point(dir === 'left' ? layout.count - 1 : 0);
  const half = layout.tile * layout.scale / 2;
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  if (layout.kind === 'row') {
    const lift = Math.min(70, Math.max(0, middle.y - bounds.top - half));
    return { start, end, control: { x: middle.x, y: middle.y - 2 * lift } };
  }
  const outside = start.x - bounds.left - half;
  const bend = outside >= 60 ? -60 : Math.min(60, bounds.right - half - start.x);
  return { start, end, control: { x: middle.x + 2 * bend, y: middle.y } };
};

export const rotationPoint = (path: RotationPath, t: number): Point => ({
  x: (1 - t) ** 2 * path.start.x + 2 * (1 - t) * t * path.control.x + t ** 2 * path.end.x,
  y: (1 - t) ** 2 * path.start.y + 2 * (1 - t) * t * path.control.y + t ** 2 * path.end.y,
});
