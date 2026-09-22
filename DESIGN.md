# Design

The visual system for AccessBridge AI. Strategy, users and principles live in
[`PRODUCT.md`](PRODUCT.md); this file records how the interface looks and why.

## Theme

One committed dark theme. The site is map-first, and a near-black ground lets
the data carry all the colour. Judges often view it on a projector straight
after the Phase 1 site, so contrast is kept high rather than moody.

Base neutrals are true greys with no hue, in the shadcn "zinc" spirit. Colour is
reserved for meaning.

## Colour

Three data roles carry meaning. Nothing else is coloured.

| Role | Token | Value | Meaning |
|---|---|---|---|
| Proposal | `--proposal` / `--proposal-ui` | `#e0703f` / `#ff8a5c` | The new stops, the route, and the primary action |
| Today | `--today` / `--today-ui` | `#6478e8` / `#93a4ff` | The rail and Metro network that exists now |
| Need | `--need-1` … `--need-5` | `#ec91d1` → `#614458` | Deprivation, as a single-hue ramp ordered by lightness |

Surfaces: `--background #0a0a0b`, `--card #131316`, `--secondary #1c1c21`,
`--border #26262e`. Text: `--foreground #fafafa`, `--muted-foreground #a8a8b3`,
`--dim #7c7c8a`.

**Every data colour is validated, not eyeballed.** Using the dataviz palette
checks against the dark map surface:

- Coral, periwinkle and fuchsia clear the all-pairs colour-blind floor, worst
  pair 12.4, so the three map roles stay distinct for colour-blind viewers.
- The deprivation ramp passes the ordinal checks: one hue, monotone lightness,
  visible steps, and the darkest step still clears 2:1 against the map.
- Body text clears 7:1 on every surface, and the primary button's text clears
  7.7:1.

A mint or green primary was tried first and rejected: green collapses with the
pink deprivation ramp under red-green colour blindness.

## Typography

One family: **Atkinson Hyperlegible Next**, designed by the Braille Institute
for low-vision readers. An equity project should practise what it preaches, and
its distinctive letterforms keep the numbers unambiguous.

Headings are extra-bold with tight tracking. Figures use `tabular` where numbers
align in columns, and proportional figures at display sizes.

## Components

Built on [shadcn/ui](https://ui.shadcn.com) (new-york style) over Radix
primitives and Tailwind v4, so keyboard behaviour, focus management and ARIA
come from audited primitives rather than hand-rolled markup.

In use: button, card, badge, slider, switch, toggle, toggle group, tabs,
tooltip, collapsible, separator, table, progress, sheet, scroll area, skeleton.

House rules on top of the defaults:

- Pills for navigation and actions; 2xl radius for cards and panels.
- Raised panels get `edge-light`: a hairline top highlight and a deep shadow.
- Evidence labels are badges with a tooltip, never bare text.
- Map overlays are `bg-popover/85` with `backdrop-blur-md`, so the map stays
  readable underneath.

## Motion

Motion is from [motion](https://motion.dev). It signals change; it never
decorates.

- Story steps cross-fade and lift as the map flies to the next camera.
- The nav indicator and the map mode indicator slide between options with a
  shared layout animation.
- The route draws itself stop by stop when a plan appears.
- Reach bars grow from zero and resident counts count up.
- Cards and figures stagger in on mount.

Two rules hold everywhere:

1. **Reduced motion is respected.** Every animation checks the user's setting
   and falls back to an instant state.
2. **Nothing is hidden behind an animation.** Reveals run on mount, never on
   scroll position, and counters carry a safety timer plus the final value for
   screen readers. Content is never invisible because an animation did not run.

## Accessibility

WCAG 2.2 AA is the floor. The deprivation scale is ordered by lightness, colour
is never the only cue, every chart has a table view, map views carry a written
description, and the first Tab on any page reaches a skip link.
