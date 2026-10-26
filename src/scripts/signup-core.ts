/**
 * Email signup for Kit (kit.com).
 *
 * Kit's own HTML embed posts the field `email_address` to the public form
 * endpoint https://app.kit.com/forms/<FORM_ID>/subscriptions. The form ID is
 * public (it appears in every Kit embed), so no secret is involved.
 *
 * The form on this site is a normal HTML form pointing at that endpoint, so it
 * works even without JavaScript (Kit then shows its own confirmation page).
 * With JavaScript we submit in the background and show our own message. If
 * the browser blocks the background request (cross-site rules), we fall back
 * to a normal submit so the signup still goes through.
 */

export type SignupResult = 'success' | 'invalid' | 'spam' | 'error' | 'fallback';

export const kitAction = (formId: string) =>
  `https://app.kit.com/forms/${encodeURIComponent(formId.trim())}/subscriptions`;

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export async function submitSignup(
  input: { email: string; honeypot: string; action: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SignupResult> {
  if (input.honeypot.trim()) return 'spam';
  const email = input.email.trim();
  if (!isValidEmail(email)) return 'invalid';
  const body = new URLSearchParams({ email_address: email });
  let res: Response;
  try {
    res = await fetchImpl(input.action, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
      mode: 'cors',
    });
  } catch {
    return 'fallback';
  }
  if (!res.ok) return 'error';
  try {
    const data = (await res.json()) as { status?: string };
    return data.status === undefined || data.status === 'success' ? 'success' : 'error';
  } catch {
    return 'success';
  }
}
