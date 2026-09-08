import type { GestureState, SegmentAction } from '../game/gestures';
import type { BoardMode } from '../game/modes/types';
import type { SessionView } from '../game/session';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface TestHook {
  readonly levelId: string;
  readonly mode: BoardMode['kind'];
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
  /** Blitz: tid igjen. Daglig: tid brukt. Ellers 0. */
  clockMs(): number;
  bannerVisible(): boolean;
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
