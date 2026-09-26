import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES, hash, validateManifest, type Puzzle } from './game';
import { Ollama } from './ollama';
import { readChecked, runSession, type Config, type State } from './session';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function sourceIdentity(): string {
  const files: { path: string; content: string }[] = [];
  for (const directory of ['src/core', 'scripts/sidecar']) {
    for (const name of readdirSync(join(root, directory)).sort()) {
      if (name.endsWith('.ts') && !name.endsWith('.test.ts')) files.push({ path: `${directory}/${name}`, content: readFileSync(join(root, directory, name), 'utf8') });
    }
  }
  return hash(files);
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('npm run sidecar -- --output sidecar-runs/name [--smoke] [--minutes 10] [--max-calls 40] [--model gemma4:e4b-mlx] [--base-url http://127.0.0.1:11434] [--timeout-ms 180000] [--manifest puzzles.json] [--from previous-run]\nOne iteration per run. Resume with the identical command. STOP file or SIGINT/SIGTERM stops. --from requires a fresh manifest.');
    return;
  }
  const values = new Map<string, string>(); let smoke = false;
  const keys = ['--output', '--minutes', '--max-calls', '--model', '--base-url', '--timeout-ms', '--manifest', '--from'];
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--smoke' && !smoke) { smoke = true; continue; }
    if (key === undefined || !keys.includes(key) || values.has(key)) throw new Error(`Unknown or repeated argument: ${String(key)}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values.set(key, value);
  }
  const output = values.get('--output');
  if (output === undefined) throw new Error('--output is required');
  const baseUrl = values.get('--base-url') ?? 'http://127.0.0.1:11434';
  const model = values.get('--model') ?? 'gemma4:e4b-mlx';
  const timeout = Number(values.get('--timeout-ms') ?? 180000);
  const durationMs = Number(values.get('--minutes') ?? 10) * 60000;
  const maxCalls = Number(values.get('--max-calls') ?? (smoke ? 2 : 40));
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 3600000 || !Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 1000) throw new Error('Use minutes 0–60 and max-calls 1–1000');
  const manifest = values.get('--manifest');
  const puzzles = manifest === undefined ? FIXTURES : JSON.parse(readFileSync(resolve(manifest), 'utf8')) as Puzzle[];
  validateManifest(puzzles);
  let initialPolicy = 'Compare mirrored positions and choose a legal move that makes the whole board a palindrome with the fewest moves.';
  let previousStates: readonly string[] = [];
  const previous = values.get('--from');
  if (previous !== undefined) {
    if (manifest === undefined) throw new Error('--from requires --manifest with new puzzles');
    const oldConfig = readChecked<Config>(join(resolve(previous), 'config.json'));
    const oldState = readChecked<State>(join(resolve(previous), 'state.json'));
    if (oldState.status !== 'completed' || oldState.fingerprint !== hash(oldConfig)) throw new Error('Previous run must be complete with matching configuration');
    initialPolicy = oldState.champion;
    previousStates = [...oldConfig.previousStates ?? [], ...validateManifest(oldConfig.puzzles)];
    if (validateManifest(puzzles).some(key => previousStates.includes(key))) throw new Error('New manifest reuses previous states');
  }
  const client = new Ollama(baseUrl, model, timeout);
  const digest = await client.identify();
  const config: Config = { identity: hash({ source: sourceIdentity(), model, digest, baseUrl, timeout }), model: { name: model, digest, baseUrl }, mode: smoke ? 'smoke' : 'run', durationMs, maxCalls, initialPolicy, puzzles, previousStates };
  const controller = new AbortController();
  const stop = (): void => controller.abort(new Error('requested'));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    console.log(`Local ${model} (${digest.slice(0, 12)}), ${config.mode}; output ${resolve(output)}`);
    const state = await runSession(resolve(output), config, {
      choose: (request, signal) => client.choose(request, signal),
      propose: (policy, evidence, signal) => client.propose(policy, evidence, signal),
      signal: controller.signal,
    });
    console.log(JSON.stringify({ status: state.status, reason: state.reason, calls: state.calls, games: Object.keys(state.games).length, assessment: state.assessment, holdout: state.holdout }));
    if (state.status !== 'completed') process.exitCode = 2;
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
