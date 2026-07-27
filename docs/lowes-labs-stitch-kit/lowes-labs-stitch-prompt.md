# Lowe's Innovation Labs — design language → Google Stitch prompt

Reference: [lowesinnovationlabs.com](https://www.lowesinnovationlabs.com/) · built by [Locomotive](https://locomotive.ca) · [Awwwards SOTD listing](https://www.awwwards.com/sites/lowes-innovation-labs) (7.4 overall, 7.64 design, 7.73 development — animation & transitions 8.0)

Everything below was read off the live site's CSS custom properties, computed styles and DOM — not guessed. Screenshots are in the same delivery.

---

## Part 1 — The extracted design system

### Palette (verbatim CSS variables)

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#1657E8` | electric blue — primary CTA, links, accent surfaces |
| `--color-primary-dark` | `#021E5F` | near-navy — secondary surface, paired with primary |
| `--color-primary-mid` | `#194198` | mid blue, hover/tonal step |
| `--color-primary-light` | `#BBE2FF` | pale blue tint |
| `--color-lighter` | `#FAFAFA` | **page background** (off-white, not pure white) |
| `--color-light` | `#EFEEEB` | warm card / slider background |
| `--color-beige` | `#DAD5C7` | warm neutral accent |
| `--color-gray` / `--color-gray-dark` | `#D9D9D9` / `#B0A9A9` | placeholders, rules |
| `--color-darkest` | `#000000` | text + full-bleed dark panels |
| `--color-yellow` | `#E6FF4F` | acid highlight (rare) |
| `--color-green` | `#23ED73` | signal green (rare) |
| `--color-red` | `#FF6B6B` | error |

Alpha steps exist at 10 / 30 / 40 / 70 % black and 20 % white — used for scrims over photography.

The whole site runs on **three surfaces**: off-white `#FAFAFA`, pure black `#000000`, and electric blue `#1657E8` / navy `#021E5F`. Photography supplies all other colour.

### Typography

- **Display / headings:** Fellix — weights 400, 500, 700. Geometric grotesque, single-storey `a`, wide apertures. Closest free substitutes: **Poppins**, **Outfit**, **General Sans**.
- **Body / UI:** Helvetica Now Text, 400 only. Substitute: **Inter** or **Helvetica Neue**.
- H1 as rendered at 1440px: **115px, weight 500, line-height 0.85, letter-spacing −0.03em**. Very tight leading is the signature.

Fluid scale (real values):

```
--font-size-huge : clamp(90px,  15vw,    240px)
--font-size-h1   : clamp(54px,  8vw,     128px)
--font-size-h2   : clamp(42px,  5.625vw, 90px)
--font-size-h3   : clamp(32px,  4vw,     64px)
--font-size-h4   : clamp(24px,  2.8125vw, 45px)
--font-size-h5   : 27px
--font-size-body : 16px
--font-size-small: 12px      /* meta labels, indices, tags */
```

### Layout

- 12-column grid on desktop, **8-column on mobile**; gutter and outer margin both `20px` (1.25rem). Content runs edge-to-edge — no centred max-width container.
- Header height `124px` desktop / `86px` mobile. It is a **segmented bar**: vertical hairline dividers split it into logo · tagline · "Areas of Exploration" expander · "Menu" expander · brand mark. It shrinks on scroll but never disappears.
- Corner radius: `5px` on media, `32px` (pill) on buttons. Panels and full-bleed sections are square.
- Section rhythm alternates: off-white editorial block → full-bleed photo/video → black inset panel → slider → CTA pair → footer.

### Signature components

1. **Oversized hero wordmark** — 4-line statement in Fellix at ~115px, left-aligned, flush to the left margin, line-height 0.85.
2. **Generative line-art canvas** — a rotating wireframe polyhedron / moiré line field drawn on `<canvas>`, sitting in the hero whitespace. Thin 1px black strokes on off-white. It is the brand's "hero image".
3. **Solid-colour CTA tiles** — two rectangles side by side, navy `#021E5F` and blue `#1657E8`, white label bottom-left, `→` arrow bottom-right.
4. **Numbered index lists** — `0014 / Projects`, `A001 Democratization of Expertise`, `1 Home`, `(3)` counts. Every collection is numbered in 12px mono-ish small text. This is the strongest single motif.
5. **Nav expanders** — clicking `+ Areas of Exploration` drops a white card stack over a **heavy backdrop-blur** of the page; clicking `+ Menu` opens a full-screen off-white overlay with a large blue wireframe object on the left and a right-aligned nav list where the active item sits in a white pill.
6. **Sliders with hairline chrome** — `Featured / Projects (3)` header row at 14px, two small black horizontal pill arrow buttons at top-right, cards bleeding off both edges of the viewport.
7. **Overlay caption card** — white rounded card laid over the bottom of a project image: blue title, black description, outlined tag chips (`Spatial Computing`, `3D`).
8. **Marquee footer** — the tagline scrolling horizontally at ~90px, then a table-style index with numbered rows and 1px rules.

### Motion (real timing values)

```
text enter        1s,   0.6s delay   (line-by-line mask reveal)
container enter   0.75s
modal / blur bg   0.25s
header label      0.2s delay
```

Smooth-scroll is Locomotive-style; reveals are mask-up per line, images scale-down into place, the canvas responds continuously to scroll.

---

## Part 2 — The Google Stitch prompt

### 2a. Core style block (paste at the top of every Stitch prompt)

> **Design system:** A high-end editorial tech aesthetic — Swiss grid discipline meets an R&D lab.
>
> **Colors:** Page background off-white `#FAFAFA`. Text pure black `#000000`. Primary accent electric blue `#1657E8`, deep navy `#021E5F` as its pair. Warm neutral card background `#EFEEEB`. Full-bleed sections in pure black with white text. No gradients, no shadows, no glassmorphism except one heavy backdrop blur behind open menus.
>
> **Typography:** Headings in Poppins (geometric grotesque), weight 500, line-height 0.85, letter-spacing −0.03em, sized 90–128px on desktop. Body in Inter, weight 400, 16px, line-height 1.4. Meta labels, indices, counters and tags in 12px uppercase-ish small text with wide tracking. Extreme scale contrast between the 115px headline and the 12px label — nothing in between.
>
> **Layout:** 12-column grid, 20px gutters, 20px outer margins, content edge-to-edge with no centred container. Left-align everything. Generous vertical whitespace — sections breathe with 120–200px of air. Asymmetric two-column splits (heading left, body copy right at 50 % width).
>
> **Components:** 5px radius on images and cards; fully pill-shaped buttons (32px radius) with a 1px outline and an inline `→` arrow. 1px hairline rules separating list rows and header segments. Every list and collection is numbered — `0014 /`, `A001`, `(3)`.
>
> **Mood:** confident, quiet, technical. Restraint over decoration.

### 2b. Screen prompts

**Home / hero**

> Design a landing page hero for [YOUR PRODUCT]. Off-white `#FAFAFA` background. A fixed top bar 124px tall, divided into segments by thin vertical rules: a 3-line stacked wordmark on the far left, a small 12px tagline next to it, then a segment with a `+` icon and the label "[SECTION NAME]", then a segment with a `+` icon and the label "Menu", and a small brand mark at the far right. Below it, a huge 4-line headline in the left half of the screen at 115px, weight 500, line-height 0.85, black on off-white, flush to the left margin. In the right half, an abstract generative line drawing — thin 1px black strokes forming a rotating wireframe polyhedron on a transparent background. Underneath the drawing, two solid rectangular CTA tiles side by side, one deep navy `#021E5F` and one electric blue `#1657E8`, each with a white label at the bottom-left and a white `→` arrow at the bottom-right. Below those, a warm grey `#EFEEEB` panel that acts as a project teaser: a small "Project" label on the left, a 5px-radius thumbnail, a two-line title, a pill-shaped outlined "Read →" button, and a `01 / 02` counter at the bottom-right with tiny chevron controls on the right edge.

**Statement / manifesto section**

> A full-width section on off-white. On the left, a tiny 12px label "Who we are" with a 1px rule running from it across a third of the screen. Filling the rest of the section, a single 64px statement sentence in the geometric heading font, weight 500, line-height 0.95, wrapping to 4 lines and running nearly edge-to-edge. Behind the text, an extremely faint generative line field — hundreds of hairline strokes converging toward a vanishing point, at about 10 % opacity. Enormous whitespace above and below.

**Dark feature panel**

> An inset panel with a pure black background, rounded 5px corners, inset 20px from the page edges. Two-column split: on the left a 5px-radius image filling roughly 40 % width; on the right a white 45px headline in three lines, then a 16px white body paragraph constrained to a narrow measure (about 30 characters per line), then a pill-shaped solid blue `#1657E8` button with white text and a `→` arrow. Everything left-aligned within its column, with the text column starting at the horizontal midpoint.

**Featured work slider**

> A section on off-white. A section header split asymmetrically: a 64px heading "Featured work" on the left, and a 20px intro paragraph on the right half, its top edge aligned to the heading's cap height. Below, a slider control row: the word "Featured", a `/`, the word "Projects", a "(3)" counter — all at 14px, spaced across the left half at even tab stops — and at the far right two small horizontal pill buttons in black containing white ← and → arrows. Below that, a horizontal carousel of large landscape image cards with 5px radius, the active card centred and the neighbours bleeding off both edges of the viewport. Over the bottom of the active card, a white overlay card with 5px radius containing a two-line title in electric blue `#1657E8`, a 14px black description on the right, and two small outlined tag chips with pill borders at the bottom-left.

**CTA pair**

> Two large solid panels side by side, filling the full width with a 20px gap. Left panel deep navy `#021E5F`, right panel electric blue `#1657E8`. Each has a small white wireframe icon at the top-left, a centred 12px white category label at the top, a 45px white headline in the middle-left, and a 16px white paragraph beneath it. At the bottom-right of each panel, a white rectangular button block with a 5px radius containing a black label and a `→` arrow, sized about a third of the panel width and a third of its height.

**Footer**

> A footer on off-white. First, a horizontal marquee: the brand tagline repeating at 90px in the heading font, black, running edge to edge and clipped by the viewport. Below it, a three-column layout. Left column headed "Index" with a 1px rule under the heading, then numbered rows — "1 Home", "2 Projects", "3 …" — each row separated by a 1px hairline rule, with the number in a narrow left gutter and the label starting at a consistent tab stop. Middle column headed "Social", same numbered-row treatment. Right column: a deep navy `#021E5F` block with a white 27px heading "Interested in learning more?" and a `→` arrow at its bottom-right.

**Full-screen menu overlay**

> A full-screen navigation overlay on off-white. Filling the left two-thirds, a large abstract wireframe polyhedron drawn in thin electric-blue `#1657E8` strokes with a soft grey shadow beneath it. On the right, a vertical nav list of 6 items at 32px in the heading font, right-aligned to the page margin; the active item sits inside a white pill-shaped block with 5px radius spanning the column width, its label in electric blue. At the top-right, two segments: a solid blue `#1657E8` block with "Let's connect →" in white, and a light grey block with a `–` icon and the word "Close". At the bottom-right, the tagline in 16px and a copyright line.

**Dropdown / expander panel**

> A dropdown panel anchored under the top bar, occupying the right half of the screen. The page behind it is heavily blurred and desaturated. The panel is a stack of three white rows, each with a 1px separator: a small grey code on the left ("A001", "A002", "A003"), a 27px black title at the bottom-left of the row, a small 5px-radius thumbnail at the right, and a chevron `→` in a separate narrow cell at the far right edge. Above the stack, a black block with a small "Back" label and a `–` "Close" control.

### 2c. Motion note (append if your Stitch flow accepts it)

> Motion: text reveals line by line with a mask wipe over 1s after a 0.6s delay; blocks fade and rise over 0.75s; overlays and their backdrop blur transition in 0.25s; smooth inertia scrolling throughout; the generative line drawing rotates continuously and reacts to scroll position.

---

## Part 3 — How to adapt it

- Keep the **three-surface rule** (off-white / black / one saturated accent). Swap `#1657E8` for your own brand colour and the system survives intact.
- Keep the **scale contrast** — 115px headline against 12px labels, with nothing in between. That gap is what makes it read as editorial rather than corporate.
- Keep the **numbering motif**. It is cheap to implement and does most of the "lab / R&D" work.
- The thing that is *not* portable without effort is the canvas line-art. If you can't build it, substitute a single thin-stroke SVG line drawing — flat, black, no fill.
- Stitch tends to over-decorate. If output comes back with shadows, gradients or rounded 16px cards, re-prompt with "remove all shadows and gradients, flatten to solid colour blocks, reduce corner radius to 5px."

---

## Screenshots

All in `screenshots/`, captured at 1440px desktop width.

| File | What it shows |
|---|---|
| `01-hero-desktop.jpg` | Hero, segmented header, CTA tiles, project teaser |
| `02-hero-generative-shape.jpg` | Hero with the canvas line-art rendered |
| `03-who-we-are-statement.jpg` | Manifesto statement + faint line field |
| `04-office-fullbleed.jpg` | Full-bleed photography section |
| `05-dark-panel-building-future.jpg` | Black inset panel, two-column split, blue pill CTA |
| `06-featured-work-slider.jpg` | Section header split + slider control row |
| `07-project-card-partners-careers.jpg` | Overlay caption card + start of CTA pair |
| `08-cta-pair-news.jpg` | Navy/blue CTA pair with white button blocks |
| `09-footer-index.jpg` | Marquee + numbered index footer |
| `10-project-slider-detail.jpg` | Slider card bleeding off both edges |
| `11-areas-dropdown-blur.jpg` | Expander open, backdrop blur |
| `12-areas-dropdown-loaded.jpg` | Expander with thumbnails loaded |
| `13-fullscreen-menu-3d.jpg` | Full-screen menu with blue wireframe object |

Sources: [Lowe's Innovation Labs](https://www.lowesinnovationlabs.com/) · [Awwwards — Lowe's Innovation Labs](https://www.awwwards.com/sites/lowes-innovation-labs)
