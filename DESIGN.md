# Design

The visual system for AccessBridge AI. Strategy, users and principles live in
[`PRODUCT.md`](PRODUCT.md); this file records how the interface looks and why.

## Theme

**Light by default, dark on request.** The site follows the reader's system
setting, and a toggle in the header overrides it. The choice is remembered.

Judges and officers read this in daylight, on laptops and projectors, so light
is the home state. Dark mode exists for evening work and for presenting in a
dimmed room. Both themes are first-class: every colour below has its own step
per theme, validated against that theme's own surfaces.

The look is quiet. Flat surfaces, hairline borders, no glass, no glow, no
gradients. The only elevation in the system is a map overlay sitting over the
basemap. Space and type do the work, so the map and the numbers stay loudest.

## Colour

Three data roles carry meaning. Nothing else is coloured.

| Role | Light | Dark | Meaning |
|---|---|---|---|
| Proposal | `#007b5a` | `#00a782` | The new stops, the route, and the primary action |
| Today | `#0073cf` | `#338ddf` | The rail and Metro network that exists now |
| Need | `#a22d00` → `#da9f8d` | `#fc8f6e` → `#5f3e34` | Deprivation, as a single-hue terracotta ramp, most deprived first |

Green is the identity: the proposed network, the primary action and the
active state. It suits a project about transport and inclusive growth, and it
is nothing like the Phase 1 site's palette.

Neutrals are true greys. Light: `--background #fcfcfd`, `--card #ffffff`,
`--border #e6e6eb`, text `#101114` / `#56596a` / `#7b7e8c`. Dark:
`--background #0c0c0f`, `--card #141418`, `--border #26262c`, text `#f7f7f9` /
`#a6a8b5` / `#7e8090`.

**Every data colour is validated, not eyeballed,** using the dataviz palette
checks in both themes:

- All-pairs colour-blind separation of 8.3 in light and 9.9 in dark, so the
  three map roles stay distinct for colour-blind readers.
- Both deprivation ramps pass the ordinal checks: one hue, monotone lightness,
  visible steps, and the end nearest the surface still clears 2:1. The ramp
  flips direction per theme, so the most deprived band is darkest on white and
  brightest on black.
- Text clears 5:1 or better on every surface in both themes, and the primary
  button's label clears 5.3:1 in light and 5.6:1 in dark.

Green and red collapse under red-green colour blindness, so a green identity
forced the deprivation ramp away from red. A terracotta hue was the reddest
warm that still cleared the all-pairs floor beside this green in both themes.
Earlier candidates were also rejected by these checks, not by taste: a mint
primary against a pink ramp, and a violet primary against the blue used for
today's network.

The map basemap switches with the theme, CARTO positron in light and
dark-matter in dark, and the deck.gl layers read their colours from the CSS
tokens, so one change of theme moves everything together.

## Typography

One family: **Schibsted Grotesk**, a Scandinavian news grotesque. It is plain
enough to disappear behind the data and has clear, even numerals, which matters
on a page built from figures.

Headings are semibold with tight tracking, on a restrained scale: the largest
display size tops out near 2.6rem. Tabular figures are used only where numbers
align in columns, in tables and on chart axes. Standalone numbers use
proportional figures, because tabular commas open a full digit-width gap and
make "£600,000" read as "£600 , 000".

## Layout

The shell is a **left sidebar** and a content area, not a top bar. The sidebar
holds the five sections, the theme toggle and a one-line note about the
project. It shows labels at desktop width, collapses to icons with tooltips on
tablets, and becomes a drawer behind a menu button on phones.

The two map pages are **two real columns**, not cards floating over a map: a
content column with its own scroll, and a map column beside it. The story's
step rail sits at the top of its column and the Back and Next controls at the
bottom, so the map is never covered. Explore docks its map controls in a
toolbar above the map. The only element over the map is the legend.

## Components

Built on [shadcn/ui](https://ui.shadcn.com) (new-york style) over Radix
primitives and Tailwind v4, so keyboard behaviour, focus management and ARIA
come from audited primitives rather than hand-rolled markup.

In use: button, card, badge, slider, switch, toggle, toggle group, tabs,
tooltip, collapsible, separator, table, progress, sheet, scroll area, skeleton.

House rules on top of the defaults:

- Cards are flat: `bg-card`, one hairline border, no shadow.
- Radius is small and consistent (`--radius: 0.5rem`); pills are reserved for
  navigation and chips.
- Evidence labels are badges with a tooltip, never bare text.
- Map overlays use the `floating` utility, the one place blur and shadow appear.

## Motion

Motion is from [motion](https://motion.dev). It signals change; it never
decorates.

- Story steps cross-fade and lift as the map flies to the next camera.
- The nav indicator and the map mode indicator slide between options.
- The route draws itself stop by stop when a plan appears.
- Reach bars grow from zero and resident counts count up.
- The theme toggle rotates between sun and moon.

Two rules hold everywhere:

1. **Reduced motion is respected.** Every animation checks the user's setting
   and falls back to an instant state.
2. **Nothing is hidden behind an animation.** Reveals run on mount, never on
   scroll position, and counters carry a safety timer plus the final value for
   screen readers. Content is never invisible because an animation did not run.

## Accessibility

WCAG 2.2 AA is the floor. The deprivation scale is ordered by lightness, colour
is never the only cue, every chart has a table view, map views carry a written
description, and the first Tab on any page reaches a skip link. The browser
tests check the skip link, focus movement between pages, phone layouts, the
theme toggle and reduced motion.
