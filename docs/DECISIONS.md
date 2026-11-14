# DECISIONS (permanent)
**ADR-001** Vite SPA, no backend in V1. *Why:* portfolio needs speed to ship; data volume is tiny; JSON backup gives portability.
**ADR-002** Empty defaults, content entered via manager. *Why:* owner requirement — nothing hardcoded; avoids fake data shipping.
**ADR-003** No simulated email success. *Why:* telling a visitor "sent" when it wasn't is deceptive; show saved/not-configured/failed honestly + `mailto:` fallback.
**ADR-004** Manager is unauthenticated in V1 (documented in SECURITY.md). *Why:* real auth requires a server. *Next:* Supabase/Clerk or similar when multi-device editing or a shared published site is needed.
**ADR-005** Removed the fake live-stream WebSocket telemetry. *Why:* it invented cities, tracks and counts.
**ADR-006** Lazy-load manager + Three.js. *Why:* visitors never need the manager; 3D is decorative.
**ADR-007** Flat white/blue content; glassmorphism only on the header and player, with fallbacks. *Why:* the owner specified a clean white/blue system; blur is useful only where UI floats over scrolling content. Opaque fallbacks for `prefers-reduced-transparency`, `prefers-contrast: more`, `forced-colors`, no-`backdrop-filter` browsers. *Rejected:* neumorphism (fails 3:1 non-text contrast), Apple "Liquid Glass" (native-only material, not reproducible in CSS).
**ADR-008** Data-access repository (`src/data/repositories.ts`) over localStorage, same keys, plus schema version and migrations. *Why:* UI never touches storage directly, so a future API/database swap is one line (`portfolioRepository`) and existing owner data survives. *Next:* `HttpPortfolioRepository` per `docs/openapi.yaml` when a backend exists.
**ADR-009** Minimum 44px touch targets by a global CSS rule (`.target-auto` opts out). *Why:* UX audit found 30 undersized targets; fix measured to 4 remaining, all exempt (sliders, checkbox, 24px mute button >= WCAG 2.5.8).
**ADR-009a** Player inset is measured, not guessed: `usePlayerInset` publishes the player's real height as `--player-h`; `#main` pads `max(8rem, --player-h + 1.5rem)`. *Why:* a fixed `pb-32` (128px) was too small on phones, where the player wrapped to 215px and covered the footer. `pb-32` remains the minimum. The mobile player was also compacted to about 129px.

## PROPOSED (RN + Django + PostgreSQL migration; full text in `spec/03_ARCHITECTURE_SDD.md` §15; not accepted until the owner answers D1-D8)
**ADR-010 (proposed)** Public web page for organisers + RN app for owner/band. **ADR-011** No WebSockets in MVP. **ADR-012** Django version decided by spike S2 (default 5.2 LTS → 6.2 LTS in 2027). **ADR-013** Services + selectors, no extra backend repository layer. **ADR-014** Persisted query cache + outbox instead of WatermelonDB. **ADR-015** Owner auth = password + TOTP, JWT with rotation in SecureStore. **ADR-016** Errors per RFC 9457; OpenAPI generated. **ADR-017** Audio via `expo-audio`; worship pad via spike S1. **ADR-018** Modular monolith.

## ACCEPTED under the frontend-only rule (2026-10-05, UX/UI implementation v1.1; owner: "develop the app with everything we have decided")
**ADR-019** Published content file. Visitors read `public/content.json`; Studio has **Export for publishing**, which writes only the profile, tracks and events marked *Shown on Site* (contact details, fees, deposits, inquiries and setlists are stripped). *Why:* with no server, localStorage alone means visitors never see the owner's content (UX spec Q1). A browser that has opened Studio is marked an *owner browser* (`emma_rev_owner_v1`) and is never overwritten by the file. *Limit:* Studio is not a security wall; anyone can open it and change only their own copy.
**ADR-020** Self-hosted fonts through `@fontsource` (Inter 400/500/600/700, Playfair Display 700, Latin subset, OFL-1.1). *Why:* removes a third-party request and 4 unused font files; weight 900 is no longer reachable (`strong` is 600). *Check:* zero external requests in the audit.
**ADR-021** One primary button per view; selected state = soft fill + 2 px accent border + tick; control border `#64748B`; status set emerald-700 / amber-700 / `#BE123C` always with icon and word. *Why:* `docs/ui/EMMA_UI_RESEARCH_AND_DESIGN.md` findings UI-01, 02, 04, 10.
**ADR-022** Honest delivery wording: when the email service is not configured the form says **"Not sent yet"** and offers "Email this request" (mail app). *Why:* "Request received" was untrue for a request only stored in the visitor's own browser. Replaces the earlier "Saved to the booking CRM" message (ADR-003 extended).
**ADR-023** Fake controls removed: the player's Shuffle and Loop buttons did nothing. *Why:* a control that does nothing misleads people.

