import type { TestHook } from './hookTypes';

export type { ScreenPoint, TestHook } from './hookTypes';

export const installHook = (hook: TestHook): void => {
  if (import.meta.env.DEV) window.__palintris = hook;
};

export const removeHook = (): void => {
  if (import.meta.env.DEV) delete window.__palintris;
};
