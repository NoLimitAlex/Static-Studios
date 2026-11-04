# Versions on file

Every version is kept. Nothing here gets deleted without asking. This is the list
we compare against before anything ships.

**Working base: `v2/`.** That is where page-by-page work happens from 29 Oct 2026.

Run any of them from the preview launcher by name, or open the port directly.

| Folder | Port | Theme | Pages | Words | What it is |
|---|---|---|---|---|---|
| `v2` | 4624 | dark | 8 | 1,568 | **The working base.** Centred wordmark in the line field, nav at the bottom. The one Alex wants to build from. |
| `v2-light` | 4628 | light | 8 | 1,568 | Same content and structure as `v2`, light tokens. Only `:root` differs. |
| `v2-light-backup` | 4631 | light | 8 | 1,568 | Snapshot taken before the dark experiment, kept as a rollback point. |
| `v2-original` | 4625 | light | 7 | 785 | Reconstruction of the first v2, before the content expansion. |
| `v4` | 4629 | dark | 16 | 5,357 | The 29 Oct build: `/music/`, `/games/`, `/apps/` verticals, services hub, JSON-LD, dial. Parked, not shipped. Alex: "not what I envisioned", too much static. |
| `concept-static` | 4630 | light | 1 | 785 | The uploaded redesign-preview concept. Single file. |
| `concept-class` | 4626 | light | 1 | 785 | The site Alex built in class. Source of the static meter and the cursor-distorts-the-signal idea. |
| `concept-v3` | 4627 | light | 1 | 785 | The black-and-white edition from the private `Static-Studios-v3` repo. Source of the radio dial CSS. Trimmed version of `concept-class`. |

The live published site is **not** in here. It is the repo root, served on **4622**,
and it is the only thing a visitor can actually reach at staticstudios.io.

## Naming

- **"the original site"** means `v2`, the prototype. Not the live site.
- **"the published original site"** means the live staticstudios.io.

## What is in v4 worth keeping

Parked rather than discarded. If any of it gets pulled into `v2`, pull it
deliberately, one piece at a time:

- Organization and BreadcrumbList JSON-LD, and the Search Console verification meta.
- `CNAME`, `robots.txt`, `sitemap.xml`.
- The two case-study pages converted to dark with a breadcrumb trail.
- The dial degrading without JavaScript (`.cards.live` stacking).
- Harvey's share count reconciled to `256,894`, decimals normalised to `19.3%`.
- The `/games/` and `/apps/` copy, if the three-vertical structure survives.

## Open, not decided

- Whether the site splits into music / games / apps at all.
- The dial rebuild: vertical, zoomed, bands per vertical.
- A 2-line fix to the live site's `0M` placeholders is written but unpushed.

## Git versions of `v2` (from 4 Nov 2026)

| Version | Where | What it is |
|---|---|---|
| **v2.0** | git tag `v2.0` (commit b1691eb), snapshot `static-studios-v2-site-2026-11-04-v2.0.zip` in the OneDrive workspace | The prototype as reviewed by ChatGPT on 4 Nov 2026: plain gate with four names, music/games/apps sections, Learn more service pages, FAQ, creators section. Games/apps campaign pages are the "No signal yet" screens. |
| **v2.1** | branch `v2.1` (tag `v2.1` when finished) | Fixes from that review: no "we haven't run one yet" lines, "Harvey Hilton's campaign" instead of "our last campaign", games/apps playbook tuners, music tuner opens on Harvey, Harvey dates and engagement formula from the Apify export, KayAitchBee dates, email hint, one job per page (less repeated copy). |

**Going back to v2.0:** `git checkout v2.0` (look only) or `git checkout v2-prototype` (the branch stays on v2.0 until v2.1 is approved), or unzip the v2.0 snapshot.
