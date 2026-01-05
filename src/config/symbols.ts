import type { Symbol, SymbolCategory } from '../types';
import { COLORS } from './gameConfig';

// Letter symbols (A-Z)
const createLetterSymbols = (): Symbol[] => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return letters.map((letter) => ({
    id: `letter_${letter}`,
    display: letter,
    category: 'letters' as SymbolCategory,
    color: COLORS.symbols.letters,
  }));
};

// Number symbols (0-9)
const createNumberSymbols = (): Symbol[] => {
  const numbers = '0123456789'.split('');
  return numbers.map((num) => ({
    id: `number_${num}`,
    display: num,
    category: 'numbers' as SymbolCategory,
    color: COLORS.symbols.numbers,
  }));
};

// Shape symbols
const createShapeSymbols = (): Symbol[] => {
  const shapes = [
    { display: '●', id: 'circle' },
    { display: '■', id: 'square' },
    { display: '▲', id: 'triangle' },
    { display: '◆', id: 'diamond' },
    { display: '★', id: 'star' },
    { display: '♥', id: 'heart' },
    { display: '♦', id: 'club' },
    { display: '♠', id: 'spade' },
    { display: '✦', id: 'sparkle' },
    { display: '⬡', id: 'hexagon' },
  ];
  return shapes.map((shape) => ({
    id: `shape_${shape.id}`,
    display: shape.display,
    category: 'shapes' as SymbolCategory,
    color: COLORS.symbols.shapes,
  }));
};

// Color block symbols (represented by colored squares with labels)
const createColorSymbols = (): Symbol[] => {
  const colors = [
    { display: 'R', id: 'red', color: 0xff4444 },
    { display: 'G', id: 'green', color: 0x44ff44 },
    { display: 'B', id: 'blue', color: 0x4444ff },
    { display: 'Y', id: 'yellow', color: 0xffff44 },
    { display: 'P', id: 'purple', color: 0xff44ff },
    { display: 'O', id: 'orange', color: 0xff8844 },
    { display: 'C', id: 'cyan', color: 0x44ffff },
    { display: 'W', id: 'white', color: 0xffffff },
  ];
  return colors.map((c) => ({
    id: `color_${c.id}`,
    display: c.display,
    category: 'colors' as SymbolCategory,
    color: c.color,
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
