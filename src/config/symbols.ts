import type { Symbol, SymbolCategory } from '../types';
import { COLORS } from './gameConfig';

// Sprite color assignments for letters (cycle through colors)
const LETTER_SPRITE_COLORS = ['blue', 'red', 'green', 'yellow', 'orange', 'pink'] as const;
const NUMBER_SPRITE_COLORS = ['yellow', 'orange', 'red', 'green', 'blue', 'pink', 'grey', 'black', 'red', 'green'] as const;

// Letter symbols (A-Z) with colored circle sprites
const createLetterSymbols = (): Symbol[] => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return letters.map((letter, i) => ({
    id: `letter_${letter}`,
    display: letter,
    category: 'letters' as SymbolCategory,
    color: COLORS.symbols.letters,
    sprite: `tile_${LETTER_SPRITE_COLORS[i % LETTER_SPRITE_COLORS.length]}_circle`,
  }));
};

// Number symbols (0-9) with colored square sprites
const createNumberSymbols = (): Symbol[] => {
  const numbers = '0123456789'.split('');
  return numbers.map((num, i) => ({
    id: `number_${num}`,
    display: num,
    category: 'numbers' as SymbolCategory,
    color: COLORS.symbols.numbers,
    sprite: `tile_${NUMBER_SPRITE_COLORS[i]}_square`,
  }));
};

// Shape symbols with dedicated sprites
const createShapeSymbols = (): Symbol[] => {
  const shapes = [
    { display: '●', id: 'circle', shape: 'circle', tileColor: 'blue' },
    { display: '■', id: 'square', shape: 'square', tileColor: 'red' },
    { display: '▲', id: 'triangle', shape: 'triangle', tileColor: 'green' },
    { display: '◆', id: 'diamond', shape: 'diamond', tileColor: 'yellow' },
    { display: '★', id: 'star', shape: 'star', tileColor: 'orange' },
    { display: '♥', id: 'heart', shape: 'heart', tileColor: 'pink' },
    { display: '⬡', id: 'hexagon', shape: 'hexagon', tileColor: 'grey' },
  ];
  return shapes.map((shape) => ({
    id: `shape_${shape.id}`,
    display: shape.display,
    category: 'shapes' as SymbolCategory,
    color: COLORS.symbols.shapes,
    sprite: `tile_${shape.tileColor}_${shape.shape}`,
  }));
};

// Color block symbols with colored sprites
const createColorSymbols = (): Symbol[] => {
  const colors = [
    { display: 'R', id: 'red', color: 0xff4444, tileColor: 'red', shape: 'diamond' },
    { display: 'G', id: 'green', color: 0x44ff44, tileColor: 'green', shape: 'diamond' },
    { display: 'B', id: 'blue', color: 0x4444ff, tileColor: 'blue', shape: 'diamond' },
    { display: 'Y', id: 'yellow', color: 0xffff44, tileColor: 'yellow', shape: 'diamond' },
    { display: 'P', id: 'purple', color: 0xff44ff, tileColor: 'pink', shape: 'diamond' },
    { display: 'O', id: 'orange', color: 0xff8844, tileColor: 'orange', shape: 'diamond' },
    { display: 'C', id: 'cyan', color: 0x44ffff, tileColor: 'blue', shape: 'hexagon' },
    { display: 'W', id: 'white', color: 0xffffff, tileColor: 'grey', shape: 'diamond' },
  ];
  return colors.map((c) => ({
    id: `color_${c.id}`,
    display: c.display,
    category: 'colors' as SymbolCategory,
    color: c.color,
    sprite: `tile_${c.tileColor}_${c.shape}`,
  }));
};

// All symbols organized by category
export const SYMBOLS: Record<SymbolCategory, Symbol[]> = {
  letters: createLetterSymbols(),
  numbers: createNumberSymbols(),
  shapes: createShapeSymbols(),
  colors: createColorSymbols(),
  mixed: [], // Will be populated below
};

// Mixed category contains a selection from all categories
SYMBOLS.mixed = [
  ...SYMBOLS.letters.slice(0, 8),   // A-H
  ...SYMBOLS.numbers.slice(0, 5),   // 0-4
  ...SYMBOLS.shapes.slice(0, 5),    // First 5 shapes
  ...SYMBOLS.colors.slice(0, 4),    // First 4 colors
];

// Helper function to get a symbol by its display character
export const getSymbolByDisplay = (
  display: string,
  category?: SymbolCategory
): Symbol | undefined => {
  if (category !== undefined) {
    return SYMBOLS[category].find((s) => s.display === display);
  }

  for (const cat of Object.values(SYMBOLS)) {
    const found = cat.find((s) => s.display === display);
    if (found !== undefined) return found;
  }
  return undefined;
};

// Helper function to get a symbol by its ID
export const getSymbolById = (id: string): Symbol | undefined => {
  for (const cat of Object.values(SYMBOLS)) {
    const found = cat.find((s) => s.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
};

// Get random symbols from a category
export const getRandomSymbols = (
  category: SymbolCategory,
  count: number
): Symbol[] => {
  const available = [...SYMBOLS[category]];
  const result: Symbol[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(Math.random() * available.length);
    const symbol = available[index];
    if (symbol !== undefined) {
      result.push(symbol);
      available.splice(index, 1);
    }
  }

  return result;
};

// Get sprite key for a symbol - used by Tile component
export const getSpriteForSymbol = (symbol: Symbol): string | undefined => {
  return symbol.sprite;
};
