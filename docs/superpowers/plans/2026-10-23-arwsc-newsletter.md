# the arw,sc newsletter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, content-driven Astro site for the ARW,SC monthly newsletter that publishes from Markdown folders, validates author input in plain language, themes each issue, and deploys free on Vercel Hobby.

**Architecture:** Two Astro content collections (`issues`, `articles`) are loaded by glob from one content directory (`NEWSLETTER_CONTENT_DIR`, default `src/content/issues`). Pure TypeScript libraries in `src/lib/` (ordering, layout variants, theme and contrast, captions) hold every decision so they can be unit-tested. A standalone validator runs before `astro build`, and an HTML image smoke test runs after it. Pages are thin compositions of components that read CSS custom properties set per issue.

**Tech Stack:** Astro 7.4.x (static) · Tailwind CSS 4.3 via @tailwindcss/vite · TypeScript strict · sharp 0.35 · satori 0.63 + @resvg/resvg-js 2.6 · @astrojs/rss 4 · @astrojs/sitemap 3.7 · yaml 2.9 · tsx 4 · Vitest 5 · node-html-parser 9 · Playwright 1.64 (local QA only) · Fonts: @fontsource-variable/bodoni-moda, @fontsource-variable/newsreader, @fontsource-variable/schibsted-grotesk, @fontsource/fragment-mono.

**Spec:** `docs/superpowers/specs/2026-10-23-arwsc-newsletter-design.md`

## Global Constraints

- Node: `"engines": { "node": "24.x" }` and `.nvmrc` = `24` (Vercel default is 24.x; Astro 7 needs ≥22.23.4). Install Node 24 in the workspace before Task 1.
- `output: 'static'`. No `@astrojs/vercel` adapter, no server endpoints at runtime, no Vercel image optimisation.
- Zero paid services. No database. No secrets in the repo; config only via `PUBLIC_KIT_FORM_ID` and `SITE_URL`.
- Masthead text exactly: `the arw,sc newsletter` (lowercase). Club name: `Academic and Research Wing, Science Club` / short `ARW,SC`.
- Segment keys seeded: `feature` "Feature Articles", `opinion` "Opinion", `frontier` "The Frontier", `announcements` "Club Announcements"; treatments `standard | opinion | frontier | notice`.
- Allowed image extensions: `.jpg .jpeg .png .webp`. File names match `^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpe?g|png|webp)$`. Warn above 4000 px on either side or 5 MB.
- Contrast: ink on paper < 4.5:1 → error; accent-as-text < 4.5:1 → warning plus auto-darkened `--accent-text`.
- Fonts: display Bodoni Moda; body Newsreader; labels Schibsted Grotesk; mono Fragment Mono. Never Inter, Roboto, Arial or Space Grotesk.
- Every animation is wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Commits carry no Co-Authored-By or other added identity lines. Local git is for checkpoints only and is not delivered.
- Deferred user questions are asked one at a time when their task starts (logo → Task 7, contact → Task 10, Kit ID → Task 11, domain → Task 12). If there's no answer, use a placeholder marked `PLACEHOLDER` and add it to the final list.

## Review Focus

1. **Files saved on Windows:** CRLF line endings and a UTF-8 BOM before `---` must still parse as frontmatter, not as a "malformed frontmatter" error. (Test in Task 6.)
2. **Stray files in an article folder:** `Thumbs.db`, `desktop.ini`, `.DS_Store` or an extra `notes.md` next to `<slug>.md`. The system files are ignored silently; an extra `.md` gives a warning, not a phantom article. (Tests in Tasks 4 and 6.)
3. **Special characters in titles and names:** `&`, `<`, `"`, em dashes, emoji and accented names must escape correctly in HTML, `<title>`, Open Graph meta, RSS and the generated share images. (Test in Task 12.)
4. **Ties:** two articles with the same order, date and title, or two issues with the same publishDate, must give a deterministic order (final tiebreak: slug or folder name). (Test in Task 2.)
5. **Frontmatter only, empty body:** an article with no body text renders with no empty drop-cap paragraph and no empty References section. (Test in Task 9.)

---

### Task 1: Scaffold, configuration and data files

