/**
 * Level validation script
 * Checks if all levels have potential solutions
 */

import { LEVELS } from '../src/config/levels';
import { isPalindrome } from '../src/utils/palindrome';

interface ValidationResult {
  levelId: number;
  name: string;
  isAlreadyPalindrome: boolean;
  canBePalindrome: boolean;
  issues: string[];
}

function canBecomePalindrome(sequence: string[], allowedOps: string[]): { possible: boolean; reason: string } {
  // A sequence can become a palindrome if:
  // 1. It's already a palindrome
  // 2. With allowed operations, we can make it one

  if (isPalindrome(sequence)) {
    return { possible: true, reason: 'Already a palindrome' };
  }

  const symbolCounts = new Map<string, number>();
  for (const s of sequence) {
    symbolCounts.set(s, (symbolCounts.get(s) || 0) + 1);
  }

  // For a palindrome, at most one symbol can have an odd count
  let oddCount = 0;
  for (const count of symbolCounts.values()) {
    if (count % 2 === 1) oddCount++;
  }

  // With insert/delete/replace, we can always make it work
  if (allowedOps.includes('insert') || allowedOps.includes('delete') || allowedOps.includes('replace')) {
    return { possible: true, reason: 'Can use insert/delete/replace to fix' };
  }

  // With only swap/rotate/mirror, we need the character counts to be valid
  if (oddCount > 1) {
    // Can't make a palindrome without insert/delete/replace
    return {
      possible: false,
      reason: `Has ${oddCount} symbols with odd counts, but no insert/delete/replace allowed`
    };
  }

  // Check if the sequence has the right characters on both ends
  // With swap/rotate/mirror, characters can be rearranged
  return { possible: true, reason: 'Characters can be rearranged to form palindrome' };
}

function validateLevels(): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const level of LEVELS) {
    const isAlreadyPalindrome = isPalindrome(level.sequence);
    const canBe = canBecomePalindrome(level.sequence, level.allowedOperations);

    const issues: string[] = [];

    if (!canBe.possible) {
      issues.push(canBe.reason);
    }

    if (isAlreadyPalindrome) {
      // This is actually fine - the player just needs to recognize it
      // But let's note it for review
      // issues.push('Sequence is already a palindrome');
    }

    // Check if max operations is reasonable
    if (level.maxOperations < 1) {
      issues.push('Max operations is less than 1');
    }

    results.push({
      levelId: level.id,
      name: level.name,
      isAlreadyPalindrome,
      canBePalindrome: canBe.possible,
      issues,
    });
  }

  return results;
}

// Run validation
const results = validateLevels();

console.log('\n=== Level Validation Report ===\n');

const problemLevels = results.filter(r => r.issues.length > 0);
const alreadyPalindromes = results.filter(r => r.isAlreadyPalindrome);

if (problemLevels.length === 0) {
  console.log('✅ All levels are valid and can be solved!\n');
} else {
  console.log(`❌ Found ${problemLevels.length} levels with issues:\n`);
  for (const level of problemLevels) {
    console.log(`Level ${level.levelId}: ${level.name}`);
    for (const issue of level.issues) {
      console.log(`  - ${issue}`);
    }
    console.log();
  }
}

console.log(`📊 Summary:`);
console.log(`  - Total levels: ${results.length}`);
console.log(`  - Already palindromes: ${alreadyPalindromes.length}`);
console.log(`  - Problem levels: ${problemLevels.length}`);
console.log();
