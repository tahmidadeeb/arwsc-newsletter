# the arw,sc newsletter

The monthly newsletter website of the **Academic and Research Wing, Science Club – Rajshahi Medical College (ARW,SC)**.

This guide is for the **publisher/admin**. Authors only need [AUTHORING.md](AUTHORING.md).

**How it works, in one paragraph.** Every issue and article is a plain text (Markdown) file in this GitHub repository. When anyone adds or changes a file on GitHub, Vercel automatically rebuilds the website, which takes about a minute. Before each rebuild, the site checks every article. If something is wrong (a missing field, a misspelt image name), the rebuild stops with a plain-language message and **the live site stays exactly as it was**. Hosting is free on Vercel's Hobby plan, and nothing else needs to be paid for.

---

## 1. Ground rules

- **The repository must stay public.** Vercel's free plan only builds commits from people other than the account owner when the repository is public. Several people publish, so it has to be public.
- **Nothing secret goes in the repository**, because anyone can read it. All settings live in Vercel's *Environment Variables* (section 6).
- **Only one person (the admin) needs a Vercel login.** Publishers only need a GitHub account with write access to this repository.
- **Never rename or move a published issue or article folder.** The folder names are the web addresses (`/issues/2026-10/resistance-in-the-ward/`). Renaming one breaks every link that was shared.

## 2. Where things live

```
src/content/issues/
  2026-10/                      ← one folder per issue, named YEAR-MONTH
    issue.md                    ← the issue's details and editor's note
    images/cover.jpg            ← optional cover picture
    resistance-in-the-ward/     ← one folder per article (from the author)
      resistance-in-the-ward.md
      images/...
src/data/segments.yaml          ← the sections (Club Announcements, Feature Articles…)
src/data/themes.yaml            ← colour presets
src/data/team.yaml              ← the Editorial team page
src/data/site.yaml              ← club name, contact email, social links, About text
_template/example-article/      ← the article template authors copy
_template/new-issue/issue.md    ← the issue template (with a space for the editor's note)
```

## 3. Publishing a new issue (using GitHub's website)

1. Open the repository on github.com and go into `src/content/issues/`.
2. **Create the issue file, as a draft.** Click **Add file → Create new file**. In the name box type `2026-11/issue.md` (the slash creates the folder). Paste in the contents of `_template/new-issue/issue.md` and fill it in. It starts with `draft: true`, which keeps the half-finished issue hidden while you add articles.

   **Editor's note:** write it below the second `---` line, replacing the template's instructions. It appears at the top of the issue page and, shortened, on the home page. If the issue has no note, delete everything below the `---` line. Click **Commit changes**.
3. **Add the articles.** Open the new `2026-11` folder, click **Add file → Upload files**, and drag in each article folder that authors sent (the folder with the `.md` file and its `images/` folder). Click **Commit changes**. The live site doesn't change yet, but the build still checks the new articles, so fix any ✖ before going on.
4. **Publish.** Open `issue.md`, click the pencil (edit) icon, delete the `draft: true` line, and commit. About a minute later the new issue is live and becomes the home page (the newest `publishDate`, otherwise the newest folder name).

**To check a build:** on GitHub, the commit shows a ✔ or ✖ next to it. Click it, then **Details**, to open Vercel's log. Problems are listed in plain English near the top, under "Checking content".

### issue.md fields

| Field | Required | Notes |
|---|---|---|
| `issueNumber` | yes | A whole number, no quotes. Shown as "Issue No. 3". |
| `title` | yes | The issue's theme or title. |
| `monthLabel` | no | Defaults to the folder's month, e.g. "November 2026". |
| `publishDate` | no | Defaults to the 1st of the folder's month. Decides which issue is "latest". |
| `coverImage`, `coverAlt` | no | A cover picture in the issue's `images/` folder (`coverImage: images/cover.jpg`) plus a description of it. Without one, the cover is a colour block with the issue number. |
| `theme` | no | A preset name or your own colours (below). Defaults to the brand theme. |
| `draft` | no | `draft: true` hides the whole issue from the live site. |

### Article options the editors set

In an article's header: `featured: true` makes it the issue's **lead story** (if several are featured, the one with the lowest `order` wins). Without it, the lead is the article with the lowest `order`; Club Announcements are skipped unless the issue has nothing else. `order: 1, 2, 3…` sets its position within its section; this is the only thing that decides article order (dates play no part). Give every article in a section its own number. Articles without one go after the numbered ones, alphabetically by title, and the build warns about missing or repeated numbers. `draft: true` hides it.

**What readers see.** Articles show no dates and no article numbers: not on cards, in the "In this issue" list, on Frontier dispatches, on announcements or on the article page. An article's `date` is optional and only goes to the RSS feed and search engines (without one, the 1st of the issue's month is used). Sections are numbered 01, 02… in the order of `segments.yaml`, and issues are labelled in full, e.g. "Issue No. 2 · October 2026".

