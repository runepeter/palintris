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