**Files:**
- Create: `package.json`, `.nvmrc`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/styles/global.css` (Tailwind import only for now), `src/pages/index.astro` (temporary), `src/data/segments.yaml`, `src/data/themes.yaml`, `src/data/site.yaml`, `src/data/team.yaml`, `src/content/issues/.gitkeep`, `public/robots.txt` placeholder removed later.

**Interfaces:**
- Produces: npm scripts `dev`, `validate` (`tsx scripts/validate.ts`), `build` (`npm run validate && astro build && tsx scripts/check-images.ts`), `test` (`vitest run`), `test:fixtures` (`tsx scripts/test-fixtures.ts`), `preview`.
- Produces: `astro.config.mjs` reads `process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + it : 'http://localhost:4321')` into `site`; `trailingSlash: 'always'`; `markdown.remarkRehype.footnoteLabel = 'References'`.

- [ ] **Step 1:** Install Node 24 (`n 24` or nvm) and confirm `node -v` prints v24.
- [ ] **Step 2:** Create the files above with the exact versions from Tech Stack. `.gitignore` contains only: `node_modules/ dist/ .astro/ .env .env.* !.env.example .vercel/ test-output/`.
- [ ] **Step 3:** Seed `segments.yaml` with the four segments from Global Constraints (orders 1–4). Seed `themes.yaml` with `brand` (PLACEHOLDER until Task 7), `cobalt`, `chlorophyll`, `saffron`, `oxblood`, each `{accent, background, ink, secondary?}`. Seed `site.yaml` with `{clubName, shortName, tagline, contactEmail: PLACEHOLDER, social: [], about: {...}}`. Seed `team.yaml` with 3 PLACEHOLDER entries (one without a photo).
- [ ] **Step 4:** Run `npm install && npx astro build`. Expected: build succeeds with the temporary index page.
- [ ] **Step 5:** `git init` and commit "chore: scaffold".

### Task 2: Ordering, lead selection and layout variants

**Files:**
- Create: `src/lib/types.ts`, `src/lib/ordering.ts`, `src/lib/layout.ts`
- Test: `tests/unit/ordering.test.ts`, `tests/unit/layout.test.ts`

**Interfaces:**
- Produces in `types.ts`:
  `type Treatment = 'standard'|'opinion'|'frontier'|'notice'`;
  `interface Segment { key: string; label: string; order: number; treatment: Treatment }`;
  `interface ArticleLike { slug: string; issue: string; title: string; date: Date; segment: string; order?: number; featured?: boolean }`;
  `interface IssueLike { folder: string; publishDate: Date }`.
- Produces in `ordering.ts`:
  `sortArticles<T extends ArticleLike>(a: T[]): T[]` (order ascending with missing last, then date ascending, then title using `localeCompare` with base sensitivity, then slug);
  `groupBySegment<T>(a: T[], segs: Segment[]): { segment: Segment; articles: T[] }[]` (segment order; empty segments omitted);
  `pickLead<T>(a: T[], segs: Segment[]): { lead: T | null; warnings: string[] }`;
  `readingOrder<T>(a: T[], segs: Segment[]): T[]`;
  `nextArticle<T>(a: T[], segs: Segment[], slug: string): T | null`;
  `sortIssues<T extends IssueLike>(i: T[]): T[]` (publishDate descending, then folder descending).
- Produces in `layout.ts`: `type Variant = 'single'|'pair'|'lead-stack'|'lead-grid'|'lead-cards-list'|'trio'|'grid'|'grid-list'|'list'`; `variantFor(treatment: Treatment, count: number): Variant`, following the spec §7 table exactly (standard: 1 single, 2 pair, 3 lead-stack, 4–6 lead-grid, 7+ lead-cards-list; opinion: 1 single, 2 pair, 3 trio, 4–6 grid, 7+ grid-list; frontier and notice: 1 single, otherwise list).

- [ ] **Step 1: Write the failing tests**
  - `sortArticles`: `[{order:2},{order:undefined},{order:1}]` → orders `[1,2,undefined]`; equal order → earlier date first; equal order and date → title A before B; fully identical → slug `a-x` before `b-x` (Review Focus 4).
  - `pickLead`: none featured → lowest order; two featured (orders 3 and 5) → order 3 and `warnings.length === 1`; no orders at all → first article of the first segment; empty → `{lead:null}`.
  - `groupBySegment`: an article in `frontier` only → result has 1 group.
  - `nextArticle`: the last article → `null`.
  - `sortIssues`: same publishDate → folder `2026-10` before `2026-09`.
  - `variantFor`: `standard` for counts 0..12 and `opinion` 7 → `'grid-list'`; `variantFor('frontier', 30) === 'list'`.
- [ ] **Step 2:** `npx vitest run tests/unit` → FAIL (modules missing).
- [ ] **Step 3:** Implement the signatures above.
- [ ] **Step 4:** `npx vitest run tests/unit` → PASS.
- [ ] **Step 5:** Commit "feat: ordering and layout variants".

### Task 3: Colour, contrast and theme resolution

**Files:**
- Create: `src/lib/color.ts`, `src/lib/theme.ts`
- Test: `tests/unit/theme.test.ts`

**Interfaces:**
- Produces in `color.ts`: `parseHex(s: string): [number,number,number] | null` (accepts `#rgb`/`#rrggbb`, case-insensitive); `contrast(a: string, b: string): number` (WCAG 2.x relative luminance); `darkenUntil(fg: string, bg: string, target: number): string` (step down OKLCH lightness by 0.01 until reaching the target, or black); `mix(a: string, b: string, t: number): string`.
- Produces in `theme.ts`:
  `interface ThemeInput { preset?: string; accent?: string; background?: string; ink?: string; secondary?: string }`;
  `interface ThemeTokens { paper; ink; accent; accentText; onAccent; secondary; rule: string }`;
  `resolveTheme(input: string | ThemeInput | undefined, presets: Record<string, ThemeInput>): { tokens: ThemeTokens; errors: string[]; warnings: string[] }`;
  `themeStyle(t: ThemeTokens): string` → `"--paper:#…;--ink:#…;--accent:#…;--accent-text:#…;--on-accent:#…;--secondary:#…;--rule:…"`.
