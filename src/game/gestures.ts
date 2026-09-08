export const DRAG_THRESHOLD = 12;
export const HOLD_MS = 250;

export type SegmentAction = 'rotateLeft' | 'mirror' | 'rotateRight';

export type Target =
  | { readonly kind: 'tile'; readonly index: number }
  | { readonly kind: 'gap'; readonly at: number }
  | { readonly kind: 'hand'; readonly item: 'wild' | 'remove' }
  | { readonly kind: 'menu'; readonly action: SegmentAction }
  | { readonly kind: 'none' };

export interface PointerEvt {
  readonly type: 'down' | 'move' | 'up' | 'cancel';
  readonly x: number;
  readonly y: number;
  readonly t: number;
  readonly target: Target;
}

export type HintReason = 'locked' | 'segmentContainsLocked' | 'segmentTooShort' | 'handEmpty';

export type Intent =
  | { readonly type: 'swap'; readonly a: number; readonly b: number }
  | { readonly type: 'remove'; readonly index: number }
  | { readonly type: 'insertWild'; readonly at: number }
  | { readonly type: 'segment'; readonly from: number; readonly to: number; readonly action: SegmentAction }
  | { readonly type: 'hint'; readonly reason: HintReason };

export type GestureState =
  | { readonly name: 'idle' }
  | { readonly name: 'pending'; readonly index: number; readonly x: number; readonly y: number; readonly t: number }
  | { readonly name: 'dragTile'; readonly index: number; readonly x: number; readonly y: number }
  | { readonly name: 'segment'; readonly anchor: number; readonly end: number }
  | { readonly name: 'menu'; readonly from: number; readonly to: number }
  | { readonly name: 'selected'; readonly index: number }
  | { readonly name: 'dragWild'; readonly x: number; readonly y: number }
  | { readonly name: 'wildArmed' };

export interface GestureEnv {
  count(): number;
  isLocked(index: number): boolean;
  hasWild(): boolean;
  canRemove(): boolean;
}

const IDLE: GestureState = { name: 'idle' };
const hint = (reason: HintReason): Intent => ({ type: 'hint', reason });
const adjacent = (a: number, b: number): boolean => Math.abs(a - b) === 1;

/**
 * Oversetter pekerhendelser til intensjoner. Kjenner ikke geometri: scenen løser
 * Target fra layout-treff. Naboskap og segmenter er alltid i sekvensrekkefølge.
 */
export class GestureMachine {
  state: GestureState = IDLE;

  constructor(private readonly env: GestureEnv) {}

  reset(): void {
    this.state = IDLE;
  }

  /** Kalles hver frame med nåtid, så hold kan oppdages uten bevegelse. */
  tick(t: number): void {
    const s = this.state;
    if (s.name === 'pending' && t - s.t >= HOLD_MS) {
      this.state = { name: 'segment', anchor: s.index, end: s.index };
    }
  }

  handle(evt: PointerEvt): Intent[] {
    if (evt.type === 'cancel') {
      this.state = IDLE;
      return [];
    }
    switch (this.state.name) {
      case 'idle':
        return this.fromIdle(evt);
      case 'pending':
        return this.fromPending(evt, this.state);
      case 'dragTile':
        return this.fromDragTile(evt, this.state);
      case 'segment':
        return this.fromSegment(evt, this.state);
      case 'menu':
        return this.fromMenu(evt, this.state);
      case 'selected':
        return this.fromSelected(evt, this.state);
      case 'dragWild':
        return this.fromDragWild(evt);
      case 'wildArmed':
        return this.fromWildArmed(evt);
    }
  }

  private segmentHasLocked(from: number, to: number): boolean {
    for (let i = from; i <= to; i++) if (this.env.isLocked(i)) return true;
    return false;
  }

  private fromIdle(evt: PointerEvt): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    if (t.kind === 'tile') {
      if (this.env.isLocked(t.index)) return [hint('locked')];
      this.state = { name: 'pending', index: t.index, x: evt.x, y: evt.y, t: evt.t };
      return [];
    }
    if (t.kind === 'hand' && t.item === 'wild') {
      if (!this.env.hasWild()) return [hint('handEmpty')];
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    return [];
  }

