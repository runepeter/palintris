import type { GestureEnv, Intent, SegmentAction } from './gestures';

export type KeyCode =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Space'
  | 'KeyQ'
  | 'KeyW'
  | 'KeyE'
  | 'KeyZ'
  | 'KeyR'
  | 'KeyJ'
  | 'KeyX'
  | 'Escape';

export interface KeyEvt {
  readonly code: KeyCode;
  readonly shift: boolean;
}

export type KeyIntent = Intent | { readonly type: 'undo' } | { readonly type: 'reset' };

export interface KeyboardState {
  readonly cursor: number;
  readonly selected: number | null;
  readonly segment: { readonly anchor: number; readonly end: number } | null;
}

const SEGMENT_KEYS: Readonly<Partial<Record<KeyCode, SegmentAction>>> = {
  KeyQ: 'rotateLeft',
  KeyW: 'mirror',
  KeyE: 'rotateRight',
};

const step = (code: KeyCode): -1 | 1 | 0 =>
  code === 'ArrowLeft' || code === 'ArrowUp' ? -1 : code === 'ArrowRight' || code === 'ArrowDown' ? 1 : 0;

/**
 * Tastaturstyring for desktop. Eier egen markør, valg og segment, og produserer
 * de samme intensjonene som GestureMachine pluss undo/reset. Scenen kaller
 * clampCursor() etter hver brettendring.
 */
export class KeyboardController {
  state: KeyboardState = { cursor: 0, selected: null, segment: null };

  constructor(private readonly env: GestureEnv) {}

  reset(): void {
    this.state = { cursor: 0, selected: null, segment: null };
  }

  clampCursor(): void {
    const max = Math.max(0, this.env.count() - 1);
    const cursor = Math.min(this.state.cursor, max);
    const selected = this.state.selected !== null && this.state.selected <= max ? this.state.selected : null;
    const seg = this.state.segment;
    const segment = seg !== null && seg.anchor <= max && seg.end <= max ? seg : null;
    this.state = { cursor, selected, segment };
  }

  handle(evt: KeyEvt): KeyIntent[] {
    const d = step(evt.code);
    if (d !== 0) return evt.shift ? this.extend(d) : this.move(d);
    switch (evt.code) {
      case 'Space':
        return this.space();
      case 'KeyQ':
      case 'KeyW':
      case 'KeyE':
        return this.segmentAction(SEGMENT_KEYS[evt.code] ?? 'mirror');
      case 'KeyZ':
        return [{ type: 'undo' }];
      case 'KeyR':
        return [{ type: 'reset' }];
      case 'KeyJ':
        return this.env.hasWild() ? [{ type: 'insertWild', at: this.state.cursor }] : [{ type: 'hint', reason: 'handEmpty' }];
      case 'KeyX':
        if (this.env.isLocked(this.state.cursor)) return [{ type: 'hint', reason: 'locked' }];
        return this.env.canRemove() ? [{ type: 'remove', index: this.state.cursor }] : [{ type: 'hint', reason: 'handEmpty' }];
      case 'Escape':
        this.state = { ...this.state, selected: null, segment: null };
        return [];
      default:
        return [];
    }
  }

  private clamp(i: number): number {
    return Math.max(0, Math.min(this.env.count() - 1, i));
  }

  private move(d: -1 | 1): KeyIntent[] {
    const cursor = this.clamp(this.state.cursor + d);
    const sel = this.state.selected;
    if (sel !== null && Math.abs(cursor - sel) === 1 && !this.env.isLocked(cursor)) {
      this.state = { cursor, selected: null, segment: null };
      return [{ type: 'swap', a: sel, b: cursor }];
    }
    this.state = { ...this.state, cursor };
    return [];
  }

  private extend(d: -1 | 1): KeyIntent[] {
    const seg = this.state.segment ?? { anchor: this.state.cursor, end: this.state.cursor };
    const next = this.clamp(seg.end + d);
    if (next === seg.end || this.env.isLocked(next)) return [];
    this.state = { cursor: next, selected: null, segment: { anchor: seg.anchor, end: next } };
    return [];
  }

  private space(): KeyIntent[] {
    if (this.state.segment !== null) return [];
    const c = this.state.cursor;
    const sel = this.state.selected;
    if (sel === null) {
      if (this.env.isLocked(c)) return [{ type: 'hint', reason: 'locked' }];
      this.state = { ...this.state, selected: c };
      return [];
    }
    if (sel === c) {
      this.state = { ...this.state, selected: null };
      return [];
    }
    if (Math.abs(sel - c) === 1) {
      if (this.env.isLocked(c)) return [{ type: 'hint', reason: 'locked' }];
      this.state = { ...this.state, selected: null };
      return [{ type: 'swap', a: sel, b: c }];
    }
    this.state = { ...this.state, selected: c };
    return [];
  }

  private segmentAction(action: SegmentAction): KeyIntent[] {
    const seg = this.state.segment;
    if (seg === null) return [];
    const from = Math.min(seg.anchor, seg.end);
    const to = Math.max(seg.anchor, seg.end);
    if (action === 'mirror' && to - from + 1 < 3) return [{ type: 'hint', reason: 'segmentTooShort' }];
    this.state = { ...this.state, segment: null };
    return [{ type: 'segment', from, to, action }];
  }
}
