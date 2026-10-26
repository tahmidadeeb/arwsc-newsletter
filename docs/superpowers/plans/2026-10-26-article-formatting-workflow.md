# Article Formatting Workflow Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to carry this out article by article. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each author-supplied article into a publish-ready folder (`<slug>/<slug>.md` + `images/`) that passes the site's content check and renders correctly.

**Architecture:** No code changes. Each article goes through the same steps: take in the source, convert it to Markdown, fill in the header, prepare the images, run the checked build, look at the page. The finished folders go into `src/content/issues/<YYYY-MM>/` on the editor's computer.

**Tech Stack:** Astro 7 content collections (schema in `src/content.config.ts`), remark-gfm footnotes and tables, `scripts/validate.ts` (`npm run validate`), `npm run build`, `npm run preview`.

**Spec:** `AUTHORING.md` (author rules) and `README.md` §2–3, §8 (publisher rules). Reference sample: `src/content/issues/2026-10/resistance-in-the-ward/`.

## Global Constraints

- Folder name = file name = slug: lowercase words joined by hyphens. Once an article is published, its slug is never renamed.
- Required header fields: `title`, `authors`, `segment` (one of `feature`, `opinion`, `frontier`, `announcements`), `date` (YYYY-MM-DD), `summary`.
- Any header value that contains `:` or `#` goes in double quotes. To be safe, quote every string value.
- `heroImage` requires `heroAlt`. Every inline image needs alt text in `[ ]`.
- Image captions: `"Caption | Credit"`. Start with `[wide]` for a full-width image. **No straight `"` inside a caption**; use curly quotes instead.
- Image files go in `images/` only: lowercase, digits and hyphens, `.jpg`/`.png`/`.webp`, no HEIC, no web URLs, no `data:image`. Longest side about 2400 px, file under 5 MB.
- Footnotes use the format `[^n]` and the notes go at the bottom of the file. The site numbers them and lists them under "References".
- Headings inside the body start at `##` (the title is the page's H1). Paragraphs are separated by a blank line.
- Articles are in English only.
- `featured`, `order`, `draft` and `issue` are set by the editors only.

## Review Focus

1. **Word/Google Docs artefacts:** smart-quote or dash characters, non-breaking spaces, manual numbering, soft line breaks and tab indents survive conversion. A reader should see clean paragraphs and real lists.
2. **References written as `[1]`, superscripts or an end list:** these must become `[^n]` footnotes linked to the right sentence. Leaving them as plain text gives a dead list.
3. **Images embedded in the .docx:** these must be extracted, renamed, converted (EMF/WMF/HEIC → PNG/JPG) and placed where they sat in the text, with alt text and credit.
4. **Tables:** merged cells, multi-line cells or table images. GFM tables can't merge cells, so these need flattening or must stay as an image with a caption.
5. **Special characters:** Greek letters, µ, ±, ≥, sub/superscripts (CO₂, 10⁶), italic species names. These must display correctly, using Unicode or `<sub>`/`<sup>`.

---

### Task N (one per article): Format "<article title>"

**Files:**
- Create: `src/content/issues/<YYYY-MM>/<slug>/<slug>.md`
- Create: `src/content/issues/<YYYY-MM>/<slug>/images/*`

- [ ] **Step 1: Take in the source.** Record the format (docx/pdf/text), the segment, the authors, any images and their credits, the reference style, and anything unclear. Ask the editor about anything unclear *before* converting.
- [ ] **Step 2: Convert the body to Markdown** (pandoc for .docx, then clean up by hand). Fix each item in Review Focus 1, 4 and 5. Change only formatting, never the author's wording, unless the editor approves a change.
- [ ] **Step 3: Convert the references** to `[^n]` markers at the citing sentences, with the notes at the bottom in Vancouver style, as in the template.
- [ ] **Step 4: Prepare the images.** Extract them, rename to `<slug>-fig-1.jpg` style names, convert and resize to ≤2400 px. Write alt text, caption and credit for each. Choose `heroImage` if one is suitable.
- [ ] **Step 5: Write the header.** Fill in the required fields, plus `dek`/hero fields where they apply. Quote all strings.
- [ ] **Step 6: Run the check.** Run: `npm run validate`. Expected: no ✖ entries for this article.
- [ ] **Step 7: Build and look at the page.** Run: `npm run build && npm run preview`, then screenshot `/issues/<YYYY-MM>/<slug>/` on desktop and on a phone-width screen. Expected: drop cap on the first paragraph, captions and credits split correctly, footnotes listed under References with working back-links, tables scroll sideways on mobile, no broken images.
- [ ] **Step 8: Deliver.** Write the folder into the issue folder on the editor's computer, and report any judgement calls made.

### Final task: Issue assembly
- [ ] Create or update `issue.md` from `_template/new-issue/issue.md` (`issueNumber`, `title`, `theme`, `draft: true`, editor's note).
- [ ] Set `featured`/`order` as the editor directs.
- [ ] Run the full `npm run build`. Expected: passes, and warnings are reviewed.
