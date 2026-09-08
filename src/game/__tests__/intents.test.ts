import { describe, expect, it } from 'vitest';
import { tilesFromString } from '../../core/tiles';
import { intentToCommand } from '../intents';

const tiles = tilesFromString('ABC');

describe('intentToCommand', () => {
  it('swap går rett gjennom', () => {
    expect(intentToCommand({ type: 'swap', a: 1, b: 2 }, tiles)).toEqual({ type: 'swap', a: 1, b: 2 });
  });

  it('remove slår indeks opp til brikke-id', () => {
    expect(intentToCommand({ type: 'remove', index: 1 }, tiles)).toEqual({ type: 'remove', tileId: 1 });
    expect(intentToCommand({ type: 'remove', index: 9 }, tiles)).toBeNull();
  });

  it('insertWild går rett gjennom', () => {
    expect(intentToCommand({ type: 'insertWild', at: 3 }, tiles)).toEqual({ type: 'insertWild', at: 3 });
  });

  it('segment blir rotate med retning eller mirror', () => {
    expect(intentToCommand({ type: 'segment', from: 0, to: 2, action: 'rotateLeft' }, tiles)).toEqual({
      type: 'rotate',
      from: 0,
      to: 2,
      dir: 'left',
    });
    expect(intentToCommand({ type: 'segment', from: 0, to: 2, action: 'rotateRight' }, tiles)).toEqual({
      type: 'rotate',
      from: 0,
      to: 2,
      dir: 'right',
    });
    expect(intentToCommand({ type: 'segment', from: 0, to: 2, action: 'mirror' }, tiles)).toEqual({
      type: 'mirror',
      from: 0,
      to: 2,
    });
  });

  it('hint gir ingen kommando', () => {
    expect(intentToCommand({ type: 'hint', reason: 'locked' }, tiles)).toBeNull();
  });
});
