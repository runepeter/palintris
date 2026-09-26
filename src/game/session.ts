import type { BoardState } from '../core/board';
import { apply, createBoard } from '../core/board';
import type { Command, MoveCommand, RejectReason, Result } from '../core/commands';
import { reject } from '../core/commands';
import { canBecomePalindrome, isPalindrome } from '../core/palindrome';
import type { Rules } from '../core/rules';
import type { Stars } from '../core/scoring';
import { starsFor } from '../core/scoring';
import type { SolveRequest, SolveResult } from '../core/solver';
import { applyMove } from '../core/step';
import type { Hand, Tile } from '../core/tiles';

export const CLIENT_SOLVER_STATES = 50000;

export interface SolverPort {
  solve(req: SolveRequest): Promise<SolveResult>;
  cancelAll(): void;
}

/** Kjernens avvisningsgrunner, pluss sesjonens egen for trekk etter dispose. */
export type SessionReject = RejectReason | 'disposed';

export interface SessionHint {
  readonly move: MoveCommand;
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
  readonly includeFirstMove?: boolean;
  readonly onChange: (view: SessionView) => void;
}

/**
 * Kjører ett brett: regler via apply, løser-status etter hvert trekk, stjerner ved løsning.
 * Vet ingenting om modus eller Phaser. Kalleren leser view() etter konstruksjon; onChange
 * fyres først etter første dispatch eller løser-svar.
 */
export class BoardSession {
  private current: BoardState;
  private solveStatus: SolveStatus = { kind: 'idle' };
  private requestSeq = 0;
  private disposed = false;
  private hint: SessionHint | null = null;

  constructor(private readonly opts: SessionOptions) {
    this.current = createBoard(opts.tiles, opts.hand);
    this.afterChange(false);
  }

  get state(): BoardState {
    return this.current;
  }

  currentHint(): SessionHint | null {
    return this.hint !== null && this.isCurrentHint(this.hint) ? this.hint : null;
  }

  isCurrentHint(quote: SessionHint): boolean {
    return !this.disposed && this.hint === quote && this.solveStatus.kind === 'known' &&
      !isPalindrome(this.current.tiles) && this.current.movesUsed < this.opts.budget &&
      applyMove(this.opts.rules, this.current, quote.move).ok;
  }

  dispatch(cmd: Command): Result<BoardState, SessionReject> {
    if (this.disposed) return reject('disposed');
    const r = apply(this.opts.rules, this.current, cmd);
    if (!r.ok) return r;
    // Reset på et urørt brett gir samme tilstand: behold løserstatus og et betalt hint.
    if (r.value === this.current) {
      this.emit();
      return r;
    }
    this.hint = null;
    this.current = r.value;
    this.afterChange(true);
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
    this.hint = null;
    this.opts.solver.cancelAll();
  }

  private emit(): void {
    if (!this.disposed) this.opts.onChange(this.view());
  }

  private afterChange(emitNow: boolean): void {
    const seq = ++this.requestSeq;
    if (isPalindrome(this.current.tiles)) {
      this.solveStatus = { kind: 'idle' };
      this.opts.solver.cancelAll();
      if (emitNow) this.emit();
      return;
    }
    const budgetLeft = this.opts.budget - this.current.movesUsed;
    // Pariteten fanger sikre blindveier der løseren ellers ville gitt opp med «ukjent».
    if (budgetLeft <= 0 || !canBecomePalindrome(this.current.tiles, this.current.hand)) {
      this.solveStatus = { kind: 'deadEnd' };
      this.opts.solver.cancelAll();
      if (emitNow) this.emit();
      return;
    }
    this.solveStatus = { kind: 'pending' };
    if (emitNow) this.emit();
    void this.opts.solver
      .solve({
        rules: this.opts.rules,
        tiles: this.current.tiles,
        hand: this.current.hand,
        maxMoves: budgetLeft,
        limits: { states: this.opts.solverStates ?? CLIENT_SOLVER_STATES },
        ...(this.opts.includeFirstMove === true ? { includeFirstMove: true } : {}),
      })
      .then((res) => this.onSolveResult(seq, res))
      .catch(() => this.onSolveResult(seq, { status: 'unknown' }));
  }

  private onSolveResult(seq: number, res: SolveResult): void {
    if (this.disposed || seq !== this.requestSeq || res.status === 'cancelled') return;
    switch (res.status) {
      case 'solved':
        this.solveStatus = { kind: 'known', moves: res.moves };
        if (this.opts.includeFirstMove === true && Number.isSafeInteger(res.moves) && res.moves > 0 &&
            res.moves <= this.opts.budget - this.current.movesUsed && res.firstMove !== undefined &&
            applyMove(this.opts.rules, this.current, res.firstMove).ok) {
          this.hint = Object.freeze({ move: Object.freeze({ ...res.firstMove }) });
        }
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
