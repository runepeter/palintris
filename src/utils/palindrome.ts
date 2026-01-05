/**
 * Core palindrome detection and manipulation utilities
 */

/**
 * Check if a sequence is a palindrome
 */
export const isPalindrome = (sequence: readonly string[]): boolean => {
  if (sequence.length === 0) return true;
  if (sequence.length === 1) return true;

  const len = sequence.length;
  for (let i = 0; i < Math.floor(len / 2); i++) {
    if (sequence[i] !== sequence[len - 1 - i]) {
      return false;
    }
  }
  return true;
};

/**
 * Find all palindromic subsequences in a sequence
 */
export const findPalindromicSubsequences = (
  sequence: readonly string[]
): Array<{ start: number; end: number; sequence: string[] }> => {
  const result: Array<{ start: number; end: number; sequence: string[] }> = [];

  // Check all possible subsequences of length >= 2
  for (let start = 0; start < sequence.length; start++) {
    for (let end = start + 1; end <= sequence.length; end++) {
      const subseq = sequence.slice(start, end);
      if (subseq.length >= 2 && isPalindrome(subseq)) {
        result.push({
          start,
          end: end - 1,
          sequence: [...subseq],
        });
      }
    }
  }

  return result;
};

/**
 * Calculate the minimum number of operations to make a sequence a palindrome
 * Using dynamic programming (edit distance variant)
 */
export const minOperationsToMakePalindrome = (
  sequence: readonly string[]
): number => {
  const n = sequence.length;
  if (n <= 1) return 0;

  // dp[i][j] = min operations to make sequence[i..j] a palindrome
  const dp: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0)
  );

  // Fill the dp table
  for (let gap = 1; gap < n; gap++) {
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      if (sequence[i] === sequence[j]) {
        dp[i]![j] = dp[i + 1]?.[j - 1] ?? 0;
      } else {
        const deleteLeft = (dp[i + 1]?.[j] ?? 0) + 1;
        const deleteRight = (dp[i]?.[j - 1] ?? 0) + 1;
        dp[i]![j] = Math.min(deleteLeft, deleteRight);
      }
    }
  }

  return dp[0]?.[n - 1] ?? 0;
};

/**
 * Get hints for making a sequence a palindrome
 */
export interface PalindromeHint {
  readonly position: number;
  readonly suggestion: 'swap' | 'change' | 'remove';
  readonly targetPosition?: number;
  readonly targetSymbol?: string;
}

export const getHints = (sequence: readonly string[]): PalindromeHint[] => {
  const hints: PalindromeHint[] = [];
  const n = sequence.length;

  if (n <= 1) return hints;

  // Find mismatched pairs
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const j = n - 1 - i;
    if (sequence[i] !== sequence[j]) {
      // Check if swapping adjacent elements helps
      const leftSwap = sequence[i + 1] === sequence[j];
      const rightSwap = sequence[j - 1] === sequence[i];

      if (leftSwap && i + 1 < j) {
        hints.push({
          position: i,
          suggestion: 'swap',
          targetPosition: i + 1,
        });
      } else if (rightSwap && j - 1 > i) {
        hints.push({
          position: j,
          suggestion: 'swap',
          targetPosition: j - 1,
        });
      } else {
        // Suggest changing one of the mismatched symbols
        const targetSym = sequence[j];
        if (targetSym !== undefined) {
          hints.push({
            position: i,
            suggestion: 'change',
            targetSymbol: targetSym,
          });
        }
      }
    }
  }

  return hints;
};

/**
 * Apply swap operation to a sequence
 */
export const applySwap = (
  sequence: readonly string[],
  pos1: number,
  pos2: number
): string[] => {
  const result = [...sequence];
  const temp = result[pos1];
  const val2 = result[pos2];

  if (temp !== undefined && val2 !== undefined) {
    result[pos1] = val2;
    result[pos2] = temp;
  }

  return result;
};

/**
 * Apply rotate operation to a sequence (or subsection)
 */
export const applyRotate = (
  sequence: readonly string[],
  start: number,
  end: number,
  direction: 'left' | 'right'
): string[] => {
  const result = [...sequence];
  const section = result.slice(start, end + 1);

  if (direction === 'left') {
    const first = section.shift();
    if (first !== undefined) {
      section.push(first);
    }
  } else {
    const last = section.pop();
    if (last !== undefined) {
      section.unshift(last);
    }
  }

  for (let i = 0; i < section.length; i++) {
    const val = section[i];
    if (val !== undefined) {
      result[start + i] = val;
    }
  }

  return result;
};

