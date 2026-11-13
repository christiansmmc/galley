# Galley site

The landing page at https://christiansmmc.github.io/galley/ (Astro, static).

```bash
pnpm install
pnpm dev      # http://localhost:4321/galley/
pnpm test     # unit tests (i18n, theme, releases)
pnpm build    # static output -> dist/
```

The Download section fetches `releases/latest` from this repo through the
public GitHub API (client-side), so a new GitHub Release shows up on the site
without a rebuild. Installer preference: `.rpm` → `.deb` → `.msi`/`.exe`, then
the first asset; with no release it links to the releases page.

Pushing to `master` with changes under `site/` runs
`.github/workflows/pages.yml`, which builds the site and publishes it to
GitHub Pages.
