import { describe, expect, it } from 'vitest';
import { COLORS, cssColor, DURATION, durations, PATTERNS, symbolColor, symbolPattern, WORLD_ACCENTS, worldAccent } from '../theme';

describe('symbolColor', () => {
  it('gir seks ulike farger for A–F og sykler etter det', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map(symbolColor);
    expect(new Set(six).size).toBe(6);
    expect(symbolColor('G')).toBe(symbolColor('A'));
    expect(symbolColor('*')).toBe(COLORS.wild);
  });
});

describe('symbolPattern', () => {
  it('gir seks ulike mønstre for A–F og sykler etter det', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map(symbolPattern);
    expect(six).toEqual(PATTERNS);
    expect(new Set(six).size).toBe(6);
    expect(symbolPattern('G')).toBe(symbolPattern('A'));
    expect(symbolPattern('*')).toBe('rings');
  });
});

describe('worldAccent', () => {
  it('har seks aksenter og faller tilbake til første utenfor rekkevidde', () => {
    expect(WORLD_ACCENTS).toHaveLength(6);
    expect(worldAccent(3)).toBe(WORLD_ACCENTS[2]);
    expect(worldAccent(0)).toBe(WORLD_ACCENTS[0]);
    expect(worldAccent(9)).toBe(WORLD_ACCENTS[0]);
  });
});

describe('durations', () => {
  it('redusert bevegelse setter alt til snapp', () => {
    expect(durations(false)).toEqual(DURATION);
    expect(durations(true)).toEqual({ snap: 120, normal: 120, calm: 120, ceremony: 120 });
  });
});

describe('cssColor', () => {
  it('formaterer med seks hex-siffer', () => {
    expect(cssColor(0xff6b6b)).toBe('#ff6b6b');
    expect(cssColor(0x000fff)).toBe('#000fff');
  });
});
