import type { Treatment } from './types';

export type Variant =
  | 'single'
  | 'pair'
  | 'lead-stack'
  | 'lead-grid'
  | 'lead-cards-list'
  | 'trio'
  | 'grid'
  | 'grid-list'
  | 'list';

/** Chooses a segment block layout from its treatment and item count (spec §7 table). */
export function variantFor(treatment: Treatment, count: number): Variant {
  if (count <= 1) return 'single';
  switch (treatment) {
    case 'standard':
      if (count === 2) return 'pair';
      if (count === 3) return 'lead-stack';
      if (count <= 6) return 'lead-grid';
      return 'lead-cards-list';
    case 'opinion':
      if (count === 2) return 'pair';
      if (count === 3) return 'trio';
      if (count <= 6) return 'grid';
      return 'grid-list';
    default:
      return 'list';
  }
}
