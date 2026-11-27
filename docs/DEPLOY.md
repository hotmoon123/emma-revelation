# Deploying to GitHub Pages (v1.11)

Public site:  https://hotmoon123.github.io/emma-revelation/
Studio:       https://hotmoon123.github.io/emma-revelation/studio/

## One-time setup (on GitHub)
1. Repo > Settings > Pages > **Build and deployment > Source = GitHub Actions**.
2. Push to `main`. The workflow `.github/workflows/deploy.yml` runs tests, builds and publishes.
3. Watch it under the **Actions** tab. The address appears in the deploy job.

## How it works
- `vite.config.ts` reads `VITE_BASE` (the workflow sets `/emma-revelation/`; locally it is `/`).
- `VITE_SITE_URL` fills the share-preview tags (og:image, og:url).
- `src/utils/basePath.ts` adds the sub-folder to paths typed in the Studio (`/audio/a.mp3`).

## Honest limits
- The Studio is **not private**. Its address is only unlisted (`noindex`). Do not put anything secret in it.
- A public repo shows the code and `public/content.json` to everyone.
- Studio edits live in the browser that made them. To publish: Studio > Export for publishing > replace `public/content.json` > commit and push.
- `robots.txt` is only read at the root of a domain, so on `github.io/emma-revelation/` it has no effect. The Studio page carries `noindex` instead.
- Custom domain later: set `VITE_BASE` to `/` and `VITE_SITE_URL` to the new address.

## Test the Pages build on your PC (PowerShell)
    $env:VITE_BASE="/emma-revelation/"; npm run build; npm run preview
    # open http://localhost:4173/emma-revelation/ and /emma-revelation/studio/
    Remove-Item Env:VITE_BASE
