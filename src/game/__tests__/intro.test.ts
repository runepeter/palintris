import { describe, expect, it } from 'vitest';
import type { Command } from '../../core/commands';
import type { IntroMechanic } from '../intro';
import { INTROS, introFor, introSatisfiedBy } from '../intro';

const CMD: Readonly<Record<string, Command>> = {
  swap: { type: 'swap', a: 0, b: 1 },
  rotate: { type: 'rotate', from: 0, to: 2, dir: 'left' },
  mirror: { type: 'mirror', from: 0, to: 2 },
  insertWild: { type: 'insertWild', at: 1 },
  remove: { type: 'remove', tileId: 3 },
  undo: { type: 'undo' },
  reset: { type: 'reset' },
};

const spec = (mechanic: IntroMechanic) => {
  const found = INTROS.find((s) => s.mechanic === mechanic);
  if (found === undefined) throw new Error(`mangler intro for ${mechanic}`);
  return found;
};

describe('INTROS', () => {
  it('dekker de seks mekanikkene med unike nivå-id-er', () => {
    expect(INTROS.map((s) => s.mechanic)).toEqual(['swap', 'rotate', 'mirror', 'locked', 'wild', 'remove']);
    expect(INTROS.map((s) => s.id)).toEqual(['w1-01', 'w2-01', 'w3-01', 'w4-01', 'w5-01', 'w5-02']);
    expect(new Set(INTROS.map((s) => s.id)).size).toBe(INTROS.length);
  });

  it('har tittel og tekst på alle', () => {
    for (const s of INTROS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
    }
  });
});

describe('introFor', () => {
  it('finner introen for nivåene som har en', () => {
    expect(introFor('w1-01')?.mechanic).toBe('swap');
    expect(introFor('w2-01')?.mechanic).toBe('rotate');
    expect(introFor('w3-01')?.mechanic).toBe('mirror');
    expect(introFor('w4-01')?.mechanic).toBe('locked');
    expect(introFor('w5-01')?.mechanic).toBe('wild');
    expect(introFor('w5-02')?.mechanic).toBe('remove');
  });

  it('gir null for nivåer uten intro', () => {
    expect(introFor('w1-02')).toBeNull();
    expect(introFor('w3-02')).toBeNull();
    expect(introFor('')).toBeNull();
    expect(introFor('daily-2026-09-08')).toBeNull();
  });
});

describe('introSatisfiedBy', () => {
  it('bytte krever en swap', () => {
    expect(introSatisfiedBy(spec('swap'), CMD['swap']!)).toBe(true);
    expect(introSatisfiedBy(spec('swap'), CMD['rotate']!)).toBe(false);
    expect(introSatisfiedBy(spec('swap'), CMD['undo']!)).toBe(false);
  });

  it('rotasjon krever en rotate', () => {
    expect(introSatisfiedBy(spec('rotate'), CMD['rotate']!)).toBe(true);
    expect(introSatisfiedBy(spec('rotate'), CMD['mirror']!)).toBe(false);
  });

  it('speiling krever en mirror', () => {
    expect(introSatisfiedBy(spec('mirror'), CMD['mirror']!)).toBe(true);
    expect(introSatisfiedBy(spec('mirror'), CMD['rotate']!)).toBe(false);
  });

  it('joker krever en insertWild', () => {
    expect(introSatisfiedBy(spec('wild'), CMD['insertWild']!)).toBe(true);
    expect(introSatisfiedBy(spec('wild'), CMD['remove']!)).toBe(false);
  });

  it('fjerning krever en remove', () => {
    expect(introSatisfiedBy(spec('remove'), CMD['remove']!)).toBe(true);
    expect(introSatisfiedBy(spec('remove'), CMD['insertWild']!)).toBe(false);
  });

  it('låste brikker godtar hvilken som helst godtatt kommando', () => {
    for (const cmd of Object.values(CMD)) {
      expect(introSatisfiedBy(spec('locked'), cmd)).toBe(true);
    }
  });
});
