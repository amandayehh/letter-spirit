# Letter Spirit — gridfont editor

Draw gridletters in the *Letter Spirit* tradition. Built with Next.js and exported
as a static site.

- **`/`** — the full gridfont editor (letter switcher, `.ttf` download)
- **`/a`** — a pared-down editor locked to the letter *a*, with a share button
- **`/wall`** — a wall of every *a* you've shared

## Shared wall

Shared letters are stored in your browser's `localStorage`, so the wall is
per-device (the static GitHub Pages build has no server to share them across
visitors).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`.
