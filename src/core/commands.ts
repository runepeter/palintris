export type Command =
  | { readonly type: 'swap'; readonly a: number; readonly b: number }
  | { readonly type: 'rotate'; readonly from: number; readonly to: number; readonly dir: 'left' | 'right' }
  | { readonly type: 'mirror'; readonly from: number; readonly to: number }
  | { readonly type: 'insertWild'; readonly at: number }
  | { readonly type: 'remove'; readonly tileId: number }
  | { readonly type: 'undo' }
  | { readonly type: 'reset' };

export type MoveCommand = Exclude<Command, { type: 'undo' } | { type: 'reset' }>;

export type RejectReason =
  | 'notAllowed'
  | 'locked'
  | 'notAdjacent'
  | 'segmentTooShort'
  | 'segmentContainsLocked'
  | 'handEmpty'
  | 'minLength'
  | 'maxLength'
  | 'nothingToUndo'
  | 'outOfRange';

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const reject = <E>(reason: E): Result<never, E> => ({ ok: false, reason });
