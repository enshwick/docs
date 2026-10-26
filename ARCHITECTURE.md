# Architecture

A static site built with Astro Starlight on Bun. Two areas share it: the
player area is the default, and the developer area lives under `/dev/` with
its own sidebar, badge and accent. Player pages describe the current release;
developer pages are versioned per API minor.

## Where pages come from

| Pages | Written in | Reaches the site |
| --- | --- | --- |
| player area: tutorial, how-to guides, reference, explanation | `src/content/docs/`, one folder per language beside the root language | as committed |
| developer area | the book of [enshwick/enshwick](https://github.com/enshwick/enshwick/tree/main/book/src), where its examples compile as doctests | `tools/fetch.ts` checks out each version's ref and converts the chapters |
| one page per mod | `docs/player.md` of each mod repository, and `docs/player.<language>.md` for each translation | `tools/fetch.ts` reads them at the mod's newest release tag, checks the front matter and adds the settings table |
| compatibility | the platform's build tables and each mod's `Cargo.toml` at its release | `tools/fetch.ts` writes `src/generated/compatibility.json`, which `src/components/compatibility.astro` renders |
| `llms.txt` | the developer pages, with a map of the API crate's public modules | `tools/fetch.ts` fails when a public module of the API crate has no developer page that names it |

Generated pages are never committed: `tools/fetch.ts` writes them before every
build into `src/content/docs/dev/` and the `mods/` folders, and its data into
`src/generated/`. `bun run check:player-page <files>` checks a mod's player
pages against the same schema before they are released.

## Sets that grow are data

| Set | One source |
| --- | --- |
| languages | `src/data/languages.json`; a language is a list entry and a folder of pages, and a page missing in it falls back to the root language |
| the site's own short texts | `src/data/texts.json`, every key in every language (checked by a test) |
| developer versions, the mods with a page | `src/data/sources.json` |
| the site's address | `src/data/site.json`; pages link root-relative (`/guides/install/`) and `src/plugins/remark-base-links.ts` adds the base |

## Layout

| Path | What |
| --- | --- |
| `astro.config.ts` | the site: Starlight, its plugins, the two sidebars |
| `src/content.config.ts` | the page schema: Starlight's, a topic and the Diátaxis page type |
| `src/content/docs/` | the player pages, `uk/` and other language folders beside them |
| `src/data/` | the data files above |
| `src/site/` | the nominal types and the readers of the data files |
| `src/plugins/` | the Markdown plugin that adds the base to links |
| `src/components/` | Starlight component overrides: the head marks the area for its accent |
| `src/styles/brand.css` | the brand's colours and fonts as Starlight variables |
| `src/assets/`, `public/` | the mark, favicons and the social banner |
| `tools/fetch.ts`, `tools/lib/` | the build step that collects generated pages |

## Checks

`bun run check` runs `astro check`, oxlint with type information and the
tests; `bun run build` fails on a broken internal link
(`starlight-links-validator`). Git hooks run oxfmt, oxlint, markdownlint and
typos on changed files.
