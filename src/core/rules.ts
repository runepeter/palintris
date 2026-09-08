export type OpName = 'swap' | 'rotate' | 'mirror' | 'insertWild' | 'remove';

export const ALL_OPS: readonly OpName[] = ['swap', 'rotate', 'mirror', 'insertWild', 'remove'];
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 14;

export interface Rules {
  readonly allowedOps: ReadonlySet<OpName>;
  readonly minLength: number;
  readonly maxLength: number;
}

export const makeRules = (ops: readonly OpName[]): Rules => ({
  allowedOps: new Set(ops),
  minLength: MIN_LENGTH,
  maxLength: MAX_LENGTH,
});
