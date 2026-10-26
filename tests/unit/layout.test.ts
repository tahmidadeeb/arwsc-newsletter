import { describe, expect, it } from 'vitest';
import { variantFor } from '../../src/lib/layout';

describe('variantFor', () => {
  it('maps standard counts per the spec table', () => {
    const got = [1, 2, 3, 4, 5, 6, 7, 12].map((c) => variantFor('standard', c));
    expect(got).toEqual([
      'single', 'pair', 'lead-stack', 'lead-grid', 'lead-grid', 'lead-grid',
      'lead-cards-list', 'lead-cards-list',
    ]);
  });
  it('maps opinion counts per the spec table', () => {
    const got = [1, 2, 3, 4, 6, 7].map((c) => variantFor('opinion', c));
    expect(got).toEqual(['single', 'pair', 'trio', 'grid', 'grid', 'grid-list']);
  });
  it('uses single then list for frontier and notice', () => {
    expect(variantFor('frontier', 1)).toBe('single');
    expect(variantFor('frontier', 30)).toBe('list');
    expect(variantFor('notice', 2)).toBe('list');
  });
  it('treats zero as single (callers render nothing for empty segments)', () => {
    expect(variantFor('standard', 0)).toBe('single');
  });
});
