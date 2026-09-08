import type { BoardState } from '../core/board';
import { apply, createBoard } from '../core/board';
import type { Command, RejectReason, Result } from '../core/commands';
import { isPalindrome } from '../core/palindrome';
import type { Rules } from '../core/rules';
import type { Stars } from '../core/scoring';
import { starsFor } from '../core/scoring';
import type { SolveRequest, SolveResult } from '../core/solver';
import type { Hand, Tile } from '../core/tiles';

export const CLIENT_SOLVER_STATES = 50000;

export interface SolverPort {
  solve(req: SolveRequest): Promise<SolveResult>;
  cancelAll(): void;
}

export type SolveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'known'; readonly moves: number }
  | { readonly kind: 'deadEnd' }
  | { readonly kind: 'unknown' };

export interface SessionView {
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly movesUsed: number;
  readonly budgetLeft: number;
  readonly canUndo: boolean;
  readonly solved: boolean;
  readonly stars: Stars;
  readonly solveStatus: SolveStatus;
}

export interface SessionOptions {
  readonly rules: Rules;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly target: number;
  readonly budget: number;
  readonly solver: SolverPort;
  readonly solverStates?: number;
  readonly onChange: (view: SessionView) => void;
}

/**
 * Kjører ett brett: regler via apply, løser-status etter hvert trekk, stjerner ved løsning.
 * Vet ingenting om modus eller Phaser.
 */
export class BoardSession {
  private current: BoardState;
  private solveStatus: SolveStatus = { kind: 'idle' };
  private requestSeq = 0;
  private disposed = false;

  constructor(private readonly opts: SessionOptions) {
    this.current = createBoard(opts.tiles, opts.hand);
    this.afterChange();
  }

  get state(): BoardState {
    return this.current;
  }

  dispatch(cmd: Command): Result<BoardState, RejectReason> {
    const r = apply(this.opts.rules, this.current, cmd);
    if (!r.ok) return r;
    this.current = r.value;
    this.afterChange();
    return r;
  }

  view(): SessionView {
    const solved = isPalindrome(this.current.tiles);
    const budgetLeft = this.opts.budget - this.current.movesUsed;
    return {
      tiles: this.current.tiles,
      hand: this.current.hand,
      movesUsed: this.current.movesUsed,
      budgetLeft,
      canUndo: this.current.history.length > 0,
      solved,
      stars: solved ? starsFor(this.current.movesUsed, this.opts.target, this.opts.budget) : 0,
      solveStatus: this.solveStatus,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.opts.solver.cancelAll();
  }

  private emit(): void {
    if (!this.disposed) this.opts.onChange(this.view());
  }

  private afterChange(): void {
    const seq = ++this.requestSeq;
    if (isPalindrome(this.current.tiles)) {
      this.solveStatus = { kind: 'idle' };
      this.opts.solver.cancelAll();
      this.emit();
      return;
    }
    const budgetLeft = this.opts.budget - this.current.movesUsed;
    if (budgetLeft <= 0) {
      this.solveStatus = { kind: 'deadEnd' };
      this.opts.solver.cancelAll();
      this.emit();
      return;
    }
    this.solveStatus = { kind: 'pending' };
    this.emit();
    void this.opts.solver
      .solve({
        rules: this.opts.rules,
        tiles: this.current.tiles,
        hand: this.current.hand,
        maxMoves: budgetLeft,
        limits: { states: this.opts.solverStates ?? CLIENT_SOLVER_STATES },
      })
      .then((res) => this.onSolveResult(seq, res));
  }

  private onSolveResult(seq: number, res: SolveResult): void {
    if (this.disposed || seq !== this.requestSeq || res.status === 'cancelled') return;
    switch (res.status) {
      case 'solved':
        this.solveStatus = { kind: 'known', moves: res.moves };
        break;
      case 'unreachableWithinBudget':
        this.solveStatus = { kind: 'deadEnd' };
        break;
      case 'unknown':
        this.solveStatus = { kind: 'unknown' };
        break;
    }
    this.emit();
  }
}
