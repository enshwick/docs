# Architecture

A static site built with Astro Starlight on Bun. Two areas share it: the
player area is the default, and the developer area lives under `/dev/` with
its own sidebar, badge and accent. Player pages describe the current release;
developer pages are versioned per API minor.

## Where pages come from

| Pages | Written in | Reaches the site |
| --- | --- | --- |
| player area: tutorial, how-to guides, reference, explanation | `src/content/docs/`, one folder per language beside the root language | as committed |
| developer area | the book of [enshwick/enshwick](https://github.com/enshwick/enshwick/tree/main/book/src), where its examples compile as doctests | `tools/fetch.ts` checks out each version's ref and converts the chapters. Each chapter's page type and description come from the comment it opens with (`<!--` and `-->` on lines of their own around a `type:` and a `description:` line), which enshwick's `cargo xtask check` requires; the build fails on a chapter without a type |
| one page per mod | `<mod>/docs/player.md` of [enshwick/mods](https://github.com/enshwick/mods), and `<mod>/docs/player.<language>.md` for each translation | `tools/fetch.ts` reads them at the newest regular release that carries the mod's archive `<package>.zip`, else at the newest prerelease that does whose tag names a version, such as an alpha, else at a rolling prerelease such as `dev`, and checks the front matter. Each page gains the settings table, its front matter's pictures and loops after the opening list, and its front matter the facts of the mod card. A loop is an MP4 or WebM with a WebP or AVIF poster; it waits on the poster until the reader plays it |
| one page per error code, and `/errors.json` | the platform's `errors.toml` | `tools/fetch.ts` writes the pages and `src/generated/errors.json`, which `src/pages/errors.json.ts` serves |
| stability badges on API pages, and Stable or Unstable on the API coverage page | the book's stability chapter and the API crate's public modules | `tools/fetch.ts` writes `src/generated/stability.json`, and every module and item the chapter's unstable table names into `src/generated/unstable.json` |
| the whole mod on the front page | the example the book's getting started chapter marks with `smallest-mod` comments, compiled there as a doctest | `tools/fetch.ts` writes `src/generated/smallest-mod.rs` and fails when the chapter no longer marks it |
| the mod with settings on the page for AI assistants | the example the book's altars chapter marks with an `altar-count` comment, compiled there as a doctest | `tools/fetch.ts` writes `src/generated/altar-count.md` and fails when the chapter no longer marks it |
| a social card per page | each page's title and description | `src/pages/og/` draws them at build time over the same night as the front page |
| compatibility | the platform's compatibility reports and each mod's `Cargo.toml` at its release | `tools/fetch.ts` writes `src/generated/compatibility.json`, which `src/components/compatibility.astro` renders |
| `llms.txt` | the developer pages, with a map of the API crate's public modules | `tools/fetch.ts` fails when a public module of the API crate has no developer page that names it |

Generated pages are never committed: `tools/fetch.ts` writes them before every
build into `src/content/docs/dev/` and the `mods/` folders, a mod's pictures beside its page in
every language, its loops into `public/mods/`, and its data into `src/generated/`. Each generated page carries the date of the last commit that
changed its source. A page without one shows no date. `bun run check:player-page <files>` checks a mod's player
pages as the build does, and the mods repository runs it on every change to them: the front
matter's schema, screenshots together with the game version they show, a poster for every loop, an opening list of at most
five changes, and a line naming Enshwick.

## Sets that grow are data

| Set | One source |
| --- | --- |
| languages | `src/data/languages.json`; a language is a list entry and a folder of pages, and a page missing in it falls back to the root language; `src/route-data.ts` keeps such a fallback out of search, the languages list and the sitemap |
| the site's own short texts | `src/data/texts.json`, every key in every language (checked by a test) |
| developer versions | `src/data/sources.json` |
| our mods | the mods repository named in `src/data/sources.json`: every member of its Cargo workspace on `main` with a `docs/player.md`, the folder giving the page's address. A mod without a release yet has no page. `src/data/mods.json` gives each one who needs it and a one-line summary per language; the build fails when that side differs from the mod's page |
| links outside the site | `src/data/links.json`: GitHub, Nexus Mods, the Vortex extension, the download, the licence, the issue forms, the contributing guide and the mailboxes |
| API coverage | `src/data/coverage.json`: one row per game area and capability, with its status and, where covered, the API items or a note; `src/site/coverage.ts` fails the build when an area misses a capability or repeats one, and `src/components/api-coverage.astro` renders `/dev/api-coverage/` from it |
| download links | pages and `src/data/links.json` link an archive as `https://github.com/<repository>/releases/latest/download/<archive>`; `tools/fetch.ts` writes the release of each archive, picked as for mod pages, into `src/generated/release-archives.json`, and `src/plugins/remark-release-links.ts` and `src/site/links.ts` pin the links to it, so before 1.0 they reach the newest alpha. The build fails on a link to an archive of the platform or the mods that no release carries, and when the platform has no release with `enshwick.zip` |
| install and dependency lines | a page's code names the platform's tag as `--tag v<version>` or `tag = "v<version>"` beside its GitHub address; `tools/fetch.ts` writes the release it picked for `enshwick.zip` into `src/generated/release-tags.json`, and `src/plugins/remark-release-tags.ts` pins each such tag to it, so a page written for one alpha installs the newest; a placeholder such as `v1.0.0-alpha.N` stays |
| the site's address | `src/data/site.json`; pages link root-relative (`/guides/install/`) and `src/plugins/remark-base-links.ts` adds the base |

## Layout

| Path | What |
| --- | --- |
| `astro.config.ts` | the site: Starlight, its plugins, the two sidebars |
| `src/content.config.ts` | the page schema: Starlight's, a topic and the Diátaxis page type |
| `src/content/docs/` | the player pages, `uk/` and other language folders beside them |
| `src/data/` | the data files above |
| `src/site/` | the nominal types and the readers of the data files |
| `src/plugins/` | the Markdown plugins: one adds the base to links, one pins download links to their release, one puts every table in a frame that scrolls on its own |
| `src/components/` | Starlight component overrides (the head, the bar, the page frame, the sidebar, the page title and the footer) and the site's own parts, such as the front page and the night sky |
| `src/scripts/` | the browser code: the front page's fog shader. It runs only where WebGL works and the reader welcomes motion, and it pauses while the hero is out of sight |
| `src/pages/` | routes beside the docs: the error index and the social cards |
| `src/styles/` | `tokens.css` holds the brand's values, dark only; `brand.css` maps them onto Starlight and styles the docs, `night.css` the night, `front.css` the front page |
| `src/assets/`, `public/` | the logo and the services' marks, the favicons and the logo for search engines; `robots.txt`, `security.txt` and `_headers` for the host, which caches pages for a minute and built files for good; `_redirects` for old addresses, such as the sitemap's, which `src/site/sitemap-file.ts` moves to `/sitemap.xml` after the build |
| `wrangler.jsonc` | the Cloudflare Worker that serves `dist/` |
| `tools/fetch.ts`, `tools/lib/` | the build step that collects generated pages |
| `tools/check-dist.ts` | the check of the built site |

## Checks

`bun run check` runs `tools/check-types.ts` (TypeScript 7 `tsc` with `@astrojs/ts-content-mapper` for
`.astro` files, over the strictest settings, ignoring errors in packages' own sources), oxfmt,
oxlint with type information and the code style rules in `.oxlintrc.json`, the
tests and `tools/check-dist.ts`, which reads the built site for links outside
the site's root, canonical addresses, fallback pages in the sitemap, pages on two paths and tables
outside their scrolling frame. It needs `bun run build` first, which fails on a broken internal
link (`starlight-links-validator`). A test runs `tools/lib/code-rules.ts` over every tracked
TypeScript and Astro file for the rules oxlint has none for: no `const enum`, no re-export, no
exported function outside a class but Astro's route handlers, a reason on the line above every
suppression, and tests only in `__tests__`. In Astro files only the suppression rule applies; the
syntax rules read `.ts` files. `tools/check-prose.ts` fails a player page in any language on a
picture that is a GIF, is not WebP or AVIF, has no alt text, is missing or is over 200 KB, a
sentence over 25 words or a paragraph over three sentences, and an English player page also on
"simply", "just" or "easy"; it prints an English page's average sentence length and reading grade
when they pass their target, without failing. `tools/check-player-page.ts` holds a mod's pages to
those rules, and a pull request that changes `tools/`, `src/site/` or a dependency runs it over
every mod page on the mods repository's `main`.
`tools/check-prose.ts` also holds every text in `src/data/texts.json`, the front page's among
them, to the same word, sentence and paragraph limits, in each site language that has its own
text. Git hooks run oxfmt, oxlint, markdownlint and typos on changed files, and [actionlint](https://github.com/rhysd/actionlint)
and [zizmor](https://docs.zizmor.sh) when a workflow changed.

The maintainers check the prose of English and Ukrainian pages with
[Vale](https://vale.sh) and their own tooling, kept outside this repository.