- Rules: merge brand → preset → fields. `onAccent` = whichever of ink or paper has higher contrast on accent (warn if < 4.5). `secondary` defaults to `mix(accent, ink, 0.35)`. `rule` = `color-mix(in oklab, var(--ink) 18%, transparent)`. An unknown preset name is an error that lists valid names. An invalid hex is an error naming the field.

- [ ] **Step 1: Write the failing tests:** `contrast('#000','#fff')` ≈ 21; `contrast('#777','#fff')` < 4.5; `resolveTheme(undefined)` gives the brand tokens with no errors; `resolveTheme({accent:'#ffd400'})` (yellow on paper) → 1 warning containing "accent" and a suggested hex, and `contrast(tokens.accentText, tokens.paper) >= 4.5`; `resolveTheme({ink:'#ddd'})` → 1 error containing "4.5:1"; `resolveTheme('nope')` → error containing "cobalt"; `resolveTheme({accent:'blue'})` → error naming `accent`; each seeded preset resolves with zero errors.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit "feat: theme resolution with contrast checks".

### Task 4: Content collections and content access layer

Check the Astro 7 content-layer docs (glob loader, `image()` schema helper, `generateId`) before writing the code.

**Files:**
- Create: `src/content.config.ts`, `src/lib/data.ts` (YAML loaders), `src/lib/content.ts`
- Test: `tests/unit/data.test.ts`

**Interfaces:**
- `issues` collection: `glob({ base: CONTENT_DIR, pattern: '*/issue.md', generateId: ({entry}) => entry.split('/')[0] })`. Schema (Zod): `issueNumber: z.number().int().positive()`, `title: z.string().min(1)`, `monthLabel?`, `publishDate?: z.coerce.date()`, `coverImage?: image()`, `coverAlt?`, `theme?: z.union([z.string(), z.object({...ThemeInput})])`, `draft: z.boolean().default(false)`; `.superRefine`: coverImage requires coverAlt.
- `articles` collection: `glob({ base: CONTENT_DIR, pattern: '*/*/*.md', generateId: ({entry}) => <issue>/<folder> })`. Schema: `title`, `authors: z.union([z.string(), z.array(z.string()).min(1)]).transform(toArray)`, `segment: z.string()`, `date: z.coerce.date()`, `summary`, `issue?`, `dek?`, `heroImage?: image()`, `heroAlt?`, `heroCaption?`, `heroCredit?`, `featured?: z.boolean()`, `order?: z.number()`, `draft: default(false)`; heroImage requires heroAlt.
- `data.ts`: `loadSegments(): Segment[]`, `loadThemes(): Record<string, ThemeInput>`, `loadSite(): Site`, `loadTeam(): TeamMember[]` (`{name, role, photo?, bio?}`; `photo` is a `/team/<file>` path in `public`). These read YAML synchronously with `yaml`, validate with Zod, and throw plain-language errors.
- `content.ts` (used by pages):
  `interface Issue { folder; issueNumber; title; monthLabel; publishDate; cover?: {src: ImageMetadata; alt}; theme: ThemeTokens; hasNote: boolean; entry }` (hasNote = body has non-whitespace text)``;
  `interface Article { slug; issue; title; authors: string[]; segment; date; summary; dek?; hero?: {...}; featured; order?; entry }`;
  `getIssues(): Promise<Issue[]>` (sorted; drafts excluded when `import.meta.env.PROD`);
  `getIssue(folder): Promise<{issue, articles, groups, lead} | null>`;
  `getLatest(): Promise<... | null>`;
  `getArticle(issue, slug)`;
  `formatAuthors(a: string[]): string` ("A", "A and B", "A, B and C").
- Derived defaults: `publishDate` = `new Date(Date.UTC(y, m-1, 1))` from the folder; `monthLabel` = `Intl.DateTimeFormat('en-GB', {month:'long', year:'numeric', timeZone:'UTC'})`.

