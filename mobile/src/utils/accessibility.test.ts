/// <reference types="jest" />

import { defaultHitSlop, formFieldLabel, minimumTouchTarget } from './accessibility';

describe('accessibility helpers', () => {
  it('keeps controls at mobile minimum target size', () => {
    expect(minimumTouchTarget).toBeGreaterThanOrEqual(44);
    expect(defaultHitSlop.top).toBeGreaterThan(0);
  });

  it('marks required form labels for screen readers', () => {
    expect(formFieldLabel('Amount', true)).toBe('Amount, required');
    expect(formFieldLabel('Notes')).toBe('Notes');
  });
});
