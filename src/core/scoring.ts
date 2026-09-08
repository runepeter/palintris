export type Stars = 0 | 1 | 2 | 3;

export const budgetFor = (target: number, slack: number): number => target + slack;

export const starsFor = (movesUsed: number, target: number, budget: number): Stars => {
  if (movesUsed > budget) return 0;
  if (movesUsed <= target) return 3;
  if (movesUsed <= target + 2) return 2;
  return 1;
};
