import { describe, expect, it } from 'vitest';
import { headlineHtml } from '../../src/lib/format';

describe('headlineHtml', () => {
  it('adds breathing room before colons and semicolons', () => {
    expect(headlineHtml('Placeholder: What')).toBe('Placeholder<span class="pt">:</span> What');
    expect(headlineHtml('A; B')).toBe('A<span class="pt">;</span> B');
  });
  it('escapes HTML so titles can never inject markup', () => {
    expect(headlineHtml('Cells & <b>"x"</b>: y')).toBe('Cells &amp; &lt;b&gt;&quot;x&quot;&lt;/b&gt;<span class="pt">:</span> y');
  });
  it('leaves titles without such punctuation unchanged', () => {
    expect(headlineHtml('The Quiet Lab')).toBe('The Quiet Lab');
  });
});
