# the arw,sc newsletter — design spec

Date: 2026-10-23 · Status: awaiting review

## 1. Intent

A monthly online newsletter for the Academic and Research Wing, Science Club (ARW,SC), read by students, faculty and alumni. It should feel serious and credible but inviting, in the spirit of an editorial magazine rather than a blog. A publisher adds one folder per article plus an `issue.md`, pushes to GitHub (the web interface is enough), and Vercel rebuilds. No code is touched to publish, and nothing costs money to run.

**Success means:**
- Any mix of issues and articles (0 to hundreds of issues; 0 to 30+ articles in a segment) renders without gaps or orphaned headings.
- Mistakes by authors or the publisher stop the build with a plain-language message, and the live site keeps running.
- Every image in the built site is proven to exist by an automated check.
- Pages meet WCAG AA, are fast on slow connections, and look distinctive.

**Decided with the user:** visual direction A ("Proceedings"); English only; all suggestions from the brief review accepted (plain Markdown, `issue` field optional, `authors` as a string or a list, case-sensitive file checks, contrast fail/warn split, build-time share images, no dark mode at launch).

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Astro, current stable release, `output: 'static'` | Content collections, a build-time image pipeline, zero JS by default |
| Styling | Tailwind CSS v4 (Vite plugin) plus CSS custom properties | Tailwind for layout; theme values as CSS variables so each issue can change them |
| Language | TypeScript, strict | Typed content schema |
| Content | Plain Markdown (`.md`), GFM footnotes | Safer for non-developer authors than MDX |
| Fonts | @fontsource packages, self-hosted, Latin subset, `font-display: swap` | No third-party requests, small files |
| Images | `astro:assets` (sharp) at build time; no Vercel adapter | Fully static; no runtime image optimisation |
| Share images | satori + @resvg/resvg-js, generated as static PNGs at build | Gives typographic share cards to articles that have no hero image |
| Node | Pinned via `engines` and `.nvmrc` to Vercel's current default (checked at scaffold time) | |
| Feed and sitemap | @astrojs/rss, @astrojs/sitemap | |

No database, no server functions, no paid APIs.

## 3. Repository layout

```
src/content/issues/<YYYY-MM>/issue.md
src/content/issues/<YYYY-MM>/<slug>/<slug>.md
src/content/issues/<YYYY-MM>/<slug>/images/*
src/data/segments.yaml     segment list (key, label, order, treatment)
src/data/themes.yaml       named colour presets, including "brand"
src/data/team.yaml         editorial team
src/data/site.yaml         club name, contact email, social links, about text fields
src/content.config.ts      collections plus Zod schemas
src/lib/                   ordering, layout selection, theme + contrast, validation helpers
src/components/            Masthead, Cover, TOC, SegmentBlock(+variants), ArticleCard, Byline, Figure, Signup, Footer
src/layouts/               Base, IssueLayout, ArticleLayout
src/pages/                 index, issues/index, issues/[issue]/index, issues/[issue]/[article],
                           about, team, contact, 404, rss.xml, og/[...path].png
scripts/validate.ts        runs before the build
scripts/check-images.ts    runs after the build (smoke test)
scripts/test-fixtures.ts   builds every fixture in turn
tests/fixtures/<case>/     stress-test issues (never published)
_template/                 author template (excluded from build)
public/                    favicon, robots.txt template, logo
AUTHORING.md  README.md  .env.example
```

**URLs:** `/` · `/issues/` · `/issues/2026-10/` · `/issues/2026-10/<slug>/` · `/about/` · `/team/` · `/contact/` · `/rss.xml`.

**Fixture switch:** the content directory is read from `NEWSLETTER_CONTENT_DIR`, which defaults to `src/content/issues`. Production never sets it, so fixtures can never be published. `npm run test:fixtures` builds each fixture into its own temporary output folder.

## 4. Content model

