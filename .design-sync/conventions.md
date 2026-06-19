# Shift-Manager UI Kit — building conventions

A Turkish-language (tr-TR) admin UI kit for a fuel-station shift-management app.
Light theme, **navy primary on a slate-gray canvas**, Inter typeface. 14 React
components, all available on `window.ShiftManagerUI` (e.g. `ShiftManagerUI.Button`).

## Setup — no provider needed
Components are context-free: there is **no ThemeProvider, Router, or i18n wrapper
to mount**. Render any component directly. All theming comes from `styles.css`
(already loaded) — its `:root` CSS custom properties are the single source of
truth. The page canvas is gray (`--background: #f1f5f9`); put content on white
**surfaces** (`--surface`) — cards, dialogs and inputs are white and pop against
the canvas. The body already applies Inter + the gray background globally.

## Styling idiom — semantic props + CSS variables (NOT a style-prop system)
Style components through their **semantic props**, never by passing className or
inline CSS to them:
- `Button` → `variant` (`primary` | `outline` | `ghost` | `danger-ghost`), `size` (`sm` | `md`), `icon` / `iconRight`.
- `Badge` → `status` (`Planlandı` | `Geldi` | `Gelmedi` | `Aktif` | `Pasif`) or free `variant`, plus `dot`.
- `Stat` → `tone` (`primary` | `came` | `late` | `absent`), `label`, `value`, `icon`, `foot`.
- `Select` / `Tabs` are controlled (`value`+`onChange` / `active`+`onChange`).

For your own layout glue *around* the components, use the design tokens:
- Surfaces/text: `--background --surface --surface-2 --foreground --muted-foreground --subtle-foreground --border --border-strong`
- Brand: `--primary --primary-hover --primary-soft --primary-foreground`
- Status: `--plan-* --came-* --absent-*` (each has `-bg -fg -bd -dot`)
- Shape: `--radius --radius-sm --radius-lg` · Shadow: `--shadow-sm --shadow --shadow-md --shadow-lg`

## Icons — fixed name set
`Icon` and every `icon` prop accept a **name from a fixed set**; an unknown name
renders nothing. Valid names:
`calendar users clipboard chart settings plus chevronLeft chevronRight chevronDown check clock x menu search pencil trash fuel pin userCheck userX filter building layers download bell grip checkSquare minus inbox alertCircle`.

## Where the truth lives
Read `styles.css` (tokens + every component class) and each component's
`<Name>.d.ts` (API) and `<Name>.prompt.md` (usage) before composing.

## Idiomatic example
```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
  <Stat label="Devam Oranı" value="%92" icon="userCheck" tone="came" foot="Bu hafta" />
  <Stat label="Gelmeyen"    value={2}   icon="userX"     tone="absent" foot="Bugün" />
</div>
<div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
  <Button variant="primary" icon="plus">Vardiya Ekle</Button>
  <Button variant="outline" icon="download">Excel'e Aktar</Button>
</div>
```
Content is Turkish (tr-TR) — keep labels Turkish to match the brand.