- [ ] **Step 1: Write the failing tests:** `formatAuthors` for 1, 2 and 3 names; `loadSegments` on a temporary YAML file with a duplicate key throws "duplicate"; an unknown treatment falls back to `standard` with a warning; a team member without `photo` validates.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Replace the temporary index with a page listing `getIssues()` titles.
- [ ] **Step 4:** Run the unit tests → PASS. Put one throwaway issue in `src/content/issues/2099-01/` containing `issue.md`, `a/a.md` and a `Thumbs.db`. Run `npx astro build` → the title is listed and there's no error from `Thumbs.db` (Review Focus 2). Delete the throwaway issue.
- [ ] **Step 5:** Commit "feat: content collections".

### Task 5: Markdown pipeline — figures, captions, tables, footnotes

**Files:**
- Create: `src/lib/caption.ts`, `src/markdown/remark-figures.ts`, `src/markdown/rehype-tables.ts`, `src/markdown/rehype-footnotes.ts`
- Modify: `astro.config.mjs` (register plugins)
- Test: `tests/unit/caption.test.ts`, `tests/unit/markdown.test.ts`

**Interfaces:**
- `parseImageTitle(title: string | null): { caption?: string; credit?: string; wide: boolean }`: strip a leading `[wide] ` (sets `wide`); split on the last ` | `; trim both parts.
- `remark-figures`: a paragraph whose only child is an image becomes a `figure` (via `data.hName`) with class `fig` (plus `fig--wide`), containing the image and a `figcaption` with `<span class="fig__num">Fig. N</span> caption <span class="fig__credit">credit</span>`. N counts figures in document order. Clear the image `title` attribute. It runs before Astro's image processing so that relative `images/...` paths are still optimised; confirm this in Step 4 by checking `dist` for `/_astro/*.webp`.
- `rehype-tables`: wrap `<table>` in `<div class="table-scroll" role="region" aria-label="Table" tabindex="0">`.
- `rehype-footnotes`: add class `references` to the footnotes section; render back-links as `↩` with `aria-label="Back to reference N"`.

- [ ] **Step 1: Write the failing tests:** `parseImageTitle('[wide] Cells | Credit: J. Roy')` → `{caption:'Cells', credit:'Credit: J. Roy', wide:true}`; `parseImageTitle('A | B | C')` → caption `A | B`, credit `C`; `parseImageTitle(null)` → `{wide:false}`. Run unified (remark-parse → remark-figures → remark-rehype → rehype-stringify) on `![alt](images/a.jpg "Cap | Cr")` → output contains `<figure class="fig"`, `Fig. 1`, `<figcaption`. An inline image inside a sentence → no figure. A table → wrapped. Footnote markdown → contains `class="references"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement and register the plugins.
- [ ] **Step 4:** Run → PASS. Build a throwaway article containing an image → `dist` HTML has `<figure` and an `/_astro/` image URL. Delete the throwaway.
- [ ] **Step 5:** Commit "feat: markdown figures, tables, footnotes".

### Task 6: Pre-build validator

**Files:**
- Create: `scripts/validate.ts` (CLI), `src/lib/validate/index.ts` (`validateContent`), `src/lib/validate/frontmatter.ts`, `src/lib/validate/images.ts`, `src/lib/validate/report.ts`
- Test: `tests/unit/validate.test.ts`, `tests/fixtures-invalid/<case>/…`

**Interfaces:**
- `validateContent(contentDir: string, dataDir = 'src/data'): Promise<{ errors: Issue[]; warnings: Issue[] }>` where `Issue = { file: string; message: string; fix?: string }`.
- The CLI prints grouped, plain-language output (`✖ src/content/issues/2026-10/foo/foo.md` / message / "How to fix: …"), exits 1 on errors, and reads `NEWSLETTER_CONTENT_DIR`.
- Before parsing YAML, strip a BOM and normalise CRLF (Review Focus 1). Detect an unquoted colon title by catching the YAML error and checking whether a `title:` line contains a second `: `.
- Image checks: collect Markdown image URLs and `heroImage`/`coverImage`. Then check, in order: reject `http(s):` and `data:`; check the extension (HEIC/HEIF get a specific message about exporting as JPEG); resolve the path relative to the `.md` file; find the exact-case match by reading the directory (`readdirSync`), because the file system may ignore case; check the file-name pattern; check for straight `"` inside the title (detect `![…](path "…"…"…")`, more than two quote marks inside the parentheses); warn on oversized images via `sharp().metadata()` and `statSync`.
- Structure checks: the issue folder matches `^\d{4}-(0[1-9]|1[0-2])$`; each issue folder has an `issue.md`; the article `.md` name equals its folder; extra `.md` files in an article folder → warning; ignore `Thumbs.db`, `desktop.ini`, `.DS_Store`, `*.txt`; unknown segment → error listing keys; `issue` field ≠ folder → error; missing required fields (re-checked here so messages are friendly, not raw Zod output); contrast via `resolveTheme`; several featured articles → warning; an issue with no articles → warning.

