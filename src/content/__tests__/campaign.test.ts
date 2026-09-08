import { describe, expect, it } from 'vitest';
import { CAMPAIGN, getCampaignLevel } from '../campaign';
import { BUILD_ATTEMPTS, CONTENT_VERSION, INTRO_LEVELS, rampedRecipe, WORLD_RECIPES } from '../recipes';
import { validateSolution } from '../../core/generator';
import { makeLevel, rulesFor } from '../../core/level';
import { isPalindrome } from '../../core/palindrome';
import { levelId, LEVELS_PER_WORLD, WORLD_COUNT } from '../../core/progression';
import { MAX_LENGTH, MIN_LENGTH } from '../../core/rules';
import { symbolKey } from '../../core/tiles';

describe('campaign.v1.json', () => {
  it('har 90 nivåer i riktig rekkefølge', () => {
    expect(CAMPAIGN.contentVersion).toBe(CONTENT_VERSION);
    expect(CAMPAIGN.levels).toHaveLength(WORLD_COUNT * LEVELS_PER_WORLD);
    CAMPAIGN.levels.forEach((level, i) => {
      expect(level.id).toBe(levelId(Math.floor(i / LEVELS_PER_WORLD) + 1, (i % LEVELS_PER_WORLD) + 1));
    });
  });

  it('hvert nivå er løsbart med lagret løsning og innenfor grensene', () => {
    for (const level of CAMPAIGN.levels) {
      expect(isPalindrome(level.tiles), level.id).toBe(false);
      expect(level.tiles.length, level.id).toBeGreaterThanOrEqual(MIN_LENGTH);
      expect(level.tiles.length, level.id).toBeLessThanOrEqual(MAX_LENGTH);
      expect(validateSolution(rulesFor(level), level), level.id).toBe(true);
      expect(level.targetExact, level.id).toBe(true);
      const recipe = WORLD_RECIPES.find((r) => r.id === level.recipeId);
      expect(recipe, level.id).toBeDefined();
      if (recipe !== undefined) {
        expect(level.budget, level.id).toBe(level.target + recipe.slack);
        expect(level.target, level.id).toBeGreaterThanOrEqual(recipe.movesRange[0]);
        expect(level.target, level.id).toBeLessThanOrEqual(recipe.movesRange[1]);
      }
    }
  });

  it('ingen duplikater innen en verden', () => {
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const keys = CAMPAIGN.levels.filter((l) => l.recipeId === `w${world}`).map((l) => symbolKey(l.tiles));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('intro-nivåer finnes og har mekanikken', () => {
    for (const id of Object.keys(INTRO_LEVELS)) {
      expect(getCampaignLevel(id)).toBeDefined();
    }
    expect(getCampaignLevel('w4-01')?.tiles.some((t) => t.locked)).toBe(true);
    expect(getCampaignLevel('w5-01')?.solution.some((m) => m.type === 'insertWild')).toBe(true);
  });

  it('mål stiger innen hver verden', () => {
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const first = getCampaignLevel(levelId(world, 1));
      const last = getCampaignLevel(levelId(world, LEVELS_PER_WORLD));
      expect(first, `w${world}`).toBeDefined();
      expect(last, `w${world}`).toBeDefined();
      if (first === undefined || last === undefined) continue;
      expect(last.target, `w${world}`).toBeGreaterThan(first.target);
    }
  });

  it('w1-01 viser et synlig nabobytte som løser brettet på ett trekk', () => {
    const level = getCampaignLevel('w1-01');
    expect(level).toBeDefined();
    if (level === undefined) return;
    expect(symbolKey(level.tiles)).toBe('ABAB');
    expect(level.solution).toEqual([{ type: 'swap', a: 2, b: 3 }]);
    expect(level.tiles[2]?.symbol).not.toBe(level.tiles[3]?.symbol);
    expect(level.target).toBe(1);
    expect(validateSolution(rulesFor(level), level)).toBe(true);
  });

  // Verden 6 utelates: nivåene der koster flere sekunder hver å regenerere.
  it.each([1, 2, 3, 4, 5])('w%i-03 kan regenereres identisk fra oppskrift', (world) => {
    const recipe = WORLD_RECIPES[world - 1];
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    const previousKeys = [1, 2].map((n) => symbolKey(getCampaignLevel(levelId(world, n))?.tiles ?? []));
    const level = makeLevel(rampedRecipe(recipe, 3), {
      id: levelId(world, 3),
      contentVersion: CONTENT_VERSION,
      previousKeys,
      attempts: BUILD_ATTEMPTS,
      requireExact: true,
    });
    expect(level).toEqual(getCampaignLevel(levelId(world, 3)));
  });
});