### issue.md (frontmatter; body = optional editor's note)
| Field | Req. | Notes |
|---|---|---|
| issueNumber | yes | positive integer |
| title | yes | |
| monthLabel | no | defaults to the publishDate's month and year, e.g. "October 2026" |
| publishDate | no | defaults to the 1st of the folder's month; sets the order of issues |
| coverImage, coverAlt | no | if coverImage is given, coverAlt is required |
| theme | no | a preset name (`theme: cobalt`), or a map `{preset?, accent?, background?, ink?, secondary?}` |
| draft | no | default false; drafts show in dev and are excluded from production |

The folder name must match `YYYY-MM`. Issues are sorted by publishDate, newest first, with the folder name as a tiebreak and fallback.

### Article `<slug>/<slug>.md`
| Field | Req. | Notes |
|---|---|---|
| title | yes | |
| authors | yes | a single name or a list of names |
| segment | yes | must be a key in segments.yaml; otherwise the build fails and lists the valid keys |
| date | yes | |
| summary | yes | used on cards, in the RSS feed and in the meta description |
| issue | no | derived from the folder; if present it must match the folder |
| dek, heroImage, heroAlt, heroCaption, heroCredit, featured, order, draft | no | heroAlt is required if heroImage is set |

The folder name and the `.md` file name must match. Slugs are lowercase letters, numbers and hyphens.

### Ordering rules
- **Within a segment:** order (missing values last), then date, then title.
- **Lead story:** among articles with `featured: true`, the one with the lowest order; if several are featured, build with a warning. If none are featured, the lowest order across the issue. If no article has an order, the first article in the first segment.
- **"Next article":** follows the issue's reading order, which is segments in display order, then articles in order. The last article links back to the issue page.

### segments.yaml
```yaml
- key: feature
  label: Feature Articles
  order: 1
  treatment: standard      # standard | opinion | frontier | notice
```
Seeded with feature, opinion, frontier ("The Frontier"), announcements. Segments with no articles in an issue are omitted. An unknown `treatment` falls back to `standard` with a warning.

### Article body
- **Footnotes:** GFM `[^1]`. Rendered as a "References" list with clickable back-links (↩).
- **Images:** `![alt text](images/file.jpg "Caption text | Credit")`. An image on its own line becomes `<figure>` + `<figcaption>`. Text after the last ` | ` is the credit. A title starting with `[wide] ` gives the full-width variant.
- **Images in body text:** run through Astro's image pipeline (responsive `srcset`, WebP output, explicit width and height, lazy loading below the fold).
- **Long-form styling:** a drop-cap opening paragraph in Bodoni, pull-style blockquotes, lists, and tables in a horizontally scrolling wrapper with a visible focus outline.

## 5. Validation (scripts/validate.ts plus Zod)

Runs as `prebuild`, so it also runs on Vercel. Errors stop the build; warnings print and the build continues. Each message names the file and gives a plain-language fix.

**Errors:** missing required fields · malformed YAML · unquoted title with a colon (detected and explained) · unknown segment (lists valid keys) · `issue` field that doesn't match the folder · folder not matching `YYYY-MM` · `.md` file name not matching its folder · missing alt text · image path not found · image path whose capitalisation differs from the file on disk · external (http/https) image URLs · `data:image` embedded images · image file names with uppercase letters, spaces or other unsafe characters · unsupported formats (HEIC/HEIF, TIFF, BMP and so on; allowed: .jpg .jpeg .png .webp) · straight double quotes inside an image title (suggests “ ” or ' ') · body text on its background below 4.5:1 contrast.

**Warnings:** source image over 4000 px or over 5 MB · several featured articles · accent below 4.5:1 as text (auto-darkened, with the suggested hex) · issue with no articles · unknown treatment.

## 6. Theming

