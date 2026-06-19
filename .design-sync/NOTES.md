# design-sync notes — shift-manager

## What this repo is
This is an **application** (Vite + React + Supabase), not a packaged design
system. There is no library build and no Storybook. The "design system" synced
here is the embedded UI kit in `src/components/ui/` (14 exported primitives) plus
the design tokens in `src/index.css`.

## How the bundle is produced (package shape, synth-from-src)
- No `dist` library entry and no exported `.d.ts`, so the component list and the
  bundle global both come from config, not discovery:
  - `cfg.entry` → `.design-sync/ds-entry.ts`, a hand-written barrel re-exporting
    the 11 `ui/` files. This also makes `PKG_DIR` resolve to the repo root (the
    converter walks up from the entry to the repo's `package.json`), which is why
    `cfg.srcDir`/`cfg.cssEntry` (repo-relative) resolve correctly.
  - `cfg.componentSrcMap` pins all 14 exports (Field.tsx contributes 4:
    Field/Input/Textarea/SearchInput).
  - `cfg.srcDir: src/components/ui` scopes enrichment to the kit (keeps Supabase/
    xlsx/app code out of the 26 KB bundle).
- **Adding a new ui primitive** requires editing BOTH `ds-entry.ts` AND
  `componentSrcMap` — discovery is pinned, not automatic.
- JSX: the components use the automatic runtime (no `import React`). esbuild picks
  up `jsx: react-jsx` by auto-discovering the repo's `tsconfig.json` (works only
  because PKG_DIR = repo root). No jsx config in the converter call.

## Fonts
- The app loads **Inter** from the Google Fonts CDN in `index.html` (not from
  CSS), so the scrape reports `[FONT_MISSING] Inter`.
- Resolved by shipping Inter locally: `.design-sync/fonts/*.woff2` (from
  @fontsource/inter, latin + latin-ext, weights 400/500/600/700) + a hand-written
  `.design-sync/fonts/inter.css`, wired via `cfg.extraFonts`. These woff2 are
  committed (durable set).

## CSS
- The whole `src/index.css` (40 KB) ships as `_ds_bundle.css` and reaches designs
  via the `styles.css` closure. This includes app globals: `html,body{background:
  var(--background)}` (the gray canvas — on-brand) and layout classes
  (`.app/.sidebar/.nav`) the kit doesn't need. The gray canvas is intentional.
  The large gray area under content in grading sheets is just that canvas in the
  tall capture viewport — real DS-pane cards are content-sized.

## Render harness gotchas
- **Playwright/chromium version mismatch**: installed `playwright@1.61` pins
  chromium 1228, but the machine cache only has 1223/1208. Validate & capture are
  run with `DS_CHROMIUM_PATH=<...>/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe`
  (validate/capture honor that env). **Every re-run must export it.**
- **Dialog** (overlay, `position:fixed`): the card harness wraps single-mode
  previews in a `translateZ(0)` element, which makes the fixed overlay size to
  that collapsed box and `overflow-y:auto` clips it. Fix is in the preview itself
  — `previews/Dialog.tsx` wraps the modal in its own transformed, fixed-height
  container. Override: `cardMode: single, viewport: 540x520`.
- **Icon, Stat**: `cardMode: column` (their multi-item grids overflow a grid cell).
- **Select, DropdownButton**: the menu is internal open-state (closed at rest, no
  `defaultOpen` prop), so cards show the styled trigger only; the open menu is
  interaction-only and can't be captured statically.

## Known render warns
- None. Final validate is clean (14/14, no warnings).

## DS findings (app-level, not preview defects)
- **`Stat` `tone="late"` is under-defined**: it maps to `var(--late-bg)` /
  `var(--late-fg)`, but `src/index.css` never defines `--late-*` (only `--plan-*`,
  `--came-*`, `--absent-*` exist). So `tone="late"` renders the icon chip without
  its intended amber background. validate's token check can't catch this — the var
  is referenced from JS (Stat's inline style), not from CSS. `previews/Stat.tsx`
  (Ozet → "Geç Kalan") faithfully shows it. Fix belongs in the app's `index.css`
  (add `--late-bg`/`--late-fg`), not in the sync.

## Re-sync risks (what can silently go stale)
- `DS_CHROMIUM_PATH` is machine + build-number specific. A fresh clone/machine
  needs its own cached chromium (or a `playwright install chromium` whose pinned
  build you then point the env at).
- Inter woff2 are a committed snapshot; if the app changes its font, refresh them.
- `componentSrcMap` + `ds-entry.ts` pin file paths — moving/renaming `ui/` files
  breaks discovery until both are updated.
- The kit ships `src/index.css` wholesale. If you want a leaner DS stylesheet
  (drop `.app/.sidebar/.nav` and the global body background), point `cfg.cssEntry`
  at a curated file instead.