## ACCEPTED 2026-10-16 (owner chose "all four" after the lessons review, `docs/LESSONS_APPLIED_v1.md`)
**ADR-024** Contact details appear in two places only: the booking card (prominent, with working links) and the footer. They were removed from the hero and from beside the Submit button. *Why:* repeated information is noise; the hero now has one message and one action.
**ADR-025** New booking status **Declined** (shown as "Declined or cancelled"). Setting it also turns off "Shown on Site", and public pages and the published file exclude it even if the flag is on. *Why:* a request that does not go ahead had no state, so it could only be deleted and the history was lost.
**ADR-026** `docs/BRAND.md` is a one-page brand sheet with confirmed facts separated from PROPOSAL lines. *Why:* the identity was spread over several files and the voice and usage rules were unwritten.


## ADR-027 - Visitor control over the animated hero (WCAG 2.2.2)
- Context: the Three.js hero moves continuously, in parallel with content, for more than 5 s. WCAG 2.2.2 (Level A) requires a way to pause, stop or hide it (checked on the W3C Understanding page, 2026-10-19). Only the OS reduced-motion setting was honoured.
- Decision: add a visible "Pause animation / Play animation" button (hero, bottom right), remembered in `localStorage` key `emma_rev_motion_v1`. No animation frame is scheduled when paused, when the hero is off screen, when the tab is hidden, or under OS reduced motion (button hidden then). The first frame is always drawn so the scene is never blank.
- Consequence: one extra tertiary control in the hero (kept out of the primary/secondary pair); cheaper on batteries.

