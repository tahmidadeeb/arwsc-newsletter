import { describe, expect, it } from 'vitest';
import { parseImageTitle } from '../../src/lib/caption';

describe('parseImageTitle', () => {
  it('reads wide flag, caption and credit', () => {
    expect(parseImageTitle('[wide] Cells | Credit: J. Roy')).toEqual({
      caption: 'Cells',
      credit: 'Credit: J. Roy',
      wide: true,
    });
  });
  it('splits on the last separator only', () => {
    expect(parseImageTitle('A | B | C')).toEqual({ caption: 'A | B', credit: 'C', wide: false });
  });
  it('handles caption only', () => {
    expect(parseImageTitle('Just a caption')).toEqual({ caption: 'Just a caption', wide: false });
  });
  it('handles no title', () => {
    expect(parseImageTitle(null)).toEqual({ wide: false });
    expect(parseImageTitle(undefined)).toEqual({ wide: false });
  });
  it('handles wide with nothing else', () => {
    expect(parseImageTitle('[wide]')).toEqual({ wide: true });
  });
});
