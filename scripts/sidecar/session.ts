import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash, playPuzzle, validateManifest, type GameResult, type Puzzle, type Request } from './game';

export interface Config {
  identity: string; mode: 'smoke' | 'run'; durationMs: number; maxCalls: number;
  initialPolicy: string; puzzles: readonly Puzzle[]; previousStates?: readonly string[];
  model?: { name: string; digest: string; baseUrl: string };
}
export interface Assessment { promoted: boolean; pairs: number; incumbentSolved: number; candidateSolved: number; incumbentReward: number; candidateReward: number }
interface SavedGame { fingerprint: string; policy: string; result: GameResult }
export interface State {
  version: 1; fingerprint: string; deadline: number; calls: number;
  status: 'running' | 'completed' | 'stopped' | 'failed'; reason?: string;
  initialPolicy: string; candidate?: string; champion: string;
  assessment?: Assessment; holdout?: Assessment; games: Record<string, SavedGame>;
}
export interface Dependencies {
  choose(request: Request, signal: AbortSignal): Promise<string>;
  propose(policy: string, evidence: string, signal: AbortSignal): Promise<string>;
  now?: () => number; signal?: AbortSignal;
}

export function evaluate(incumbent: readonly GameResult[], candidate: readonly GameResult[]): Assessment {
  if (incumbent.length === 0 || incumbent.length !== candidate.length || new Set(incumbent.map(r => r.puzzleId)).size !== incumbent.length || incumbent.some((r, i) => r.puzzleId !== candidate[i]?.puzzleId)) throw new Error('Incomplete or mismatched evaluation pairs');
  const solved = (rows: readonly GameResult[]): number => rows.filter(r => r.outcome === 'solved').length;
  // A solved puzzle dominates speed; paired efficiency only breaks equal solve counts.
  const reward = (rows: readonly GameResult[]): number => rows.reduce((sum, r) => sum + (r.outcome === 'solved' ? 1 + 0.1 / Math.max(1, r.moves) : 0), 0) / rows.length;
  const incumbentSolved = solved(incumbent), candidateSolved = solved(candidate);
  const incumbentReward = reward(incumbent), candidateReward = reward(candidate);
  return { promoted: candidateSolved >= incumbentSolved && candidateReward > incumbentReward + 1e-9, pairs: incumbent.length, incumbentSolved, candidateSolved, incumbentReward, candidateReward };
}

