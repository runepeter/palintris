import { describe, expect, it } from 'vitest';
import { CAMPAIGN, getCampaignLevel } from '../campaign';
import { CONTENT_VERSION, INTRO_LEVELS, WORLD_RECIPES } from '../recipes';
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

  it('w1-01 kan regenereres identisk fra oppskrift', () => {
    const recipe = WORLD_RECIPES[0];
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    expect(makeLevel(recipe, { id: 'w1-01', contentVersion: CONTENT_VERSION, attempts: 400 })).toEqual(getCampaignLevel('w1-01'));
  });
});
