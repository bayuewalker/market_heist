# Market Heist

Landing page for Market Heist AI — a tactical AI analyst and assistant for traders.

## Stack

- [Next.js](https://nextjs.org) (App Router, static export)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- lucide-react

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — static production build (outputs to `out/`)
- `npm run start` — serve the built `out/` folder locally
- `npm run lint` — run ESLint

## Project structure

- `app/` — routes, layout, and global styles
- `components/` — page sections (`Header`, `Hero`, `HowItWorks`, `Pricing`, `Testimonials`, `FAQ`, `FooterCTA`) and `components/ui` primitives (`Button`, `Card`, `Container`, `SectionHeading`)
- `data/` — content arrays for nav links, pricing plans, testimonials, FAQ, and process steps

## Deployment (GitHub Pages)

The site builds as a static export (`output: "export"` in `next.config.ts`) and deploys automatically to GitHub Pages via `.github/workflows/deploy-pages.yml` on every push to `main`.

One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**. After that, the workflow builds and publishes the site on each push to `main`; the URL will be `https://<owner>.github.io/market_heist/`.

The build sets `GITHUB_PAGES=true` so `next.config.ts` applies the `/market_heist` `basePath`/`assetPrefix` required for a project page. Building locally with plain `npm run build` (no env var) keeps an empty base path.
