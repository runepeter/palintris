# Palintris

A palindrome puzzle game built with Phaser 3 and TypeScript.

## Gameplay

Transform sequences into palindromes using various operations:

- **Swap**: Exchange two adjacent symbols
- **Rotate**: Shift a section of symbols left or right
- **Mirror**: Reverse a section of symbols
- **Insert**: Add a new symbol (unlocks in hard levels)
- **Delete**: Remove a symbol (unlocks in hard levels)
- **Replace**: Change a symbol to another (unlocks in expert levels)

## Features

- 50 handcrafted levels across 5 difficulty tiers
- Multiple symbol categories: letters, numbers, shapes, colors
- Time-based and operation-limited challenges
- Score system with bonus objectives
- Achievement system
- Progress saving with localStorage

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is configured for Vercel deployment. Push to your repository and connect to Vercel for automatic deployments.

## Controls

- Click tiles to select them
- Select operation from the bottom panel
- Keyboard shortcuts:
  - `1-6`: Select operations
  - `Z`: Undo last move
  - `R`: Reset level
  - `ESC`: Clear selection

## Tech Stack

- Phaser 3 - Game framework
- TypeScript - Type safety
- Vite - Build tool
- Vercel - Deployment
