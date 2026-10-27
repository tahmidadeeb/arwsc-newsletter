import { describe, expect, it } from 'vitest';
import { inlineItalics, stripItalics } from '../../src/lib/format';

describe('inlineItalics', () => {
  it('turns *text* into italics and escapes everything else', () => {
    expect(inlineItalics('*a* & <b>')).toBe('<em>a</em> &amp; &lt;b&gt;');
  });
  it('leaves a lone asterisk as a literal asterisk', () => {
    expect(inlineItalics('5 * 3')).toBe('5 * 3');
  });
});

describe('stripItalics', () => {
  it('removes the italics markers for plain-text uses', () => {
    expect(stripItalics('*the arw,sc newsletter* is')).toBe('the arw,sc newsletter is');
  });
});
