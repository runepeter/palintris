import { writeFileSync } from 'node:fs';
import { BUILD_ATTEMPTS, CONTENT_VERSION, INTRO_LEVELS, rampedRecipe, WORLD_RECIPES } from '../src/content/recipes';
import type { IntroOf, Level, Recipe } from '../src/core/level';
import { makeLevel } from '../src/core/level';
import { levelId, LEVELS_PER_WORLD } from '../src/core/progression';
import { symbolKey } from '../src/core/tiles';

const levels: Level[] = [];

/** Intro-nivåer holdes så korte som mulig: prøv lengdene fra oppskriftens minimum og oppover. */
const makeIntroLevel = (recipe: Recipe, id: string, keys: readonly string[], introOf: IntroOf): Level | null => {
  for (let len = recipe.lengthRange[0]; len <= recipe.lengthRange[1]; len++) {
    const pinned: Recipe = { ...recipe, lengthRange: [len, len] };
    const level = makeLevel(pinned, {
      id,
      contentVersion: CONTENT_VERSION,
      previousKeys: keys,
      introOf,
      attempts: BUILD_ATTEMPTS,
      requireExact: true,
    });
    if (level !== null) return level;
  }
  return null;
};

WORLD_RECIPES.forEach((recipe, wi) => {
  const world = wi + 1;
  const keys: string[] = [];
  for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
    const id = levelId(world, n);
    const introOf = INTRO_LEVELS[id];
    const ramped = rampedRecipe(recipe, n);
    const level = introOf === undefined
      ? makeLevel(ramped, { id, contentVersion: CONTENT_VERSION, previousKeys: keys, attempts: BUILD_ATTEMPTS, requireExact: true })
      : makeIntroLevel(ramped, id, keys, introOf);
    if (level === null) {
      console.error(`Kunne ikke generere ${id}`);
      process.exit(1);
    }
    keys.push(symbolKey(level.tiles));
    levels.push(level);
    console.log(`${id} ${symbolKey(level.tiles).padEnd(14)} mål=${level.target}${level.targetExact ? ' ' : '~'} budsjett=${level.budget}`);
  }
});

const out = `src/content/campaign.v${CONTENT_VERSION}.json`;
writeFileSync(out, `${JSON.stringify({ contentVersion: CONTENT_VERSION, levels }, null, 2)}\n`);
console.log(`Skrev ${levels.length} nivåer til ${out}`);