## 4. Colour themes

Each issue can have its own colours on its cover, its pages and its archive card. In `issue.md`, use either a preset:

```yaml
theme: cobalt        # or: brand, chlorophyll, saffron, oxblood
```

or your own colours (any you leave out come from the brand theme):

```yaml
theme:
  accent: "#1d3fbf"        # covers, labels and links
  background: "#f4f0e6"    # the paper colour
  ink: "#121212"           # body text
  secondary: "#c8412b"     # optional
```

You can also start from a preset and change one colour: `theme: { preset: cobalt, accent: "#0b5394" }`.

The site checks readability automatically:

- If **text on the background** is too faint (below the WCAG AA 4.5:1 standard), the build stops and suggests a darker colour.
- If the **accent** is too light to read as link text, the site uses a darker shade for text and prints a warning with that shade, so you can adopt it.

**New presets** go in `src/data/themes.yaml`. The **brand** theme comes from the club logo: accent `#006c85` (the logo teal, deepened so it's readable as text) and the exact logo teal `#0e94b1` as the secondary colour. The home page uses the latest issue's theme. All other pages that don't belong to an issue (archive, about, team, contact) use the brand theme.

## 5. Sections, team, and club details

- **Sections:** edit `src/data/segments.yaml`. Each entry has a `key` (what authors write in `segment:`), a `label` (the heading readers see), an `order`, and a `treatment` (the visual style: `standard`, `opinion`, `frontier` or `notice`). Add, rename, reorder or delete entries; no code changes are needed. If an article uses a key that no longer exists, the build stops and lists the valid keys. A section with no articles in an issue simply doesn't appear.
- **Editorial team:** edit `src/data/team.yaml`. Each person needs `name` and `role`, and may have `bio` and `photo`. For a photo, upload it to `public/team/` and write `photo: /team/file-name.jpg`.
- **Club details:** `src/data/site.yaml` holds the contact email, social links, About text and joining text.

### Changing any text on the website

Every piece of reader-facing text that isn't part of an issue lives in one of three files in `src/data/`. To change one: open the file on github.com, click the pencil (edit) icon, change the text after the colon, and click **Commit changes**. The site updates in about a minute. Keep the indentation exactly as it is, and put text containing a colon (`:`) or `#` in "double quotes".

| What you see on the site | File | Line to edit |
|---|---|---|
| Club name (under the title, footer, About page) | `site.yaml` | `clubName` |
| Short name in the footer (© ARW,SC) | `site.yaml` | `shortName` |
| One-line description used by search engines and share previews | `site.yaml` | `tagline` |
| Contact email | `site.yaml` | `contactEmail` |
| Facebook and other links (Contact page, footer) | `site.yaml` | `social` (a `label` and `url` per link) |
| About page: large opening sentence | `site.yaml` | `about` → `intro` |
| About page: the paragraphs below it | `site.yaml` | `about` → `body` (one `- ` line per paragraph) |
| About page: the description beside each section | `segments.yaml` | `description` of each section |
| Contact page: large text at the top (joining the club) | `site.yaml` | `join` → `text` |
| Contact page: note under the email address | `site.yaml` | `contact` → `note` |
| Editorial team page: sentence under the heading | `site.yaml` | `team` → `intro` |
| Editorial team: names, roles, photos, short bios | `team.yaml` | one entry per person |
| Email signup box: headings, description, "coming soon" text, privacy line, success message | `site.yaml` | `signup` → `heading`, `footerHeading`, `text`, `comingSoon`, `privacy`, `success` |
| "Page not found" message | `site.yaml` | `notFound` → `text` |
| Section names (Club Announcements, Feature Articles…) | `segments.yaml` | `label` |

**Search for "PLACEHOLDER".** Every text that still needs real wording is marked `PLACEHOLDER` in these files. Replace each one before launch. On github.com, press `.` on the repository page to open the web editor, then use its search box.

Fixed interface wording, such as "In this issue", "Lead story" and "Read the story", is part of the design and lives in the code. Ask a developer if you want to change it.

## 6. Settings in Vercel (Environment Variables)

In Vercel: **Project → Settings → Environment Variables**. After changing one, go to **Deployments → ⋯ → Redeploy** for it to take effect.

| Name | What it is |
|---|---|
| `PUBLIC_KIT_FORM_ID` | Your Kit form's ID (the number in the form's embed code). While empty, the site shows "Signups opening soon". The ID is public by design, so it's not a secret. |
| `SITE_URL` | The site's public address, e.g. `https://newsletter.example.edu`. Leave it empty until you have a custom domain; Vercel's own address is used automatically. **Set it when you connect a custom domain** so share previews, the sitemap and the RSS feed use the right address. |

