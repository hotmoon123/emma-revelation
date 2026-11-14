# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

---
## Project docs & commands
Project rules, design tokens, security notes, test plan and decisions live in [`docs/`](./docs). Email setup: copy `.env.example` → `.env.local`.

`npm run dev` · `npm run build` · `npm test` · `npm run lint`

- `docs/UX_RESEARCH.md`, `docs/WIREFRAMES.md`, `docs/ENGINEERING_BLUEPRINT.md`, `docs/openapi.yaml`: research plan, wireframes + hi-fi spec + heuristic audit, layer map, draft API contract.
- `docs/spec/`: requirement specification and methodology for the React Native + Django + PostgreSQL stack (`00_INDEX.md` first).


## Publishing (v1.1)
Public content lives in `public/content.json`. Studio (footer link) edits this browser's copy; **Export for publishing** produces a new `content.json` that contains only public data. See `RUN_ON_KALI.md` and `docs/DECISIONS.md` (ADR-019).

## Latest lessons round
See `docs/LESSONS_APPLIED_v2.md`, `docs/BRIEF.md` (owner questions) and `docs/tokens/emma.tokens.json`.

## Two apps (PLANNED, not in this commit)
The owner asked on 2026-10-19 for two apps: a public web app (visitors and bookers only) and an owner mobile app (React Native / Expo, Emma only). Plan: `docs/split/TWO_APPS_PLAN.md`. **This commit is still the single web app (build v1.3), which includes the in-browser Studio.** A first split was built and then lost in a workspace reset; it has to be rebuilt. `docs/split/WIP_web_app_split.patch` is the only surviving fragment (web side only, needs the missing `shared/` folder).

## Photos in 4K
1. Copy your full-size photos into `originals/` (e.g. `originals/emma-portrait.jpg`, 3840 px wide or more).
2. Run `npm run images` (first run needs `npm install`).
3. Run `npm run build`. Phones get small files; 4K screens get large ones. Photos are never enlarged.

## Two pages: visitors and Studio
- `/` is the public site. It has no Studio code and no link to Studio.
- `/studio/` is the owner page (open it by typing the address). It is hidden, not secured: there is no password because there is no server.
- Publish: Studio → **Export for publishing** → replace `public/content.json` → build and deploy.

## Share previews (WhatsApp / TikTok)
Create `.env.production` with `VITE_SITE_URL=https://your-real-address` (no trailing slash) and run `npm run build`. Without it the preview image address stays relative and many apps will not show it.

## Booking emails
Copy `.env.example` to `.env.local` and fill the three EmailJS values from your own EmailJS account (emailjs.com). Until then the form says honestly that nothing was sent and offers a "send from your mail app" button.

## Songs, photos and videos
- Audio: put files in `public/audio/` and give the track the link `/audio/name.mp3`. No file = the built-in worship pad.
- Media section: Studio → Profile → Media. YouTube, Vimeo, `.mp4`, or photos.
- 4K photos: see "Photos in 4K" above.
