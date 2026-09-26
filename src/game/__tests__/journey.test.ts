import { describe, expect, it } from 'vitest';
import { journeyComplete, journeyDestination, nextJourneyMilestone } from '../journey';

const solved = (world: number, count: number): Record<string, number> =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => [`w${world}-${String(i + 1).padStart(2, '0')}`, 1]));

describe('journeyDestination', () => {
  it('starts the journey at the first campaign board', () => {
    expect(journeyDestination({})).toBe('w1-01');
  });

  it('continues at the earliest accessible unsolved board in a partial world', () => {
    expect(journeyDestination(solved(1, 4))).toBe('w1-05');
  });

  it('enters the highest newly unlocked world before finishing the old one', () => {
    expect(journeyDestination(solved(1, 12))).toBe('w2-01');
  });

  it('does not send the player to a locked level when saved stars have gaps', () => {
    expect(journeyDestination({ ...solved(1, 12), 'w2-03': 3 })).toBe('w2-01');
  });

  it('replays the last board after the campaign is complete', () => {
    const all: Record<string, number> = {};
    for (let world = 1; world <= 6; world++) Object.assign(all, solved(world, 15));
    expect(journeyDestination(all)).toBe('w6-15');
  });

  it('returns to an accessible unfinished board when the highest world is complete', () => {
    const stars = { ...solved(1, 15), ...solved(2, 15), ...solved(3, 15), ...solved(4, 15), ...solved(5, 15), ...solved(6, 15) };
    delete stars['w2-15'];
    expect(journeyDestination(stars)).toBe('w2-15');
  });
});

describe('nextJourneyMilestone', () => {
  it('shows the real rotation unlock requirement and current count', () => {
    expect(nextJourneyMilestone(solved(1, 5))).toEqual({
      title: 'Neste: Roter en bit', detail: 'Verden 2 åpnes ved 12 av 15 speil i verden 1 · 5/12',
    });
  });

  it('shows an unlocked introduction without a fictional requirement', () => {
    expect(nextJourneyMilestone(solved(1, 12))).toEqual({
      title: 'Neste: Roter en bit', detail: 'Åpent nå · Verden 2, nivå 1',
    });
  });

  it('does not call an unfinished campaign complete after the last introduction', () => {
    const stars = { ...solved(1, 15), ...solved(2, 15), ...solved(3, 15), ...solved(4, 15), ...solved(5, 15), 'w6-01': 1 };
    expect(nextJourneyMilestone(stars)).toEqual({ title: 'Neste: Verden 6, nivå 2', detail: 'Alle mekanikker er åpnet. Fullfør neste speil.' });
  });
  it('names the actual remaining board when it lies in an earlier world', () => {
    const stars: Record<string, number> = {};
    for (let world = 1; world <= 6; world++) Object.assign(stars, solved(world, 15));
    delete stars['w2-15'];
    expect(nextJourneyMilestone(stars)).toEqual({ title: 'Neste: Verden 2, nivå 15', detail: 'Alle mekanikker er åpnet. Fullfør neste speil.' });
  });
});

describe('journeyComplete', () => {
  it('requires every campaign board before the lobby offers replay', () => {
    const stars: Record<string, number> = {};
    for (let world = 1; world <= 6; world++) Object.assign(stars, solved(world, 15));
    expect(journeyComplete(stars)).toBe(true);
    delete stars['w2-15'];
    expect(journeyComplete(stars)).toBe(false);
  });
});