function atomic(path: string, value: unknown): void {
  const body = { value, integrity: hash(value) };
  writeFileSync(`${path}.tmp`, JSON.stringify(body, null, 2) + '\n', { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}
export function readChecked<T>(path: string): T {
  const envelope = JSON.parse(readFileSync(path, 'utf8')) as { value: T; integrity: string };
  if (hash(envelope.value) !== envelope.integrity) throw new Error(`Checkpoint integrity failure: ${path}`);
  return envelope.value;
}
class Stop extends Error {}

function report(state: State, config: Config): string {
  const count = (split: Puzzle['split']): number => config.puzzles.filter(p => p.split === split).length;
  const rows = Object.entries(state.games).map(([job, { result: r }]) => `| ${job} | ${r.outcome} | ${r.moves} | ${r.optimum ?? 'ukjent'} | ${r.stars} |`);
  return `# Lokal Palintris-sidecar\n\nStatus: ${state.status}${state.reason === undefined ? '' : ` (${state.reason})`}. Modellkall: ${state.calls}.\n\n${state.assessment?.promoted === true ? 'Målt forbedring på dev-utvalget; kandidaten beholdt.' : 'Ingen målt forbedring som gir ny strategi.'}\n\nDette er prompt-/strategisøk, ikke trening av modellvekter. Brett: ${config.puzzles.length} (trening ${count('train')}, dev ${count('dev')}, holdout ${count('holdout')}). Lite kuratert utvalg; ingen påstand om menneskelig vanskelighetsgrad eller generell læring.\n\nDev: ${state.assessment === undefined ? 'ufullstendig' : JSON.stringify(state.assessment)}\n\nSeparat holdout, initial/final (påvirker aldri seleksjon): ${state.holdout === undefined ? 'ufullstendig' : JSON.stringify(state.holdout)}\n\nStartstrategi: ${state.initialPolicy}\n\nKandidat: ${state.candidate ?? 'ikke foreslått'}\n\nBeholdt strategi: ${state.champion}\n\n| Spill | Utfall | Trekk | BFS-minimum | Stjerner |\n|---|---|---:|---:|---:|\n${rows.join('\n')}\n`;
}

export async function runSession(dir: string, config: Config, deps: Dependencies): Promise<State> {
  const states = validateManifest(config.puzzles);
  if (states.some(key => config.previousStates?.includes(key) === true)) throw new Error('Manifest reuses previous training/evaluation states');
  if (config.identity.length === 0 || !Number.isInteger(config.maxCalls) || config.maxCalls < 1 || !Number.isFinite(config.durationMs) || config.durationMs <= 0 || !config.initialPolicy.trim() || config.initialPolicy.length > 500) throw new Error('Invalid session config');
  if (!config.puzzles.some(p => p.split === 'train')) throw new Error('At least one training puzzle required');
  if (config.mode === 'run' && ['train', 'dev', 'holdout'].some(split => !config.puzzles.some(p => p.split === split))) throw new Error('All three dataset splits required');
  mkdirSync(join(dir, 'games'), { recursive: true });
  const lock = join(dir, 'session.lock');
  writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
  let state: State | undefined;
  const now = deps.now ?? Date.now;
  const path = join(dir, 'state.json');
  const event = (value: unknown): void => appendFileSync(join(dir, 'events.jsonl'), JSON.stringify({ at: new Date().toISOString(), value }) + '\n', { mode: 0o600 });
  const save = (): void => {
    if (state === undefined) return;
    atomic(path, state);
    writeFileSync(join(dir, 'report.md'), report(state, config), { mode: 0o600 });
  };
  try {
    const fingerprint = hash(config);
    const loaded = existsSync(path) ? readChecked<State>(path) : undefined;
    if (loaded !== undefined && loaded.fingerprint !== fingerprint) throw new Error('Session identity/config changed; use a new output directory');
    if (loaded !== undefined) for (const [id, game] of Object.entries(loaded.games)) {
      if (hash(readChecked<SavedGame>(join(dir, 'games', `${id}.json`))) !== hash(game)) throw new Error('Game checkpoint integrity mismatch');
    }
    if (loaded === undefined) atomic(join(dir, 'config.json'), config);
    state = loaded ?? { version: 1, fingerprint, deadline: now() + config.durationMs, calls: 0, status: 'running', initialPolicy: config.initialPolicy, champion: config.initialPolicy, games: {} };
    if (state.status === 'completed') return state;
    state.status = 'running'; delete state.reason; save();
    const current = state;
    const check = (): void => {
      if (deps.signal?.aborted === true || existsSync(join(dir, 'STOP'))) throw new Stop('requested');
      if (now() >= current.deadline) throw new Stop('deadline');
    };
    const call = async <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      check();
      if (current.calls >= config.maxCalls) throw new Stop('call limit');
      current.calls++; save();
      const controller = new AbortController();
      const interval = setInterval(() => { try { check(); } catch (error) { controller.abort(error); } }, 100);
      let rejectAbort: (() => void) | undefined;
      try {
        const result = await Promise.race([work(controller.signal), new Promise<never>((_, reject): void => {
          rejectAbort = (): void => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Stop('requested'));
          controller.signal.addEventListener('abort', rejectAbort, { once: true });
        })]);
        check(); return result;
      } finally {
        clearInterval(interval);
        if (rejectAbort !== undefined) controller.signal.removeEventListener('abort', rejectAbort);
        controller.abort();
      }
    };
    const game = async (phase: string, puzzle: Puzzle, policy: string): Promise<GameResult> => {
      check(); const id = `${phase}-${puzzle.id}`;
      const file = join(dir, 'games', `${id}.json`);
      const saved = current.games[id] ?? (existsSync(file) ? readChecked<SavedGame>(file) : undefined);
      if (saved !== undefined) {
        if (saved.policy !== policy || saved.fingerprint !== current.fingerprint || saved.result.puzzleId !== puzzle.id) throw new Error('Checkpoint policy/identity mismatch');
        current.games[id] = saved; save();
        return saved.result;
      }
      event({ type: 'game-start', id });
      const result = await playPuzzle(puzzle, policy, r => call(signal => deps.choose(r, signal)), trace => event({ type: 'decision', id, trace }));
      check();
      const value = { fingerprint: current.fingerprint, policy, result };
      atomic(join(dir, 'games', `${id}.json`), value); current.games[id] = value; save();
      return result;
    };
    const training = config.puzzles.filter(p => p.split === 'train');
    const experience: GameResult[] = [];
    for (const p of config.mode === 'smoke' ? training.slice(0, 1) : training) experience.push(await game('experience', p, state.initialPolicy));
    if (!config.puzzles.some(p => p.split === 'train')) throw new Error('At least one training puzzle required');
  if (config.mode === 'run') {
      if (state.candidate === undefined) {
        const evidence = JSON.stringify(experience.map(r => ({ puzzleId: r.puzzleId, outcome: r.outcome, moves: r.moves, trace: r.trace })));
        const candidate = (await call(signal => deps.propose(current.initialPolicy, evidence, signal))).trim();
        if (candidate.length === 0 || candidate.length > 500) throw new Error('Invalid candidate policy length');
        state.candidate = candidate; save();
      }
      const paired = async (phase: string, split: Puzzle['split'], a: string, b: string): Promise<Assessment> => {
        const left: GameResult[] = [], right: GameResult[] = [];
        for (const [i, p] of config.puzzles.filter(p => p.split === split).entries()) {
          if (i % 2 === 0) { left.push(await game(`${phase}-initial`, p, a)); right.push(await game(`${phase}-final`, p, b)); }
          else { const r = await game(`${phase}-final`, p, b); left.push(await game(`${phase}-initial`, p, a)); right.push(r); }
        }
        return evaluate(left, right);
      };
      if (state.assessment === undefined) {
        state.assessment = await paired('dev', 'dev', state.initialPolicy, state.candidate);
        if (state.assessment.promoted) state.champion = state.candidate;
        save();
      }
      if (state.holdout === undefined) { state.holdout = await paired('holdout', 'holdout', state.initialPolicy, state.champion); save(); }
    }
    state.status = 'completed'; save(); return state;
  } catch (error) {
    if (state !== undefined) {
      state.status = error instanceof Stop ? 'stopped' : 'failed';
      state.reason = error instanceof Error ? error.message : String(error); save();
      if (error instanceof Stop) return state;
    }
    throw error;
  } finally { unlinkSync(lock); }
}
