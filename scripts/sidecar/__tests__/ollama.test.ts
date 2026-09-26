import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ollama } from '../ollama';
import { makeRequest, FIXTURES } from '../game';
import { createBoard } from '../../../src/core/board';
const puzzle = FIXTURES[0]!;
const request = makeRequest(puzzle, createBoard(puzzle.tiles, puzzle.hand), 'p', []);
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
const tags = { models: [{ name: 'gemma4:e4b-mlx', digest: 'frozen' }] };
afterEach(() => vi.unstubAllGlobals());
describe('Ollama local boundary', () => {
  it('rejects external or credential-bearing endpoints', () => {
    for (const url of ['https://example.com', 'http://localhost@evil.com', 'http://u:p@127.0.0.1:11434', 'http://localhost/path', 'http://localhost?x=1']) expect(() => new Ollama(url, 'gemma4:e4b-mlx', 500)).toThrow(/local/);
  });
  it('constrains native chat and rejects illegal answers without fallback', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      if (url.endsWith('/api/tags')) return Promise.resolve(response(tags));
      expect(init.redirect).toBe('error'); body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return Promise.resolve(response({ message: { content: '{"choice":"invalid"}' } }));
    });
    const client = new Ollama('http://127.0.0.1:11434', 'gemma4:e4b-mlx', 500);
    await expect(client.choose(request, new AbortController().signal)).rejects.toThrow(/choice/);
    expect(body['stream']).toBe(false); expect(body['think']).toBe(false);
    expect(body['format']).toMatchObject({ required: ['choice'], additionalProperties: false });
  });
  it('rejects changed model digest before generation', async () => {
    let count = 0;
    vi.stubGlobal('fetch', () => Promise.resolve(response(count++ === 0 ? tags : { models: [{ name: 'gemma4:e4b-mlx', digest: 'changed' }] })));
    const client = new Ollama('http://localhost:11434', 'gemma4:e4b-mlx', 500);
    expect(await client.identify()).toBe('frozen');
    await expect(client.choose(request, new AbortController().signal)).rejects.toThrow(/digest/);
  });
  it('bounds hangs and respects cancellation', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const client = new Ollama('http://localhost:11434', 'gemma4:e4b-mlx', 20);
    await expect(client.identify()).rejects.toThrow('aborted');
  });
  it('accepts a bounded proposal and rejects extra JSON keys', async () => {
    let extra = false;
    vi.stubGlobal('fetch', (url: string) => Promise.resolve(url.endsWith('/api/tags') ? response(tags) : response({ message: { content: extra ? '{"policy":"p","tools":true}' : '{"policy":"Compare mirrored symbols."}' } })));
    const client = new Ollama('http://localhost:11434', 'gemma4:e4b-mlx', 500);
    expect(await client.propose('p', 'evidence', new AbortController().signal)).toBe('Compare mirrored symbols.');
    extra = true;
    await expect(client.propose('p', 'evidence', new AbortController().signal)).rejects.toThrow(/JSON/);
  });
});
