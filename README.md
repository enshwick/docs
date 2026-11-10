# Enshwick docs

Source of [enshwick.com](https://enshwick.com/), the site of Enshwick, the
modding framework and API for Enshrouded: guides for players and server admins,
docs for mod makers.

## Building

The site is [Astro Starlight](https://starlight.astro.build) on
[Bun](https://bun.sh).

```bash
bun install
bun run build    # fetches the generated pages, then builds into dist/
bun run dev      # the same, served with live reload
bun run check    # types, lint, tests and the built site in dist/
```

`bun run build` checks out the sources the site collects, so it needs
network access to GitHub. The site runs on a Cloudflare Worker
(`wrangler.jsonc`); Cloudflare Workers Builds deploys `main`, and CI only checks and builds.
The deploy build sets `CF_WEB_ANALYTICS_TOKEN`, which turns on Cloudflare Web
Analytics and the footer line about it; without it the site counts nothing.
[ARCHITECTURE.md](ARCHITECTURE.md) says which
pages are written here and which come from other repositories.

## The project's words on GitHub

The site is the source of the words the project's GitHub pages repeat.

- `site.description` in `src/data/texts.json` is the description of Enshwick.
  The organization's profile, its About text, the enshwick repository's About
  text and its README open with it.
- `src/data/repositories.json` holds the title of each repository and the
  description in its About box.
- The build draws a social preview image per repository from those words, in the
  look of the site's own cards: `https://enshwick.com/og/github/<name>.png`, such
  as [`/og/github/mods.png`](https://enshwick.com/og/github/mods.png). The
  `.github` repository's image is `/og/github/github.png`.
- Each image is 1280x640, the size GitHub asks for, with its text inside the
  middle 1200x600. The text gets smaller to fit; a title and description that
  still do not fit fail the build.

After a change to those words, set the description in the repository's settings
and upload the new image as its social preview.

## Contributing

A player page is edited here; a developer page is edited in the repository
its "Edit page" link points to. The
[contributing guide](https://github.com/enshwick/.github/blob/main/CONTRIBUTING.md)
covers branches, commit messages and pull requests.

## License

[MIT](LICENSE).
