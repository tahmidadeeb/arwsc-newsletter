export type Treatment = 'standard' | 'opinion' | 'frontier' | 'notice';

export const TREATMENTS: readonly Treatment[] = ['standard', 'opinion', 'frontier', 'notice'];

export interface Segment {
  key: string;
  label: string;
  order: number;
  treatment: Treatment;
  /** Optional one-line description, shown on the About page. */
  description?: string;
}

/** The minimum an article needs for ordering decisions. */
export interface ArticleLike {
  slug: string;
  issue: string;
  title: string;
  date: Date;
  segment: string;
  order?: number;
  featured?: boolean;
}

export interface IssueLike {
  folder: string;
  publishDate: Date;
}