- [ ] **Step 1: Write the failing tests:** one fixture folder under `tests/fixtures-invalid/` per case, each asserting `errors` contains a message with the quoted substring:
  - unknown segment → `"feature, opinion, frontier, announcements"`
  - `.HEIC` → `"HEIC"`
  - `images/Photo.jpg` while the file is `photo.jpg` → `"capital letters"`
  - unquoted colon title → `"put the title in quotes"`
  - `https://` image → `"must be a file inside the article's images folder"`
  - `data:image` → `"data:image"`
  - missing alt → `"alt text"`
  - missing `summary` → `"summary"`
  - `issue: 2026-09` inside the 2026-10 folder → `"2026-10"`
  - folder `2026-13` → `"YYYY-MM"`
  - `My Photo.jpg` → `"spaces"`
  - straight quote in caption → `"typographic"`
  - ink `#ccc` → `"4.5:1"`

  Plus valid cases asserting no errors: a CRLF+BOM file (Review Focus 1), and an article folder containing `Thumbs.db` and `notes.md` (expect exactly 1 warning) (Review Focus 2).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Also run `NEWSLETTER_CONTENT_DIR=tests/fixtures-invalid/unknown-segment npm run validate` → exit code 1 and readable output.
- [ ] **Step 5:** Commit "feat: plain-language content validator".

### Task 7: Design system, base layout, masthead, footer, brand theme

**Ask the user first:** for the logo file (to be placed in the newsletter project folder). Extract the dominant colours with sharp (resize to 64 px, quantise, take the top 3 non-neutral colours), propose a `brand` preset (accent, ink, paper), and get confirmation. If there's no logo yet, keep a PLACEHOLDER brand of `#1f3a5f` accent, `#16130f` ink, `#f6f1e7` paper.

**Files:**
- Create: `src/styles/global.css` (Tailwind `@theme` mapping fonts and theme variables; base typography; paper texture; motion keyframes), `src/styles/prose.css`, `src/layouts/Base.astro`, `src/components/Masthead.astro`, `src/components/Footer.astro`, `src/components/Tag.astro`, `src/components/Placeholder.astro`, `public/favicon.svg`
- Modify: `src/data/themes.yaml` (`brand`)

**Interfaces:**
- `Base.astro` props: `{ title: string; description: string; theme?: ThemeTokens; ogImage?: string; canonicalPath: string; article?: {published: Date; authors: string[]} }`. It sets `style={themeStyle(theme ?? brand)}` on `<html lang="en">`, includes `<Seo>` (stub until Task 12), a skip link, `<Masthead>`, `<main id="main">` and `<Footer>`.
- `Masthead` props: `{ variant: 'home' | 'compact'; issueLine?: string }`.
- `Tag` props: `{ label: string; index?: number }` (specimen tag).
- `Placeholder` props: `{ label: string; glyph: string; tone?: 'accent'|'paper' }` (colour block with a large Bodoni glyph and graph-paper texture).
- CSS pinned values: reading measure `max-width: 66ch`; graph texture = two `repeating-linear-gradient` layers (1 mm lines at `--rule` 35% opacity, 10 mm lines at 60%) applied only on `body::before` outside `.measure`; load sequence via `.reveal` class with `animation: rise .6s cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--i) * 60ms)`, and rules via `.rule-draw` (scaleX 0→1, 500 ms).

- [ ] **Step 1:** Implement the files.
- [ ] **Step 2:** `npx astro build && npx astro preview`. Take Playwright screenshots of `/` at 390 and 1440 px and view them. Check that the masthead reads exactly "the arw,sc newsletter", the fonts load (no fallback in the computed style), and there's no horizontal scroll at 390 px.
- [ ] **Step 3:** Run `@axe-core/playwright` (dev dependency) on `/` → 0 serious or critical violations.
- [ ] **Step 4:** Commit "feat: design system and base layout".

### Task 8: Issue components, home, issue page and archive

**Files:**
- Create: `src/components/Cover.astro`, `src/components/Toc.astro`, `src/components/SegmentBlock.astro`, `src/components/cards/{LeadCard,ArticleCard,OpinionCard,Dispatch,Notice,CompactItem}.astro`, `src/components/ArchiveCard.astro`, `src/components/EmptyState.astro`, `src/pages/index.astro`, `src/pages/issues/index.astro`, `src/pages/issues/[issue]/index.astro`