**About the RSS feed (`/rss.xml`):** it's a machine-readable list of new articles for feed-reader apps (Feedly, Inoreader and similar). It isn't meant to be opened in a browser, which shows it as raw code, so it isn't linked on the site. Feed readers find it automatically from the site's address.

**Email signups (Kit).** The signup form sends addresses straight to Kit's public form endpoint. Kit's double opt-in is on by default, so people are told to check their inbox and confirm. After adding the form ID, **sign up once yourself** to check that the confirmation email arrives. If it doesn't, use Kit's own embed code (Kit → your form → Embed → JavaScript), and ask a developer to replace the form in `src/components/Signup.astro`.

## 7. First-time setup (admin, once)

1. **GitHub:** create a new **public** repository and upload everything in this folder (on github.com: *Add file → Upload files*, drag in the files and folders, commit). Under *Settings → Collaborators*, add the publishers.
2. **Vercel:** sign up at vercel.com with your GitHub account (Hobby plan, free). Click **Add New → Project**, pick the repository, and click **Deploy**. The settings come from `vercel.json`, so nothing needs changing. The build runs the content check, builds the site, and then confirms every image exists.
3. **Domain (optional):** Vercel → Project → Settings → Domains. Afterwards, set `SITE_URL` (section 6).
4. Add `PUBLIC_KIT_FORM_ID` when the Kit form is ready.

The site uses Node.js 24, set in `package.json`. Vercel picks this up automatically.

## 8. Common build messages

| Message says… | What to do |
|---|---|
| `The segment "x" does not exist` | Change `segment:` to one of the listed keys, or add the section to `segments.yaml`. |
| `put the title in quotes` | Wrap the value in double quotes: `title: "Cells: a story"`. This also applies to a ` #`, as in `title: "We are #1"`. Without quotes, everything after the # is lost. |
| `not a date the site understands` | Write dates as year-month-day, e.g. `2026-11-05` (not `05/11/2026`). An article's `date` can also simply be deleted. |
| `no order number` / `both have order` | Two articles in one section share an order number, or one has none. Give each article in the section its own `order: 1`, `order: 2`… |
| `secondary text … below 4.5:1` | Your `ink` colour is readable, but the paler version used for summaries and captions isn't. Use the suggested darker ink. |
| `The capital letters differ` | Rename the image file to all lowercase, and write it the same way in the article. |
| `contains spaces` / `capital letters` (file name) | Rename the image, e.g. `My Photo.JPG` → `my-photo.jpg`, and update the article. |
| `HEIC/HEIF photo` | Convert to JPEG and update the file name. |
| `points to a web address` | Download the picture (with permission) into `images/` and refer to it as `images/name.jpg`. |
| `data:image string` | A picture was pasted as text. Save it as a file in `images/` instead. |
| `no alt text` / `heroAlt … missing` | Describe the picture inside the `[ ]`, or add `heroAlt:`. |
| `straight double quotes` | Use ‘single’ or “curly” quotes inside image captions. |
| `The article file must be named x.md` | The `.md` file must have the same name as its folder. |
| `This issue folder has no issue.md` | Create `issue.md` (section 3). |
| `not named like YYYY-MM` | Issue folders are named year-month, e.g. `2026-11`. |
| `contrast … below the 4.5:1 minimum` | Use the suggested darker ink, or a lighter background. |
| `Image check: … do not exist` | An image path in a generated page is broken. Check the article named in the message. |

Warnings (⚠) never stop the build. Common ones are an issue with no articles yet, several featured articles, a very large image, or a light accent colour.

## 9. Running the site on your own computer (optional)

You need [Node.js 24](https://nodejs.org). In this folder:

```
npm install
npm run dev          # live preview at http://localhost:4321 (restart it after adding a new article folder)
npm run build        # the same checked build Vercel runs
npm run preview      # view the built site
```

For developers:

- `npm test`: unit and build tests.
- `npm run test:fixtures`: the stress tests in `tests/fixtures/`. These cover a minimal issue, an empty issue, a 33-article issue, an issue with a single section, a partial theme, no issues at all, a set of broken articles that must be rejected, and deleting the sample content. Fixtures are never published.
- `npx tsx scripts/screenshots.ts` and `npx tsx scripts/qa-images.ts`: local visual and image checks against `npm run preview`.

## 10. The sample content

The two sample issues (`2026-09`, `2026-10`) are placeholders, marked "Placeholder:" in every title. **Delete both folders** when the first real issue is ready; the site builds fine with no issues at all and shows a "first issue is in preparation" page. The sample pictures are original abstract illustrations, not photographs.