## ADR-028 - Pressed state and 16 px prose
- Pressed state was missing (NN/g button states: enabled, hover, focus, pressed, disabled). Solid-blue controls go to `#1E40AF` on press; all enabled buttons scale 0.98. Global CSS in `src/index.css`, no per-component edits.
- Event notes and the arrangement note (prose) moved from 14 px to 16 px. Labels and metadata stay 14 px.
- Added `public/robots.txt` (`Allow: /`): Lighthouse flagged an invalid robots.txt because the SPA answered with HTML.
- Not adopted from the carousel: AI features, team/design tools, analytics tools, Adobe XD/Avocode (dead), the 44 px figure as an AA rule (AA is 24 px; 44 is the project's own target).

## ADR-029 (ACCEPTED by owner instruction, 2026-10-19) - Split into Owner mobile app (React Native) + Public web app
- Context: the owner asked for one app only Emma uses (mobile) and one for the public (web). He chose React Native, JSON file transfer, and "keep frontend-only".
- Decision: repo root = public web app (visitors only), `owner-app/` = Expo React Native app (Emma only), `shared/` = code both use; content travels by the existing `content.json` publish file; no backend. Full plan: `docs/split/TWO_APPS_PLAN.md`.
- Open: confirm that a React Native frontend is allowed under `docs/SCOPE.md` (the file still lists RN as out of scope; not edited).
- Consequence: booking inquiries reach Emma by email and are added to the owner app by hand; publishing still needs a deploy.
- Built 2026-10-19: Studio moved to `legacy/studio-web/` (reference, not compiled); web app reads only `content.json` and stores nothing in the visitor's browser; booking requests go by EmailJS only. Owner app: see `owner-app/README.md`.
- New-event default changed: deposit paid = false (the web Studio defaulted to true); new tracks start in Idea & Demo, duration 4:00.
- Status 2026-10-20: the first implementation was lost in a workspace reset; the repo is back at the single web app (v1.3). The split must be rebuilt.

## ADR-030 - Lessons from 18 attached files (2026-10-21)
- Took the method only (elicit first, anti-slop tells, worst-case content, tokens as a contract, review before deploy). Report: `docs/LESSONS_APPLIED_v2.md`.
- Fixed a real defect found by the worst-case test: one long unbroken word made the page scroll sideways (`overflow-wrap: anywhere`). Chips raised from 12 px to 14 px.
- Added `docs/tokens/emma.tokens.json` (W3C DTCG 2025.10, a Community Group report, not a W3C Standard). `src/index.css` remains the source of truth; a test keeps the export in step.
- Not adopted: 0 to 5 scorecards, slash-code libraries, multi-agent loops, 40+ style families, governance boards.

## ADR-031: Feel of music in the UI (2026-10-27)
Decision: add beat-synced decoration (waves, record, equalizer, ring, playhead, staff) and an opt-in "Tap notes" sound. Why: the owner asked for the feel of music. Guard rails: tokens only, decorative and aria-hidden, one pause control, reduced-motion honoured, sound only after a visitor opts in. Trade-off: more motion on the hero; mitigated by the pause button. See docs/MUSIC_FEEL.md.

## ADR-032: Music feel v1.5, rhythm with variation and cheap motion (2026-10-27)
Decision: replace uniform timing with varied timing (wave speeds, 4-beat ring, swung entrance), animate only transform/opacity (tested), add spring pluck on press, a "Now playing" status and an opt-in "done" chord. Why: the attached design files say rhythm is repetition with variation, motion must be GPU-friendly and reduced-motion safe, and sound must be justified. Trade-off: slightly more CSS; no new dependency.

## ADR-033: Responsive pass v1.6 (2026-10-27)
Decision: make the public site and Studio work from 320 px to 1440 px. Why: the owner's phone screenshots showed clipped Studio tabs, wrapped legends cut by the border, inputs only about 63% of the width, huge empty pipeline boxes, a 10 px stage select, and a "Music" heading that broke into "Mu / sic" on tablets.
Changes: `shrink-0` on tabs and "+ Add" (the global 44 px button min-width defeated flex shrinking); legends become headings inside the box below 640 px; fieldsets p-4 on phones; Studio action buttons stack full width on phones; pipeline 1 column on phones, 3 on tablets, 5 only from 1280 px; empty columns no longer force 320 px height; stage select 44 px tall, 14 px text; Staff drawing only from 1024 px.
Checked in Chromium emulation only (320, 360, 390, 768, 1024, 1440): no sideways scroll, no off-screen controls. Not checked on a real phone.

## ADR-034: TikTok link is built from the handle (2026-10-27)
Decision: the public link is built as `https://www.tiktok.com/@<handle>` from the handle (accepts "@Name" or a pasted link). Why: the owner reported the link opened TikTok but not the profile; the old code used a separate saved link that did not change when the handle was edited. Studio now shows the exact link and a tap-to-test. Not verified: what a phone does with the link (TikTok's own app/site decides) and whether the account exists; tiktok.com returned HTTP 403 to our fetch tool.

## ADR-035: Skeleton loaders and responsive image sets (2026-11-14)
- **Decision:** visitors see a page skeleton until `content.json` answers (gives up after 5 s); every photo shows a skeleton, fades in, and shows a calm fallback if it fails. `npm run images` turns full-size photos in `/originals` into AVIF/WebP/JPEG copies in `public/img` plus `manifest.json`; the app uses a set only if the manifest lists it.
- **Why:** no empty-page flash or layout jump; smaller files for phones; a real 4K screen gets a real 4K file.
- **Limit:** photos are never enlarged. The current portrait is 864×1080, so no real 4K copy can be made from it; supply the original camera file (3840 px or wider) in `/originals`.
- **Not security, not a backend:** all static files.

## ADR-036: Studio split into its own page and bundle (2026-11-14)
- **Decision:** two entry points in one repo. `/` = visitor site (`index.html` → `src/main.tsx` → `App.tsx`), no Studio code and no link. `/studio/` = owner Studio (`studio/index.html` → `src/studio-main.tsx` → `StudioApp.tsx`), marked "Owner only", `noindex`. Shared code stays in `src/utils`, `src/types`, `src/data`, `src/hooks`.
- **Honest limit:** this hides and separates; it is NOT security. No backend, no password; Studio edits only the browser's own copy. Private fields are stripped from the published file (publish.ts).
- **Studio hierarchy:** inquiries waiting → "before you publish" checklist → actions → tabs (Inquiries & events, Profile, Tracks, Setlists) → Backup/Restore/Clear last, marked careful. One solid-blue button at a time.
- **Owner preview:** a browser that has opened Studio shows its own copy on `/` (so Emma sees her edits); other browsers read `public/content.json`.

## ADR-037: Optional content added without hard-coding (2026-11-14)
- Profile gained optional `replyNote` and `media[]` (photos / YouTube / Vimeo / direct video). The Media section exists only when a usable item exists. Video loads nothing from YouTube/Vimeo until the visitor taps play (no-cookie domain). Photo links must be own-site paths or https.
- `audioUrl` is now played (real file) with the pad synth as fallback.
- Tagline accent: `*stars*`, else last two words (4+ words).
- Share preview: `og-image.jpg` 1200×630 and absolute URLs via `VITE_SITE_URL` at build time. Favicons 32/48/192/180 from the 400 px logo (not enlarged).
- 3D hero loads after first paint + idle, never on Save-Data / 2G.
- NOT done and why: dark mode (would break the strict White & Blue rule; needs the owner's decision); real-device test (needs a real phone: see docs/DEVICE_TEST.md); real content (needs the owner's text, songs, dates, 3840 px photos).
