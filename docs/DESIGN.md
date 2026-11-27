# DESIGN.md — how it should look and feel
**Style:** clean white & royal blue, editorial serif headlines (Playfair Display) + Inter UI text. One idea: *calm, trustworthy, church-and-stage ready.* Silver (#94A3B8) is used only for the 3D metallic accents.

## Tokens (CSS variables in `src/index.css`)
| Token | Value | Use |
|---|---|---|
| bg | #FFFFFF | page, cards |
| bg-alt | #F8FAFC | form containers, inputs |
| accent | #2563EB | primary CTA, links, focus ring |
| text | #0F172A | body (≈17:1 on white) |
| text-muted | #64748B | secondary (4.8:1 on white — AA) |
| border | #E2E8F0 | all hairlines |
| accent-soft | #EFF6FF | secondary hover |
| radius | 12 px controls / 16 px cards | |
| motion | 150 / 250 ms, ease-out, ≤ 500 ms | |

## Buttons
Primary = solid #2563EB, white text, `h-12`. Secondary = white, #2563EB border + text, hover #EFF6FF. Min touch target 44 px.
## Cards
Discography: 3-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`), white, #E2E8F0 border, `shadow-sm`, chords `text-base font-mono font-bold`, subtle Copy button.
## Forms
Grouped fieldsets, `gap-6`, #F8FAFC container, visible labels, errors = icon + text (never colour only).
## UX requirements
Responsive 320–1920 px · loading / empty / error / offline states · visible focus · reduced motion · fixed player never covers content (`pb-32`).

## v1.10 UI polish (2026-11-27): rem, fluid type, container queries

- **Sizes in `rem`.** Text sizes, touch targets (`2.75rem` = 44 px at the default size), slider thumbs, player bar and hero image heights are `rem`, so they grow with the reader's browser text-size setting. `px` stays only for hairlines (1 to 2 px borders, focus rings), media-query breakpoints and image `sizes` hints.
- **Fluid headings.** `text-fluid-hero` = `clamp(2.5rem, 1.6rem + 4.5vw, 4.5rem)`; `text-fluid-h2` = `clamp(1.875rem, 1.5rem + 1.6vw, 2.5rem)`. No jump between breakpoints; 40 px hero at 320 px wide, capped at 72 px.
- **Container queries** (`@tailwindcss/container-queries`) for layout INSIDE a card or form (stage rider, event details, booking form fields): they react to the space the card has, not the screen. Section card grids keep the viewport rule `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`.
- **Touch targets.** Range sliders, the Mute button and the "Next" link are now at least 44 px.
- **Text wrap.** `text-wrap: balance` on h1 to h3, `pretty` on paragraphs (ignored by older browsers).
- **Guard:** `src/test/responsive.test.ts` fails if a text size or minimum size is written in px.
- **Checked:** `.audit/ui.py` (Chromium, 320/768/1024/1440): no sideways scroll, no text under 12 px, no tap target under 44 px, no console errors. Not checked: a real phone, a real browser text-size change, Safari/Firefox.
