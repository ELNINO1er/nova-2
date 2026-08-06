import { describe, expect, it } from 'vitest';
import { isValidCiPhone, normalizeCiPhone } from '../utils/phone.js';

describe('normalizeCiPhone', () => {
  it.each([
    ['07 49 15 77 41', '0749157741'],
    ['+225 07 49 15 77 41', '0749157741'],
    ['00225 07 49 15 77 41', '0749157741'],
  ])('normalise %s', (input, expected) => {
    expect(normalizeCiPhone(input)).toBe(expected);
  });

  it('valide exactement dix chiffres locaux', () => {
    expect(isValidCiPhone('+2250749157741')).toBe(true);
    expect(isValidCiPhone('+225749157741')).toBe(false);
  });
});
