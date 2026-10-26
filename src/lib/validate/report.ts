export interface Problem {
  /** Path shown to the publisher, relative to the project when possible. */
  file: string;
  message: string;
  fix?: string;
}

export interface Report {
  errors: Problem[];
  warnings: Problem[];
}

/** Human-readable report for the terminal / Vercel build log. */
export function formatReport({ errors, warnings }: Report): string {
  const out: string[] = [];
  const block = (sym: string, p: Problem) => {
    out.push(`${sym} ${p.file}`);
    out.push(`    ${p.message}`);
    if (p.fix) out.push(`    How to fix: ${p.fix}`);
    out.push('');
  };
  if (warnings.length) {
    out.push(`⚠  ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (the site will still build):`, '');
    warnings.forEach((w) => block('⚠', w));
  }
  if (errors.length) {
    out.push(
      `✖  ${errors.length} problem${errors.length === 1 ? '' : 's'} must be fixed before the site can be published.`,
      `   The live site has not changed.`,
      '',
    );
    errors.forEach((e) => block('✖', e));
  }
  if (!errors.length && !warnings.length) out.push('✔  Content check passed: no problems found.');
  else if (!errors.length) out.push('✔  Content check passed.');
  return out.join('\n');
}
