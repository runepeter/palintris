import { describe, expect, it } from 'vitest';
import { tilesFromString } from '../../core/tiles';
import { blitzUrgency, campaignSummary, moveFeedback, resultPresentation } from '../feedback';

describe('game feedback', () => {
  it('teller speilpar og finner par som nettopp kom i harmoni', () => {
    const result = moveFeedback(tilesFromString('ABBAAC'), tilesFromString('ABCCBA'), 1);

    expect(result.harmony).toEqual({ matched: 3, total: 3 });
    expect(result.gained).toBe(3);
    expect(result.flow).toBe(2);
    expect(result.newMatchedIndexes).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('nullstiller flyt når trekket ikke forbedrer speilet', () => {
    const result = moveFeedback(tilesFromString('ABCA'), tilesFromString('ACBA'), 4);

    expect(result.gained).toBe(0);
    expect(result.flow).toBe(0);
    expect(result.newMatchedIndexes).toEqual([]);
  });

  it.each([
    [1, 'Speilet er åpnet'],
    [2, 'Strålende speiling'],
    [3, 'Perfekt harmoni'],
  ] as const)('gir %s stjerne(r) en prestasjonstittel', (stars, title) => {
    expect(resultPresentation(stars, stars - 1)).toMatchObject({ title, isPersonalBest: true });
  });

  it('kaller ikke samme stjerneresultat en ny rekord', () => {
    expect(resultPresentation(2, 2).isPersonalBest).toBe(false);
  });

  it('oppsummerer bare kampanjebrett og samlet stjernetall', () => {
    expect(campaignSummary({ 'w1-01': 3, 'w1-02': 2, 'daily-2026-09-08': 3 }, 7)).toEqual({
      solved: 2,
      total: 90,
      stars: 5,
      blitzBest: 7,
      hasProgress: true,
    });
  });

  it('markerer bare de siste ti sekundene i Blitz som kritiske', () => {
    expect(blitzUrgency(10_001)).toBe(false);
    expect(blitzUrgency(10_000)).toBe(true);
    expect(blitzUrgency(0)).toBe(true);
  });
});
