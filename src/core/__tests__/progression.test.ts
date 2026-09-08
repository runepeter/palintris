import { describe, expect, it } from 'vitest';
import { isLevelUnlocked, isWorldUnlocked, levelId, nextLevelId, parseLevelId, solvedInWorld } from '../progression';

const solvedWorld1 = (count: number): Record<string, number> =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => [levelId(1, i + 1), 1]));

describe('levelId', () => {
  it('formaterer med to siffer', () => {
    expect(levelId(3, 7)).toBe('w3-07');
    expect(levelId(6, 15)).toBe('w6-15');
  });
  it('parser tilbake', () => {
    expect(parseLevelId('w3-07')).toEqual({ world: 3, n: 7 });
    expect(parseLevelId('level7')).toBeNull();
    expect(parseLevelId('w7-01')).toBeNull();
    expect(parseLevelId('w1-16')).toBeNull();
  });
});

describe('opplåsing', () => {
  it('verden 1 er alltid åpen, w1-01 er åpen', () => {
    expect(isWorldUnlocked(1, {})).toBe(true);
    expect(isLevelUnlocked('w1-01', {})).toBe(true);
    expect(isLevelUnlocked('w1-02', {})).toBe(false);
  });
  it('neste nivå åpnes ved løst forrige', () => {
    expect(isLevelUnlocked('w1-02', { 'w1-01': 1 })).toBe(true);
    expect(isLevelUnlocked('w1-03', { 'w1-01': 3 })).toBe(false);
  });
  it('neste verden krever 12 løste', () => {
    expect(solvedInWorld(1, solvedWorld1(11))).toBe(11);
    expect(isWorldUnlocked(2, solvedWorld1(11))).toBe(false);
    expect(isWorldUnlocked(2, solvedWorld1(12))).toBe(true);
    expect(isLevelUnlocked('w2-01', solvedWorld1(12))).toBe(true);
    expect(isLevelUnlocked('w2-01', solvedWorld1(11))).toBe(false);
  });
  it('stjerner teller ikke som port, bare løst', () => {
    const stars = { ...solvedWorld1(12), 'w1-01': 3 };
    expect(isWorldUnlocked(2, stars)).toBe(true);
  });
});

describe('nextLevelId', () => {
  it('går til neste nivå og neste verden', () => {
    expect(nextLevelId('w1-01')).toBe('w1-02');
    expect(nextLevelId('w1-15')).toBe('w2-01');
    expect(nextLevelId('w6-15')).toBeNull();
    expect(nextLevelId('nope')).toBeNull();
  });
});
