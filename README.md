# enshwick docs

The source of the [enshwick documentation site](https://enshwick.com/):
how players install and use mods, and how authors write them.

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
(`wrangler.jsonc`); `main` deploys it, and a pull request only builds it. [ARCHITECTURE.md](ARCHITECTURE.md) says which
pages are written here and which come from other repositories.

## Contributing

A player page is edited here; a developer page is edited in the repository
its "Edit page" link points to. The
[contributing guide](https://github.com/enshwick/.github/blob/main/CONTRIBUTING.md)
covers branches, commit messages and pull requests.

## License

[MIT](LICENSE).