**Tokens per issue** (set as CSS variables on `<html>` for that issue's pages):
`--paper` (background), `--ink`, `--accent`, `--accent-text` (the accent, darkened if needed to reach 4.5:1 on paper), `--on-accent` (ink or paper, whichever has higher contrast on the accent block), `--secondary` (defaults to a mix of accent and ink), `--rule` (derived from ink at low opacity).

**Resolution order:** the brand theme, overlaid with the preset, overlaid with the issue's own values. Contrast is checked after merging.

**Presets** (themes.yaml): `brand` (from the club logo; a placeholder until the user confirms), `cobalt` (deep blue on warm paper), `chlorophyll` (deep green), `saffron` (ochre/orange with dark ink), `oxblood` (dark red).

**Where themes apply:** an issue's cover, issue page, its article pages, and its archive card, which uses the card's own variables. The home page uses the latest issue's theme. The masthead and footer on non-issue pages (archive, about, team, contact, 404) use the brand theme.

## 7. Visual direction A: "Proceedings"

- **Type:** Bodoni Moda for display (optical sizes, used large); Newsreader for body (variable, opsz); Schibsted Grotesk for labels, navigation, captions and bylines; Fragment Mono for dates, issue numbers, figure numbers and footnote markers. Fallback stacks: Bodoni Moda → "Didot", "Bodoni 72", Georgia, serif; Newsreader → Georgia, "Times New Roman", serif; Schibsted → system-ui sans; Fragment Mono → ui-monospace.
- **Masthead:** "the arw,sc newsletter" in lowercase Bodoni, set very large on the home page and compact elsewhere. Above it, a thin double rule and a mono line: "Vol. · No. 12 · October 2026".
- **Paper:** a warm off-white background. Desktop margins carry a faint millimetre graph-paper texture made with CSS gradients (no image file), plus a very light grain. The reading column is kept clear of texture.
- **Covers:** a full block in the issue's accent, with a giant cropped Bodoni issue numeral, the issue title, and a lead headline in `--on-accent`. When a cover photo exists, it sits in the block with a duotone-style overlay and a caption plate.
- **Segment treatments:** *standard* uses lead plus grid with large serif heads; *opinion* uses author names first, italic Bodoni titles and a large open-quote glyph; *frontier* uses numbered mono "dispatches" (01, 02 …) with hairline dividers, like a journal abstract list; *notice* uses a compact noticeboard with dated items.
- **Labels:** segment names as small-caps specimen tags (a thin outline plus a mono index number). Figures are numbered "Fig. 1" automatically.
- **Layout:** a 12-column asymmetric grid on desktop (for example, lead story in 7 columns and the list in 4 with a 1-column gutter rule), collapsing to one column on mobile. Article text is about 65 characters wide, with captions and footnote markers hanging in the margin on wide screens.
- **Motion:** one orchestrated page load. Masthead rules draw left to right, then the masthead, cover, lead and table of contents fade and rise in with staggered delays (about 60 ms apart, under 700 ms in total). Hover states underline links in the accent colour. Everything is disabled under `prefers-reduced-motion`.
- **Placeholders:** when there's no photo, a colour block with a large Bodoni initial or numeral, the segment tag, and a subtle graph-paper texture. There are no grey boxes.

### Layout adaptation by item count (per segment block)
| Count | standard | opinion | frontier | notice |
|---|---|---|---|---|
| 1 | single lead, wide | single column-quote | single dispatch | single notice |
| 2 | two-up | two-up | list | list |
| 3 | lead + 2 stacked | three-up | list | list |
| 4–6 | lead + grid of the rest | grid | list | list |
| 7+ | lead + 2 cards + compact list | grid of 3, then compact list | list | list |

The table of contents is always a list grouped by segment. Archive cards flow in an auto-fill grid that handles 0, 1 or hundreds of issues. With no issues, the home and archive pages show a designed "The first issue is in preparation" state.

## 8. Pages

- **Home:** masthead; latest issue's cover with the lead story; table of contents; segment blocks; signup band.
- **Issue page:** cover; editor's note (if any); table of contents; segment blocks. An issue with no articles shows a "Articles for this issue are on their way" state.
- **Article page:** segment tag, title, dek, byline (handles one or many authors with a clean "and"), mono date line, hero (or typographic hero), body, references, and a "Next in this issue" panel.
- **Archive:** a grid of issue covers in their own colours, newest first.
- **About, Team, Contact:** driven by `site.yaml` and `team.yaml`. The team grid handles any number of people; missing photos fall back to monogram tiles. Contact uses mailto links and social links only.
- **404:** "Specimen not found", styled, with links home and to the archive.
- **Footer on every page:** signup, links to all pages, club name.

## 9. Email signup (Kit)

- A reusable `<Signup>` component on the home page and in the footer. The form ID comes from `PUBLIC_KIT_FORM_ID`.
- **Method:** confirmed against Kit's current documentation at build time. The preferred option is a progressively enhanced form that POSTs to Kit's public form endpoint (the form ID is public, no secret), with `fetch` used where CORS allows. Otherwise it falls back to Kit's official embed script, styled to match.
- **States:** idle; invalid email (inline message); submitting; success ("Check your inbox and confirm your subscription"); error (with a retry link). A hidden honeypot field silently drops bot submissions. A short privacy line sits underneath.
- **When the variable is unset:** a "Signups opening soon" state with no input field.

## 10. SEO and sharing

- Per-page `<title>` and description.
- Canonical URLs built from `SITE_URL` (default: Vercel's production URL from `VERCEL_PROJECT_PRODUCTION_URL`, otherwise `http://localhost:4321`).
- Open Graph and Twitter cards. The image is the hero, then the cover, then a generated typographic card (1200×630, in that issue's theme).
- Sitemap, a robots.txt that points to the sitemap, and an RSS feed of articles (newest 50).

## 11. Image delivery guarantees

- Only images from the content folder (through the pipeline) or absolute `/public` paths are allowed. No raw relative strings to `src/`.
- `.gitignore` excludes only `node_modules`, `dist`, `.astro`, `.env*` (except `.env.example`) and `.vercel`. No image patterns.
- **After the build, `check-images` parses every HTML file in `dist`** (`img[src]`, `img[srcset]`, `source[srcset]`, `meta[property=og:image]`, `meta[name=twitter:image]`). For each URL it checks the file exists in `dist`, and fails the build on any missing file. It is chained into `npm run build`.
- A local preview with a headless browser confirms that images load on at least one article page in each sample issue.

## 12. Testing

- **Fixtures:**
  - `minimal`: 1 article, required fields only, no images.
  - `empty`: issue.md only.
  - `heavy`: 32 opinion articles, 120-character titles, 9-author bylines, several featured, very long body.
  - `sparse`: only The Frontier.
  - `partial-theme`: accent only, with a low-contrast accent to trigger the auto-darken warning.
  - `no-issues`: empty directory.
  - **Expected failures**, each asserting its error message: unknown segment, HEIC image, wrong-case image path, unquoted colon title, external image URL.
- **Unit tests (Vitest):** ordering, lead selection, layout-variant selection, theme merge and contrast maths, caption/credit parsing.
- **Screenshots:** mobile (390 px) and desktop (1440 px) of home, issue, article and archive for both sample issues and the heavy and minimal fixtures. Review them and adjust the design.
- **Deletion test:** remove the sample content, then build and check that it succeeds with empty states.

## 13. Sample content

- **Issue 2026-09:** preset `chlorophyll`; 1 Feature, 5 Opinion, 3 Frontier, 0 Announcements.
- **Issue 2026-10:** preset `cobalt`; 3 Feature, 1 Opinion, 2 Frontier, 2 Announcements.
- Every article is marked as a placeholder in its title and summary. One feature article has footnotes and a captioned figure (and a wide figure).
- Placeholder images are original abstract graphics generated for the project (no third-party photos).
- Everything lives in the two issue folders, which can be deleted safely.

## 14. Documentation (written last, from the code)

`_template/` (an example article with every field, footnotes, a captioned image, and `images/README.txt` as a placeholder file) · `AUTHORING.md` (one page, for authors) · `README.md` (for the publisher and admin, in plain language) · `.env.example`. The contents follow brief §13. Segment keys and field tables are copied from the real schema and segments.yaml.

## 15. Process rules

- Commits carry no Co-Authored-By or other added identities.
- Built and tested in the cloud workspace, then copied into the user's "newsletter project" folder without `node_modules`, `dist` or `.astro`.

## 16. Open inputs (asked when the step arrives; clearly marked placeholders until then)

1. Club logo file and confirmation of the brand palette (theming step).
2. Contact email and social links (Contact page).
3. Kit form ID (signup step; "opening soon" state until then).
4. Custom domain or base URL (SEO step).
5. Real About text and team members (placeholders, listed at the end).
