import { describe, expect, it, vi } from 'vitest';
import { isValidEmail, kitAction, submitSignup } from '../../src/scripts/signup-core';

const ok = (body: unknown = { status: 'success' }) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('  rumi.akter+news@rmc.edu.bd ')).toBe(true);
  });
  it('rejects incomplete ones', () => {
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail(' ')).toBe(false);
    expect(isValidEmail('no-at.example.com')).toBe(false);
  });
});

describe('kitAction', () => {
  it('builds the public form endpoint from the form ID', () => {
    expect(kitAction('123')).toBe('https://app.kit.com/forms/123/subscriptions');
  });
});

describe('submitSignup', () => {
  const action = kitAction('123');
  it('returns invalid without calling fetch for a bad email', async () => {
    const f = ok();
    expect(await submitSignup({ email: 'x', honeypot: '', action }, f)).toBe('invalid');
    expect(f).not.toHaveBeenCalled();
  });
  it('silently drops bots that fill the honeypot', async () => {
    const f = ok();
    expect(await submitSignup({ email: 'a@b.co', honeypot: 'http://spam', action }, f)).toBe('spam');
    expect(f).not.toHaveBeenCalled();
  });
  it('posts email_address and reports success', async () => {
    const f = ok();
    expect(await submitSignup({ email: ' a@b.co ', honeypot: '', action }, f)).toBe('success');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(action);
    expect((init.body as URLSearchParams).get('email_address')).toBe('a@b.co');
  });
  it('reports an error when Kit answers with a failure', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 422 }));
    expect(await submitSignup({ email: 'a@b.co', honeypot: '', action }, f)).toBe('error');
  });
  it('asks for a normal form submit when the browser blocks the request', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await submitSignup({ email: 'a@b.co', honeypot: '', action }, f)).toBe('fallback');
  });
});