  private fromPending(evt: PointerEvt, s: Extract<GestureState, { name: 'pending' }>): Intent[] {
    if (evt.type === 'move') {
      if (evt.t - s.t >= HOLD_MS) {
        const seg: Extract<GestureState, { name: 'segment' }> = { name: 'segment', anchor: s.index, end: s.index };
        this.state = seg;
        return this.fromSegment(evt, seg);
      }
      if (Math.hypot(evt.x - s.x, evt.y - s.y) > DRAG_THRESHOLD) {
        this.state = { name: 'dragTile', index: s.index, x: evt.x, y: evt.y };
      }
      return [];
    }
    if (evt.type === 'up') {
      this.state = evt.t - s.t >= HOLD_MS ? IDLE : { name: 'selected', index: s.index };
      return [];
    }
    return [];
  }

  private fromDragTile(evt: PointerEvt, s: Extract<GestureState, { name: 'dragTile' }>): Intent[] {
    if (evt.type === 'move') {
      this.state = { ...s, x: evt.x, y: evt.y };
      return [];
    }
    if (evt.type === 'up') {
      this.state = IDLE;
      const t = evt.target;
      if (t.kind === 'tile' && adjacent(s.index, t.index)) return [{ type: 'swap', a: s.index, b: t.index }];
      if (t.kind === 'hand' && t.item === 'remove') {
        return this.env.canRemove() ? [{ type: 'remove', index: s.index }] : [hint('handEmpty')];
      }
      return [];
    }
    return [];
  }

  private fromSegment(evt: PointerEvt, s: Extract<GestureState, { name: 'segment' }>): Intent[] {
    if (evt.type === 'move') {
      const t = evt.target;
      if (t.kind === 'tile' && adjacent(t.index, s.end) && !this.env.isLocked(t.index)) {
        this.state = { name: 'segment', anchor: s.anchor, end: t.index };
      }
      return [];
    }
    if (evt.type === 'up') {
      if (s.anchor === s.end) {
        this.state = IDLE;
        return [];
      }
      this.state = { name: 'menu', from: Math.min(s.anchor, s.end), to: Math.max(s.anchor, s.end) };
      return [];
    }
    return [];
  }

  private fromMenu(evt: PointerEvt, s: Extract<GestureState, { name: 'menu' }>): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    if (t.kind === 'menu') {
      if (t.action === 'mirror' && s.to - s.from + 1 < 3) return [hint('segmentTooShort')];
      this.state = IDLE;
      return [{ type: 'segment', from: s.from, to: s.to, action: t.action }];
    }
    this.state = IDLE;
    return [];
  }

  private fromSelected(evt: PointerEvt, s: Extract<GestureState, { name: 'selected' }>): Intent[] {
    if (evt.type !== 'down') return [];
    const t = evt.target;
    this.state = IDLE;
    if (t.kind === 'tile') {
      if (t.index === s.index) return [];
      if (adjacent(s.index, t.index)) {
        if (this.env.isLocked(t.index)) return [hint('locked')];
        return [{ type: 'swap', a: s.index, b: t.index }];
      }
      const from = Math.min(s.index, t.index);
      const to = Math.max(s.index, t.index);
      if (this.segmentHasLocked(from, to)) return [hint('segmentContainsLocked')];
      this.state = { name: 'menu', from, to };
      return [];
    }
    if (t.kind === 'hand' && t.item === 'remove') {
      return this.env.canRemove() ? [{ type: 'remove', index: s.index }] : [hint('handEmpty')];
    }
    if (t.kind === 'hand' && t.item === 'wild') {
      if (!this.env.hasWild()) return [hint('handEmpty')];
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    return [];
  }

  private fromDragWild(evt: PointerEvt): Intent[] {
    if (evt.type === 'move') {
      this.state = { name: 'dragWild', x: evt.x, y: evt.y };
      return [];
    }
    if (evt.type === 'up') {
      const t = evt.target;
      if (t.kind === 'hand' && t.item === 'wild') {
        this.state = { name: 'wildArmed' };
        return [];
      }
      this.state = IDLE;
      if (t.kind === 'gap') return [{ type: 'insertWild', at: t.at }];
      return [];
    }
    return [];
  }

  private fromWildArmed(evt: PointerEvt): Intent[] {
    if (evt.type !== 'down') return [];
    this.state = IDLE;
    const t = evt.target;
    if (t.kind === 'gap') return [{ type: 'insertWild', at: t.at }];
    return [];
  }
}
