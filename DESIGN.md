# Design — Debtoria

Locked design system. Future design work reads this file first; pages defer
to it. Amend intentionally — the file is the rule.

## System
- Genre · modern-minimal (editorial R&D-lab voice)
- Macrostructure · Marquee-led editorial lab (segmented bar → oversized statement → numbered indices → marquee footer)
- Theme · studied-DNA (source: `docs/lowes-labs-stitch-kit/` — Lowe's Innovation Labs system, adapted to Debtoria)
- Axes · light / geometric-sans / cool

## Tokens (canonical · `/tokens.css` is the source of truth)
```css
:root {
  --color-paper:        #fafafa;   /* page background — never pure white */
  --color-ink:          #000000;   /* text + full-bleed dark panels */
  --color-accent:       #1657e8;   /* electric blue — the only accent */
  --color-accent-hover: #194198;
  --color-navy:         #021e5f;   /* accent's pair — instrument panels, CTA tiles */
  --color-warm:         #efeeeb;   /* warm neutral surface (teasers, code/JSON) */
  --color-beige:        #dad5c7;
  --color-rule:         #d9d9d9;   /* 1px hairlines everywhere */
  --color-signal-red:   #ff6b6b;   /* errors, destructive, disputes */
  --color-signal-green: #23ed73;   /* success (rare) */
  --color-signal-yellow:#e6ff4f;   /* warning (rare) */

  --font-display: Outfit, Inter, sans-serif;      /* Fellix substitute; no Cyrillic → Inter fallback */
  --font-body:    Inter, sans-serif;
  --font-mono:    "JetBrains Mono", monospace;    /* every ref, amount, date, index */

  /* Type: extreme scale contrast — huge display vs 12px meta, nothing between.
     --text-huge … --text-small (fluid clamps) in tokens.css. */
  /* Space: 20px gutter grid + 4pt scale (--space-2xs … --space-3xl). */

  --radius-media: 5px;    /* images, cards, panels */
  --radius-pill:  32px;   /* buttons only */
  --rule-w: 1px;
}
```

## Patterns (the working vocabulary — copy these verbatim)
- **Page h1** · `font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]` + trailing period ("Payments."). Landing hero uses `--text-h1`, uppercase, 4-line stack.
- **Detail header** · case reference in `font-mono text-[clamp(28px,3.5vw,48px)]` + `Badge` + mono amount — no display font here.
- **Section head** · `flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]` with `({count})` right.
- **Numbered ledger row** · `grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-5`; gutter `0X /` in `font-mono text-[11px] tracking-[0.06em] text-ink/40`. Every list/collection is numbered.
- **Meta label** · `text-[11px] uppercase tracking-[0.14em]` (+ `text-ink/70` when secondary). Muted body: `text-[12px] text-ink/70`.
- **Status** · `Badge` from `components/ui.tsx` — colored square + mono caps, never pills with colored fills. Tones: accent=active, green=success, yellow=warning, red=danger (`statusTone`).
- **Tables** · shared `Table` (mono caps headers on ink rule, hairline rows), wrapped in `overflow-x-auto`.
- **Buttons** · pill `rounded-[32px] … gap-3 text-[13px]` + `<span aria-hidden>→</span>`: primary `bg-accent text-white hover:bg-accent-hover`; secondary `border border-ink hover:bg-ink hover:text-paper`; destructive `border-signal text-signal hover:bg-signal hover:text-white`.
- **CTA tiles** · solid navy/blue rectangles, white label bottom-left, `→` bottom-right (landing hero, admin dashboard).
- **Forms** · label above in meta-label style; inputs/selects `w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent` (underline, never boxed); textareas `rounded-[5px] border border-rule p-3`; errors `text-sm text-signal`; numbered `01 /` rows on auth forms.
- **Money summary** · navy instrument panel `rounded-[5px] bg-navy p-6 text-white`, rows `flex justify-between border-b border-white/20 py-2 font-mono text-sm`, labels `text-[11px] uppercase tracking-[0.1em] text-white/70`.
- **Timelines / threads** · hairline entries `border-b border-rule py-3`, mono 11px timestamps, transitions as `A → B` — no bubbles, dots, or avatars.
- **Area shells** · segmented hairline top bar (see `app/[locale]/admin/layout.tsx`): wordmark segment · mono caps area tag · scrollable nav · language · logout; segments divided by `border-l border-rule`. Public pages get the slim variant with a mono index segment (`0002 / Sign in`).
- **Enrichment** · thin-stroke `Wireframe` SVG (`components/wireframe.tsx`, currentColor) — the only illustration. Data is the visual.

## CTA voice
- Primary · solid `--color-accent` fill · 32px pill · `px-5 py-2`, arrow inline
- Secondary · 1px ink outline, same pill geometry

## Motion stance
- Near-silent: color/filter transitions at 200ms `--ease-out`; one footer marquee (28s linear loop).
- Reduced-motion fallback · marquee stops, smooth-scroll off (`prefers-reduced-motion` handled in `landing.css`).

## Forbidden (anti-slop rails)
Gradients · shadows · glassmorphism · dark mode · purple/teal · zinc/gray utilities · colored card fills ·
rounded >5px on surfaces · icon grids · emoji · chat bubbles · fake browser chrome · stock photos ·
invented metrics or testimonials · italic headings. When tempted to decorate: use typography and a hairline instead.

## Provenance
- Source · `docs/lowes-labs-stitch-kit/` — design language extracted from lowesinnovationlabs.com (built by Locomotive), supplied by the project owner as a public reference for Debtoria's own brand; structure/DNA adapted, no copy or assets reproduced. Approved via Stitch mocks (project `debtoria`), 2026-07-27.
- Do NOT carry over from the source: its brand copy, wordmark, photography, or the Lowe's name.

## Exports
`/tokens.css` is the source of truth; `app/globals.css` maps tokens to Tailwind v4 `@theme` utilities
(`bg-paper`, `text-ink`, `bg-accent`, `border-rule`, `font-display`, `font-mono`, `bg-navy`, `bg-warm`, `text-signal`, …).
For DTCG `tokens.json` or shadcn/ui variable exports, ask to extend this file.
