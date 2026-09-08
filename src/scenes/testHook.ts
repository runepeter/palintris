import type { GestureState, SegmentAction } from '../game/gestures';
import type { SessionView } from '../game/session';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface TestHook {
  readonly levelId: string;
  view(): SessionView;
  screenLayout(): {
    readonly slots: ReadonlyArray<ScreenPoint & { index: number }>;
    readonly gaps: ReadonlyArray<ScreenPoint & { at: number }>;
    readonly tile: number;
  };
  menu(): ReadonlyArray<ScreenPoint & { action: SegmentAction }> | null;
  zones(): { readonly wild: ScreenPoint; readonly remove: ScreenPoint; readonly undo: ScreenPoint; readonly reset: ScreenPoint };
  busy(): boolean;
  state(): GestureState;
}

declare global {
  interface Window {
    __palintris?: TestHook;
  }
}

export const installHook = (hook: TestHook): void => {
  if (import.meta.env.DEV) window.__palintris = hook;
};

export const removeHook = (): void => {
  if (import.meta.env.DEV) delete window.__palintris;
};