**Interfaces:**
- Consumes: `getIssues`, `getIssue`, `getLatest`, `groupBySegment`, `pickLead`, `variantFor`, `themeStyle`.
- `Cover` props: `{ issue: Issue; lead?: Article | null; size: 'hero' | 'card' }`. With a cover image → `<Image>` with a duotone overlay; without → accent block with a cropped Bodoni numeral `issueNumber`.
- `SegmentBlock` props: `{ segment: Segment; articles: Article[]; excludeSlug?: string }`. It picks the variant via `variantFor` and renders the matching card set. The heading renders only when `articles.length > 0`.
- `ArchiveCard` sets `style={themeStyle(issue.theme)}` on its own root.
- `EmptyState` props: `{ title: string; body: string }`. Copy: no issues → "The first issue is in preparation"; issue with no articles → "Articles for this issue are on their way".
- The home page puts the lead story in the cover and excludes it from its segment block. The issue page shows the editor's note (rendered `entry` body) only when it isn't empty.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Create a temporary dev fixture by script (`tests/fixtures/heavy` from Task 15 isn't ready yet, so generate 1 issue with 1, 3 and 9 articles across segments). Build and screenshot the home, issue and archive pages at 390 and 1440 px. Check visually: no empty headings, no grid holes, variants as in the table.
- [ ] **Step 3:** Commit "feat: home, issue and archive pages".

### Task 9: Article page

**Files:**
- Create: `src/pages/issues/[issue]/[article].astro`, `src/layouts/ArticleLayout.astro`, `src/components/Byline.astro`, `src/components/Hero.astro`, `src/components/NextArticle.astro`
- Modify: `src/styles/prose.css` (drop cap, blockquote, lists, tables, references, figures, wide figures)

**Interfaces:**
- Consumes: `getArticle`, `nextArticle`, `formatAuthors`.
- `Hero` props: `{ article: Article }`. With a hero image → `<Picture>` (formats avif and webp, widths 640/960/1280/1920, `loading="eager"`, `fetchpriority="high"`) plus a caption and credit. Without → a typographic hero (segment tag + `Placeholder` glyph = first letter of the title).
- Drop cap via `.prose > p:first-of-type::first-letter`, applied only when that `p` exists and isn't empty. A body with no paragraphs → no drop-cap element (Review Focus 5).
- `NextArticle` → the next article in reading order; otherwise "Back to the issue".

- [ ] **Step 1: Write the failing test** (`tests/build/article.test.ts`, run after a fixture build): it builds a fixture with a frontmatter-only article and asserts its HTML has no `<section class="references"`, no empty `<p></p>`, and contains the title.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Screenshot an article with a figure and footnotes at 390 and 1440 px.
- [ ] **Step 5:** Commit "feat: article page".

### Task 10: About, Team, Contact, 404

**Ask the user first:** the contact email and social links (which networks, URLs). If not available, use PLACEHOLDER values in `site.yaml`.

**Files:**
- Create: `src/pages/about.astro`, `src/pages/team.astro`, `src/pages/contact.astro`, `src/pages/404.astro`, `src/components/TeamGrid.astro`
- Modify: `src/data/site.yaml`

**Interfaces:**
- `TeamGrid` props: `{ members: TeamMember[] }`. Auto-fill grid (`minmax(14rem, 1fr)`); a member without a photo gets a monogram tile (initials in Bodoni on `--accent`); 0 members → the section is omitted.
- Contact: `mailto:` link plus a social list; links whose value is PLACEHOLDER render as text, not links. 404 heading: "Specimen not found".

- [ ] **Step 1:** Implement. **Step 2:** Build. Screenshot team with 0, 1 and 12 members (temporary YAML swaps), then restore. **Step 3:** Commit "feat: static pages".

### Task 11: Email signup (Kit)

**Ask the user first:** for the Kit form ID; it's fine if they don't have one yet.

**Files:**
- Create: `src/components/Signup.astro`, `src/scripts/signup.ts`, `.env.example` (`PUBLIC_KIT_FORM_ID=`, `SITE_URL=`)
- Test: `tests/unit/signup.test.ts`

**Interfaces:**
- Step 0 (research): read Kit's current docs for posting a form from a static site (endpoint, field names, CORS, response). Record the exact endpoint and fields in a comment at the top of `signup.ts`. If a cross-origin `fetch` can't read the response, use `mode: 'no-cors'` and treat dispatch as success, or fall back to Kit's embed script; document which in the comment.
- `Signup` props: `{ variant: 'band' | 'footer'; id: string }`. When `import.meta.env.PUBLIC_KIT_FORM_ID` is empty → renders "Signups opening soon" with no form. Otherwise a `<form method="post" action="<kit endpoint>" novalidate>` with a labelled email field, a visually hidden honeypot `name="website"` (`tabindex=-1`, `autocomplete=off`), a submit button, an `aria-live="polite"` status, and the privacy line: "We'll only use your email to send the newsletter. Unsubscribe any time."
- `signup.ts` exports `isValidEmail(s: string): boolean` and `submitSignup(form: HTMLFormElement, fetchImpl = fetch): Promise<'success'|'invalid'|'spam'|'error'>`. Success copy: "Almost there — check your inbox and click the link to confirm your subscription."

- [ ] **Step 1: Write the failing tests:** `isValidEmail('a@b.co')` is true; `'a@b'` and `' '` are false; `submitSignup` with the honeypot filled → `'spam'` and fetch not called; a fetch that rejects → `'error'`; a resolved fetch → `'success'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement and place the component on home and in the footer. **Step 4:** Run → PASS. Build with the variable unset → HTML contains "Signups opening soon". Build with `PUBLIC_KIT_FORM_ID=123` → the form's action contains `123`. **Step 5:** Commit "feat: Kit signup".

### Task 12: SEO, share images, RSS, sitemap

**Ask the user first:** for a custom domain; otherwise use the Vercel default.

**Files:**
- Create: `src/components/Seo.astro`, `src/lib/og.ts`, `src/pages/og/[...path].png.ts` (static `getStaticPaths` for home, each issue, each article, each static page), `src/pages/rss.xml.ts`, `src/pages/robots.txt.ts`, `src/assets/fonts/` (TTF copies of Bodoni Moda and Schibsted Grotesk for satori, loaded from the @fontsource package files at build time if TTF/WOFF is available; otherwise vendored)
- Modify: `src/layouts/Base.astro`, `astro.config.mjs` (sitemap integration filtering `/og/`)
- Test: `tests/build/seo.test.ts`

**Interfaces:**
- `Seo` props match the Base props. Outputs title (`"<page> · the arw,sc newsletter"`, home = masthead text), description, canonical (`new URL(path, Astro.site)`), `og:*`, `twitter:card=summary_large_image`, and `article:published_time`. `ogImage` priority: hero → cover → `/og/<path>.png`.
- `renderOg({title, kicker, theme}): Promise<Buffer>` produces a 1200×630 PNG with title text escaped by satori's JSX object form (no string HTML).
- RSS: the 50 newest non-draft articles across issues; item link = article URL; description = summary.
- robots.txt: `User-agent: *` / `Allow: /` / `Sitemap: <site>/sitemap-index.xml`.

- [ ] **Step 1: Write the failing test** (Review Focus 3): build a fixture with an article titled `Cells & "Signals" <in> Motion — 🧬 Ünïcode`. Assert: `<title>` contains `Cells &amp; &quot;Signals&quot; &lt;in&gt;` (or the equivalent valid escaping); `og:title` content attribute is well-formed (the HTML parses and the attribute value equals the raw title); the RSS XML parses with an XML parser; the og PNG exists and has a non-zero size; the canonical link starts with `SITE_URL`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit "feat: SEO, OG images, RSS".

### Task 13: Sample content and placeholder images

**Files:**
- Create: `scripts/make-placeholders.ts` (dev-only, run once; outputs committed), `src/content/issues/2026-09/…` (issue.md with theme `chlorophyll`; 1 feature, 5 opinion, 3 frontier), `src/content/issues/2026-10/…` (theme `cobalt`; 3 feature, 1 opinion, 2 frontier, 2 announcements)

**Interfaces:**
- Placeholder images: original abstract SVG compositions (concentric rings, lattice, wave interference) rasterised by sharp to JPEG at 1600×1000 and 1200×800, named in lowercase with hyphens.
- Every sample title starts with "Placeholder: " (quoted in the YAML), and every summary includes "(placeholder)". The 2026-10 feature with `featured: true` and `order: 1` has 3 footnotes, one captioned figure and one `[wide]` figure, a blockquote, a list and a 5-column table. 2026-09 has an editor's note; 2026-10 has a cover image; one article has 5 authors.

- [ ] **Step 1:** Generate and write the content. **Step 2:** `npm run build` → 0 errors and 0 warnings. **Step 3:** Commit "content: sample issues".

### Task 14: Image smoke test

**Files:**
- Create: `scripts/check-images.ts`, `src/lib/check-images.ts`
- Test: `tests/unit/check-images.test.ts`

**Interfaces:**
- `checkImages(distDir: string, site: string): { checked: number; missing: {page: string; url: string}[] }`. Parse every `dist/**/*.html` with node-html-parser and collect `img[src]`, `img[srcset]`, `source[srcset]`, `meta[property="og:image"]` and `meta[name="twitter:image"]` content. Strip the `site` origin from absolute URLs. External origins are counted as missing (no external images are allowed). Resolve against `dist`, decoding URI components.
- The CLI prints the counts and exits 1 if anything is missing.

- [ ] **Step 1: Write the failing test:** in a temporary dist with one HTML file referencing `/a.png` (exists) and `/b.png` (missing) in srcset → `missing.length === 1`; an og:image of `https://site/x.png` where `x.png` exists → not missing.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS; `npm run build` on the sample content → "N images checked, 0 missing".
- [ ] **Step 5:** Playwright against `npm run preview`: open one article from 2026-09 and one from 2026-10; assert every `img` has `naturalWidth > 0`. Save this as `scripts/qa-images.ts`.
- [ ] **Step 6:** Commit "test: image smoke tests".

### Task 15: Stress fixtures and fixture runner

**Files:**
- Create: `tests/fixtures/{minimal,empty,heavy,sparse,partial-theme,no-issues}/…` (`heavy` generated by `scripts/gen-heavy-fixture.ts`), `scripts/test-fixtures.ts`

**Interfaces:**
- `test-fixtures.ts`: for each valid fixture, run `NEWSLETTER_CONTENT_DIR=<fixture> astro build --outDir test-output/<name>` and then `checkImages`. Assert exit code 0 and the per-fixture expectations below. Then run `validateContent` on each `tests/fixtures-invalid/*` and assert errors (already covered in unit tests; this re-checks the CLI exit codes).
- Per-fixture expectations (parsed from HTML):
  - `minimal`: the article page exists and the home page has 1 lead.
  - `empty`: the issue page contains "on their way".
  - `heavy`: the opinion section has 32 items and the build prints a several-featured warning.
  - `sparse`: only the "The Frontier" heading.
  - `partial-theme`: the build output contains the auto-darken warning, and `--accent-text` differs from `--accent`.
  - `no-issues`: home contains "in preparation" and the archive has 0 cards.
- Deletion test: copy the project to a temporary folder, delete `src/content/issues/2026-*`, run `npm run build` → succeeds, and home shows the empty state.

- [ ] **Step 1:** Write the fixtures and runner, with assertions. **Step 2:** Run `npm run test:fixtures` → fix anything failing until every fixture passes. **Step 3:** Take screenshots of heavy and minimal (home, issue, article) at 390 and 1440 px, review them, and fix the layout. **Step 4:** Commit "test: stress fixtures".

### Task 16: Visual QA pass

- [ ] **Step 1:** Write `scripts/screenshots.ts` (Playwright) to capture home, issue, article, archive, team, contact and 404 for both sample themes and the heavy and minimal fixtures at 390 and 1440 px into `test-output/shots/`.
- [ ] **Step 2:** Review every shot against spec §7. Fix spacing, hierarchy, overflow and contrast. Re-run axe on the main pages → 0 serious or critical issues.
- [ ] **Step 3:** Measure the home page transfer size with Playwright → aim for under 350 KB on first load, excluding images below the fold. Make sure fonts are preloaded only for Bodoni and Newsreader.
- [ ] **Step 4:** Commit "style: QA pass".

### Task 17: Documentation, template and delivery

**Files:**
- Create: `_template/example-article/example-article.md`, `_template/example-article/images/README.txt` and `images/example-figure.jpg`, `AUTHORING.md`, `README.md`
- Modify: `astro.config.mjs` / glob patterns confirmed to exclude `_template` (it lives outside `src/content`)

**Interfaces:**
- Field tables, segment keys, image rules and error messages are generated from (or checked against) `content.config.ts`, `segments.yaml` and `src/lib/validate`. A small script, `scripts/doc-check.ts`, checks that every segment key and every frontmatter field name appears in `AUTHORING.md`.
- AUTHORING.md and README.md contents follow brief §13 exactly. README also covers: the public-repo requirement, Vercel env variables, first deployment, not renaming published folders, and a common-errors table taken from the validator's messages.

- [ ] **Step 1:** Write the docs. **Step 2:** Copy the template into a temporary issue folder, build, and confirm 0 errors (then remove it). Run `scripts/doc-check.ts` → pass.
- [ ] **Step 3:** Run the full suite: `npm test && npm run build && npm run test:fixtures` → all green.
- [ ] **Step 4:** Copy the project (excluding `node_modules`, `dist`, `.astro`, `test-output`, `.git`) to the user's "newsletter project" folder and list its contents to confirm.
- [ ] **Step 5:** Final summary: what was built, overrides, the PLACEHOLDER list, and the user's manual steps (logo, colours, Kit ID, contacts, SITE_URL, real content, GitHub plus Vercel setup).
