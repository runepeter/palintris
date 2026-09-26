import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, runSession, type Config } from '../session';
import { hash, FIXTURES, type Request, type GameResult } from '../game';
import { applyMove } from '../../../src/core/step';
import { makeRules } from '../../../src/core/rules';
import { makeSnapshot } from '../../../src/core/tiles';
import { isPalindrome } from '../../../src/core/palindrome';

const dirs: string[] = [];
const dir = () => { const value = mkdtempSync(join(tmpdir(), 'palintris-sidecar-')); dirs.push(value); return value; };
afterEach(() => { dirs.forEach(d => rmSync(d, { recursive: true, force: true })); dirs.length = 0; });
const config: Config = { identity: 'code-model', mode: 'run', durationMs: 60000, maxCalls: 100, initialPolicy: 'Solve the palindrome.', puzzles: FIXTURES };
const choose = (r: Request) => {
  const snap = makeSnapshot(r.observation.tiles, r.observation.hand);
  return Promise.resolve(r.choices.find(c => { const next = applyMove(makeRules(r.observation.ops), snap, c.command); return next.ok && isPalindrome(next.value.tiles); })?.id ?? r.choices[0]!.id);
};
const row = (id: string, solved: boolean, moves = 1): GameResult => ({ puzzleId: id, outcome: solved ? 'solved' : 'budget', moves, stars: solved ? 3 : 0, optimum: 1, excess: solved ? moves - 1 : null, trace: [] });

describe('paired policy evaluation', () => {
  it('keeps ties and rejects incomplete or mismatched pairs', () => {
    expect(evaluate([row('a', true)], [row('a', true)]).promoted).toBe(false);
    expect(() => evaluate([row('a', true)], [])).toThrow(/pair/);
    expect(() => evaluate([row('a', true)], [row('b', true)])).toThrow(/pair/);
  });
  it('promotes measured gain but never a lower solve rate', () => {
    expect(evaluate([row('a', false)], [row('a', true)]).promoted).toBe(true);
    expect(evaluate([row('a', true, 2), row('b', true, 2)], [row('a', true), row('b', false)]).promoted).toBe(false);
  });
});
describe('checkpointed local loop', () => {
  it('finishes train/dev/holdout and resumes without more model calls', async () => {
    const output = dir(); let calls = 0; let proposalEvidence = '';
    const deps = { choose: (r: Request) => { calls++; return choose(r); }, propose: (_policy: string, evidence: string) => { proposalEvidence = evidence; return Promise.resolve('Check mirrored ends first.'); } };
    const state = await runSession(output, config, deps);
    expect(state.status).toBe('completed'); expect(state.assessment?.promoted).toBe(false);
    expect(Object.keys(state.games)).toHaveLength(14);
    expect(proposalEvidence).not.toMatch(/dev-|holdout-/);
    const count = calls;
    expect((await runSession(output, config, deps)).status).toBe('completed'); expect(calls).toBe(count);
    expect(readFileSync(join(output, 'report.md'), 'utf8')).toContain('Ingen målt forbedring');
    expect(readFileSync(join(output, 'report.md'), 'utf8')).toContain('Brett: 8 (trening 2, dev 3, holdout 3)');
  });
  it('preserves failed state and call budget, resumes with unchanged identity', async () => {
    const output = dir();
    await expect(runSession(output, config, { choose: () => Promise.reject(new Error('offline')), propose: () => Promise.resolve('p') })).rejects.toThrow('offline');
    const state = JSON.parse(readFileSync(join(output, 'state.json'), 'utf8')) as { value: { calls: number; games: object; status: string } };
    expect(state.value).toMatchObject({ calls: 1, games: {}, status: 'failed' });
    await expect(runSession(output, { ...config, identity: 'changed' }, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/identity/);
    expect((await runSession(output, config, { choose, propose: () => Promise.resolve('p') })).status).toBe('completed');
  });
  it('rejects inherited positions before allowing another learning round', async () => {
    const { validateManifest } = await import('../game');
    await expect(runSession(dir(), { ...config, previousStates: validateManifest(FIXTURES) }, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/previous/);
  });
  it('rejects empty smoke instead of reporting a zero-call success', async () => {
    await expect(runSession(dir(), { ...config, mode: 'smoke', puzzles: FIXTURES.filter(p => p.split !== 'train') }, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/training/);
  });
  it('honors STOP and original deadline without model work', async () => {
    const output = dir(); writeFileSync(join(output, 'STOP'), '');
    const deps = { choose: (): Promise<string> => Promise.reject(new Error('must not run')), propose: () => Promise.resolve('p'), now: () => 100 };
    expect((await runSession(output, config, deps)).status).toBe('stopped');
    rmSync(join(output, 'STOP'));
    expect((await runSession(output, config, { ...deps, now: () => 100000 })).reason).toBe('deadline');
  });
  it('does not count interrupted games and never exceeds model call cap', async () => {
    const output = dir();
    const state = await runSession(output, { ...config, maxCalls: 1 }, { choose, propose: () => Promise.resolve('p') });
    expect(state.status).toBe('stopped'); expect(state.reason).toBe('call limit'); expect(state.calls).toBe(1);
    expect(Object.keys(state.games)).toHaveLength(1);
  });
  it('validates unsafe manifests before writing any run files', async () => {
    const output = join(dir(), 'new');
    await expect(runSession(output, { ...config, puzzles: [{ ...FIXTURES[0]!, id: '../../outside' }] }, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/Invalid puzzle/);
    expect(existsSync(output)).toBe(false);
  });
  it('interrupts an in-flight decision without saving a completed game', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10);
    try {
      const state = await runSession(dir(), config, { choose: () => new Promise<string>(() => undefined), propose: () => Promise.resolve('p'), signal: controller.signal });
      expect(state).toMatchObject({ status: 'stopped', reason: 'requested', calls: 1, games: {} });
    } finally { clearTimeout(timer); }
  });
  it('recovers a game saved immediately before a checkpoint crash without replay', async () => {
    const output = dir(); const smoke = { ...config, mode: 'smoke' as const };
    const state = await runSession(output, smoke, { choose, propose: () => Promise.resolve('p') });
    state.games = {}; state.status = 'running';
    writeFileSync(join(output, 'state.json'), JSON.stringify({ value: state, integrity: hash(state) }));
    const resumed = await runSession(output, smoke, { choose: () => Promise.reject(new Error('replayed')), propose: () => Promise.resolve('p') });
    expect(resumed.status).toBe('completed'); expect(resumed.calls).toBe(1); expect(Object.keys(resumed.games)).toHaveLength(1);
  });
  it('rejects another writer and tampered checkpoint', async () => {
    const output = dir(); writeFileSync(join(output, 'session.lock'), '123');
    await expect(runSession(output, config, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/lock/);
    expect(readFileSync(join(output, 'session.lock'), 'utf8')).toBe('123'); rmSync(join(output, 'session.lock'));
    await runSession(output, { ...config, mode: 'smoke' }, { choose, propose: () => Promise.resolve('p') });
    const path = join(output, 'state.json'); writeFileSync(path, readFileSync(path, 'utf8').replace('Solve the palindrome.', 'Cheat the palindrome.'));
    await expect(runSession(output, { ...config, mode: 'smoke' }, { choose, propose: () => Promise.resolve('p') })).rejects.toThrow(/integrity/);
  });
});