/**
 * Apply mirror operation around a pivot
 */
export const applyMirror = (
  sequence: readonly string[],
  start: number,
  end: number
): string[] => {
  const result = [...sequence];
  const section = result.slice(start, end + 1).reverse();

  for (let i = 0; i < section.length; i++) {
    const val = section[i];
    if (val !== undefined) {
      result[start + i] = val;
    }
  }

  return result;
};

/**
 * Apply insert operation
 */
export const applyInsert = (
  sequence: readonly string[],
  position: number,
  symbol: string
): string[] => {
  const result = [...sequence];
  result.splice(position, 0, symbol);
  return result;
};

/**
 * Apply delete operation
 */
export const applyDelete = (
  sequence: readonly string[],
  position: number
): string[] => {
  const result = [...sequence];
  result.splice(position, 1);
  return result;
};

/**
 * Apply replace operation
 */
export const applyReplace = (
  sequence: readonly string[],
  position: number,
  symbol: string
): string[] => {
  const result = [...sequence];
  result[position] = symbol;
  return result;
};

/**
 * Calculate similarity score between two sequences (0-1)
 */
export const calculateSimilarity = (
  seq1: readonly string[],
  seq2: readonly string[]
): number => {
  if (seq1.length === 0 && seq2.length === 0) return 1;
  if (seq1.length === 0 || seq2.length === 0) return 0;

  const maxLen = Math.max(seq1.length, seq2.length);
  let matches = 0;

  for (let i = 0; i < Math.min(seq1.length, seq2.length); i++) {
    if (seq1[i] === seq2[i]) {
      matches++;
    }
  }

  return matches / maxLen;
};

/**
 * Generate a random sequence that is NOT a palindrome
 */
export const generateNonPalindrome = (
  symbols: readonly string[],
  length: number
): string[] => {
  if (symbols.length < 2 || length < 2) {
    throw new Error('Need at least 2 symbols and length >= 2');
  }

  let result: string[];
  let attempts = 0;
  const maxAttempts = 100;

  do {
    result = [];
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * symbols.length);
      const symbol = symbols[idx];
      if (symbol !== undefined) {
        result.push(symbol);
      }
    }
    attempts++;
  } while (isPalindrome(result) && attempts < maxAttempts);

  // If we accidentally created a palindrome, break it
  if (isPalindrome(result) && result.length >= 2) {
    // Swap first two elements if they're the same as their mirrors
    const lastIdx = result.length - 1;
    if (result[0] === result[lastIdx]) {
      // Find a different symbol
      const differentSymbol = symbols.find((s) => s !== result[0]);
      if (differentSymbol !== undefined) {
        result[0] = differentSymbol;
      }
    }
  }

  return result;
};

/**
 * Generate a sequence that can become a palindrome with N operations
 */
export const generatePuzzleSequence = (
  targetPalindrome: readonly string[],
  numOperations: number
): string[] => {
  let result = [...targetPalindrome];

  // Apply random "reverse" operations to scramble it
  for (let i = 0; i < numOperations; i++) {
    const opType = Math.floor(Math.random() * 3);

    switch (opType) {
      case 0: {
        // Random swap
        const pos = Math.floor(Math.random() * (result.length - 1));
        result = applySwap(result, pos, pos + 1);
        break;
      }
      case 1: {
        // Random rotation of a section
        const start = Math.floor(Math.random() * (result.length - 2));
        const end = start + 2 + Math.floor(Math.random() * (result.length - start - 2));
        result = applyRotate(result, start, Math.min(end, result.length - 1), 'left');
        break;
      }
      case 2: {
        // Random section mirror
        const mStart = Math.floor(Math.random() * (result.length - 1));
        const mEnd = mStart + 1 + Math.floor(Math.random() * (result.length - mStart - 1));
        result = applyMirror(result, mStart, Math.min(mEnd, result.length - 1));
        break;
      }
    }
  }

  // Ensure it's not already a palindrome
  if (isPalindrome(result)) {
    // Do one more swap to break it
    if (result.length >= 2) {
      result = applySwap(result, 0, 1);
    }
  }

  return result;
};
