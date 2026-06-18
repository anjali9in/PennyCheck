/// <reference types="jest" />

describe('budget math', () => {
  it('computes progress using minor units', () => {
    const spent = Number('800000');
    const budget = Number('1000000');

    expect(spent / budget).toBe(0.8);
  });
});
