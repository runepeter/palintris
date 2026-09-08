import type { Command } from '../core/commands';
import type { Tile } from '../core/tiles';
import type { Intent } from './gestures';

/** Oversetter en gest-intensjon til en kjernekommando. Hint og ukjente indekser gir null. */
export const intentToCommand = (intent: Intent, tiles: readonly Tile[]): Command | null => {
  switch (intent.type) {
    case 'swap':
      return { type: 'swap', a: intent.a, b: intent.b };
    case 'remove': {
      const tile = tiles[intent.index];
      return tile === undefined ? null : { type: 'remove', tileId: tile.id };
    }
    case 'insertWild':
      return { type: 'insertWild', at: intent.at };
    case 'segment':
      if (intent.action === 'mirror') return { type: 'mirror', from: intent.from, to: intent.to };
      return { type: 'rotate', from: intent.from, to: intent.to, dir: intent.action === 'rotateLeft' ? 'left' : 'right' };
    case 'hint':
      return null;
  }
};
