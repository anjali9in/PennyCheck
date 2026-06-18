/// <reference types="jest" />

import { addMinor, formatMinorAmount, parseAmountToMinor } from './money';

describe('money utilities', () => {
  it('parses decimal currency into minor units without floats', () => {
    expect(parseAmountToMinor('1,234.50')).toBe('123450');
    expect(parseAmountToMinor('99')).toBe('9900');
  });

  it('formats and adds minor units', () => {
    expect(addMinor('100', '250')).toBe('350');
    expect(formatMinorAmount('-350', 'INR')).toBe('-INR 3.50');
  });
});
