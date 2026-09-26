import type { Request } from './game';

export const RULES = 'Solve Palintris in as few moves as possible within the given budget. A palindrome has matching symbols at mirrored positions. Wild tiles match any opposite symbol. Indices are zero-based; from/to include both endpoints. swap exchanges adjacent tiles. rotate shifts the selected segment by one step in dir. mirror reverses the segment. insertWild adds a wildcard at at and spends one wild. remove removes tileId and spends one remove. Locked tiles cannot be swapped, removed, or included in segments. Sticky matching mirrored tiles bond; swapping a bonded tile also swaps its mirrored partner. All listed choices are legal; choose one ID. No undo/reset. Never invent an action.';

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid Ollama JSON object');
  return value as Record<string, unknown>;
}
export class Ollama {
  private readonly base: string;
  private digest?: string;
  constructor(base: string, private readonly model: string, private readonly timeoutMs: number) {
    const url = new URL(base);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username !== '' || url.password !== '' || url.pathname !== '/' || url.search !== '' || url.hash !== '') throw new Error('Only local HTTP Ollama origins without credentials are allowed');
    if (model.trim() === '' || !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000) throw new Error('Invalid model or timeout');
    this.base = url.origin;
  }
  private async bounded<T>(parent: AbortSignal | undefined, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const cancel = (): void => controller.abort(parent?.reason);
    if (parent?.aborted === true) cancel();
    parent?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Ollama timeout')), this.timeoutMs);
    try { controller.signal.throwIfAborted(); return await operation(controller.signal); }
    finally { clearTimeout(timer); parent?.removeEventListener('abort', cancel); }
  }
  private async verify(signal: AbortSignal): Promise<string> {
    const response = await fetch(`${this.base}/api/tags`, { signal, redirect: 'error' });
    if (!response.ok) throw new Error(`Ollama tags HTTP ${response.status}`);
    const models = object(await response.json())['models'];
    if (!Array.isArray(models)) throw new Error('Invalid Ollama model inventory');
    const model = models.map(object).find(m => m['name'] === this.model);
    const digest = model?.['digest'];
    if (typeof digest !== 'string' || digest.length === 0) throw new Error(`Local model missing: ${this.model}`);
    if (this.digest !== undefined && this.digest !== digest) throw new Error('Ollama model digest changed');
    this.digest = digest;
    return digest;
  }
  identify(): Promise<string> { return this.bounded(undefined, signal => this.verify(signal)); }
  private async chat(key: string, schema: object, system: string, input: unknown, parent: AbortSignal): Promise<string> {
    return this.bounded(parent, async signal => {
      await this.verify(signal);
      const response = await fetch(`${this.base}/api/chat`, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, stream: false, think: false,
          messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(input) }],
          format: { type: 'object', properties: { [key]: schema }, required: [key], additionalProperties: false },
          options: { temperature: 0, seed: 20260926, num_ctx: 4096, num_predict: key === 'policy' ? 256 : 32 },
        }),
      });
      if (!response.ok) throw new Error(`Ollama chat HTTP ${response.status}`);
      const content = object(object(await response.json())['message'])['content'];
      if (typeof content !== 'string') throw new Error('Missing Ollama content');
      const parsed = object(JSON.parse(content));
      if (Object.keys(parsed).length !== 1 || typeof parsed[key] !== 'string' || parsed[key].trim() === '') throw new Error('Invalid Ollama JSON fields');
      return parsed[key];
    });
  }
  async choose(request: Request, signal: AbortSignal): Promise<string> {
    const choices = request.choices.map(c => c.id);
    const choice = await this.chat('choice', { type: 'string', enum: choices }, `${RULES} Return JSON {"choice":"id"}.`, request, signal);
    if (!choices.includes(choice)) throw new Error(`Invalid model choice: ${choice}`);
    return choice;
  }
  async propose(policy: string, evidence: string, signal: AbortSignal): Promise<string> {
    const candidate = await this.chat('policy', { type: 'string', minLength: 1, maxLength: 500 }, `${RULES} From completed training games suggest one general strategy, at most 500 characters. Do not claim improvement; separate games will evaluate it. Return JSON {"policy":"strategy"}.`, { policy, evidence }, signal);
    if (candidate.length > 500) throw new Error('Policy exceeds length limit');
    return candidate;
  }
}
