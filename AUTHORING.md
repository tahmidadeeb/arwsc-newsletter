# Writing for the arw,sc newsletter

This page is for authors. You never need to touch the website itself: you hand the editors **one folder** for your article, and they publish it.

## 1. Start from the template

Copy the folder `_template/example-article/` and rename it after your article, using lowercase words joined by hyphens (for example `river-sampling-in-the-delta`). Rename the `.md` file inside to **exactly the same name**:

```
river-sampling-in-the-delta/
├── river-sampling-in-the-delta.md    ← your article
└── images/                           ← your pictures
    └── delta-map.jpg
```

Open the `.md` file in any plain-text editor (Notepad, TextEdit in plain-text mode, VS Code, or a Markdown app such as Typora or Obsidian). Do not use Word.

## 2. The header block

The top of the file, between the two `---` lines, holds the article's details.

**Required**

| Field | What to write |
|---|---|
| `title` | The headline. |
| `authors` | One name (`authors: Ana Rahman (65th MBBS)`), or a list with one name per line, each starting with two spaces, a dash and a space (`  - Ana Rahman (65th MBBS)`). Add your batch in brackets after your name, exactly as it should appear. **Frontier entries have no authors:** leave this line out for `segment: frontier`. |
| `segment` | The section: `announcements`, `feature`, `opinion` or `frontier` (exactly as written). |
| `summary` | One or two sentences describing the article. |

**Optional.** Delete any line you don't use.

| Field | What it does |
|---|---|
| `dek` | A one-line teaser shown under the headline. |
| `heroImage` | The large picture at the top, e.g. `images/delta-map.jpg`. |
| `heroAlt` | A description of that picture. **Required** if you use `heroImage`. |
| `heroCaption`, `heroCredit` | Caption and credit shown under the top picture. |
| `date` | Not shown anywhere on the site and not needed. If you add one, write it as year-month-day, e.g. `2026-11-05` (formats such as `05/11/2026` are rejected because they are ambiguous); it is only passed to feed readers and search engines. |
| `featured`, `order`, `draft`, `issue` | Set by the editors. Leave these out. |

**What readers see.** Each article shows its title, authors (with their batch), summary (and teaser, if any) and its section. Articles show **no dates and no article numbers**; the only numbers on the page are the section numbers (01, 02…) and the issue label, e.g. "Issue No. 2 · October 2026". The editors decide the order of articles within each section. Frontier dispatches are not listed under "In this issue"; they appear only in The Frontier section, with no author names.

**Quoting rule.** If a value contains a colon `:` or a `#`, put the whole value in double quotes:

```yaml
title: "Cells: a love story"      ✔
title: Cells: a love story        ✖  this breaks the header
title: We are #1 in science       ✖  everything after # would be lost
```

## 3. Writing the article

Below the header, write plain paragraphs separated by a blank line. You can use:

- `**bold**`, `*italic*`, `[link text](https://example.org)`
- `## Section heading`, and `### Smaller heading`
- `> A quotation` on its own line
- Lists starting with `-` or `1.`
- Tables, using `|` between columns (see the template)

**Footnotes.** Put a marker at the end of a sentence, `like this.[^1]`, then write the note at the very bottom of the file:

```
[^1]: Author A. Title of the paper. *Journal*. 2025;12(3):45–67.
```

They are numbered automatically and listed under **References**, with links back to the text.

## 4. Pictures

Put every picture in your article's `images/` folder, then refer to it like this:

```
![Description of the picture](images/delta-map.jpg "Caption text | Photo: Name")
```

- **The words in square brackets are required.** They describe the picture for readers who cannot see it.
- The text in quotes becomes the **caption**. Anything after ` | ` becomes the **credit**.
- Start the caption with `[wide]` for a full-width picture: `"[wide] Caption | Photo: Name"`.
- **Inside captions, use ‘single’ or “curly” quotes, never straight double quotes `"`.** A straight `"` inside the caption ends it early and breaks the picture.
- Pictures must be files in your `images/` folder. Links to pictures on other websites are not accepted.

**File names:** lowercase letters, numbers and hyphens only, such as `delta-map-2.jpg`. No spaces and no capital letters. `Delta Map.JPG` will be rejected, because the live website treats `Delta-Map.jpg` and `delta-map.jpg` as different files.

**Formats:** JPEG (`.jpg`), PNG (`.png`) or WebP (`.webp`). **HEIC** photos (the iPhone default) are not supported. On an iPhone, choose *Settings → Camera → Formats → Most Compatible*, or export the photo as JPEG.

**Size:** about 2400 pixels on the longest side is plenty. Files over 4000 pixels or 5 MB still work but slow the site down.

**Pictures pasted into the text.** Some editors paste a picture as a very long line starting with `data:image/…`. That won't work. Save the picture as a file in `images/` instead, delete the long line, and write `![description](images/file-name.jpg)`.

## 5. Credit and permission

Only send pictures you took yourself, made yourself, or have permission to use. Credit every picture, e.g. `Photo: Name` or `Figure: Journal name, CC BY 4.0`. Cite your sources in footnotes. Diagrams redrawn from a paper should say so (`Adapted from: …`).

## 6. Delivering your article

Send the editors **the whole folder**: the `.md` file plus its `images/` folder, zipped if you are emailing it. That's all. The editors add it to the issue, and the site updates within a few minutes.
