import { describe, expect, it } from 'vitest';
import { ogText, renderOg } from '../../src/lib/og';
import { resolveTheme } from '../../src/lib/theme';

describe('ogText', () => {
  it('keeps Latin, accents, punctuation and Greek letters', () => {
    expect(ogText('β-lactamase & the μ-opioid receptor: Δ “results” — José')).toBe('β-lactamase & the μ-opioid receptor: Δ “results” — José');
  });
  it('drops characters the share-image fonts cannot draw', () => {
    expect(ogText('Cells 🧬 in বাংলা motion')).toBe('Cells in motion');
  });
});

describe('renderOg', () => {
  it('renders a Greek title to a PNG', async () => {
    const png = await renderOg({
      title: 'β-lactamase and the μ-opioid receptor',
      kicker: 'The Frontier · Issue No. 2',
      glyph: 'β',
      theme: resolveTheme('cobalt', { cobalt: { accent: '#1d3fbf', background: '#f4f0e6', ink: '#121212' } }).tokens,
    });
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });
});
