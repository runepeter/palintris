import type { GestureState, SegmentAction } from '../game/gestures';
import type { BoardMode } from '../game/modes/types';
import type { SessionView } from '../game/session';

/**
 * Rene typer for window.__palintris, uten Phaser eller Vite-avhengigheter.
 * e2e/board.spec.ts importerer TestHook herfra, så testens type følger den reelle
 * hook-formen i stedet for en håndkopiert kopi som kan gli ut av synk.
 */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface TestHook {
  readonly levelId: string;
  readonly mode: BoardMode['kind'];
  view(): SessionView;
  feedback(): { readonly matched: number; readonly total: number; readonly gained: number; readonly flow: number };
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
  /** Sant mens kampanjeintroen står. Nivåer uten intro, og sette introer, gir usant. */
  introVisible(): boolean;
  /** Lukker introen som «Skjønner» ville gjort, og merker den som sett. */
  dismissIntro(): void;
}

declare global {
  interface Window {
    __palintris?: TestHook;
  }
}
