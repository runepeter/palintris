import { describe, expect, it } from 'vitest';
import { makeRules } from '../../core/rules';
import { operationSummary, segmentOptions } from '../operations';

describe('operation guidance', () => {
  it('viser ingen segmentvalg på brett med bare nabobytte', () => {
    const rules = makeRules(['swap']);

    expect(segmentOptions(rules.allowedOps, 4)).toEqual([]);
    expect(operationSummary(rules.allowedOps)).toBe('Tillatt: Bytt naboer');
  });

  it('viser begge rotasjonsretninger når rotasjon er tillatt', () => {
    const rules = makeRules(['swap', 'rotate']);

    expect(segmentOptions(rules.allowedOps, 2)).toEqual([
      { action: 'rotateLeft', enabled: true },
      { action: 'rotateRight', enabled: true },
    ]);
    expect(operationSummary(rules.allowedOps)).toBe('Tillatt: Bytt · Roter');
  });

  it('viser speil som deaktivert med færre enn tre brikker', () => {
    const rules = makeRules(['swap', 'rotate', 'mirror']);

    expect(segmentOptions(rules.allowedOps, 2)).toContainEqual({ action: 'mirror', enabled: false });
    expect(segmentOptions(rules.allowedOps, 3)).toContainEqual({ action: 'mirror', enabled: true });
    expect(operationSummary(rules.allowedOps)).toBe('Tillatt: Bytt · Roter · Speil');
  });
});
