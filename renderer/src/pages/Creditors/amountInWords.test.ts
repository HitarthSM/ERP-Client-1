import { describe, expect, it } from 'vitest';
import { amountInWords } from './amountInWords';

describe('amountInWords', () => {
  it('writes the sample current-balance wording', () => {
    expect(amountInWords(192_240)).toBe('One Hundred Ninety-Two Thousand Two Hundred Forty Only');
  });

  it('writes zero', () => {
    expect(amountInWords(0)).toBe('Zero Only');
  });
});
