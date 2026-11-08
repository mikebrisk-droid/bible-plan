# Design Direction: Quiet Reading Planner

> Category: Scripture planning, printable tools, personal study
> Goal: make the generator feel like a calm, modern reading desk: practical, printable, and quietly beautiful.

## 1. Visual Atmosphere

The interface should feel less like a SaaS dashboard and more like a well-made study tool. Keep the precision of modern product UI, but soften it with paper-like surfaces, restrained ink colors, and bookish spacing.

Use a clean white canvas for the app, with subtly warm off-white panels for settings and generated plans. The reading plan itself should remain the hero: generous, legible, and printable.

## 2. Palette

- **Ink** `#171717`: primary headings and passages
- **Soft Ink** `#4b5563`: dates, labels, secondary text
- **Paper** `#ffffff`: output surface
- **Warm Sheet** `#faf9f6`: page background and quiet panels
- **Rule** `#e7e3da`: borders and row dividers
- **Action** `#1f5eff`: primary buttons and active controls
- **Action Hover** `#1747c7`: hovered buttons and links
- **Today** `#fff4bf`: current-day highlight

### Section Colors

Color should be useful, not decorative. Keep Bible section colors soft enough to read black text comfortably:

- Pentateuch: `#d8f5fb`
- Historical: `#e5f7c7`
- Poetic: `#fff3bf`
- Prophets: `#f3dceb`
- Gospels: `#f7c9cc`
- Acts/Epistles: `#d7f7f2`
- Revelation: `#ded9ff`

## 3. Typography

- **Display / UI:** Cal Sans
- **Fallback:** `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
- Use `letter-spacing: 0`.
- Prefer compact but readable type. The app is a planner, not a poster.

### Scale

- App title: `clamp(2rem, 4vw, 4rem)`, weight 400
- Plan title: `clamp(1.8rem, 3vw, 3rem)`, weight 400
- Section headers: `1rem`
- Week titles: `1rem`
- Reading rows: `0.95rem` to `1rem`
- Dates: tabular numbers, muted color

## 4. Layout

- The app should be full-width with responsive gutters.
- Settings stay in a left rail on desktop and stack on mobile.
- The output panel should use the available width aggressively.
- Week cards should use CSS Grid with `auto-fill` or `auto-fit`, not fixed percentage columns.
- List view should use `column-width` instead of hardcoded breakpoints.
- Use container queries for output-specific responsiveness.

## 5. Components

### Settings Panels

- White or warm sheet background
- `1px` subtle border
- `14px-18px` radius
- Compact controls with clear focus states
- Avoid heavy shadows

### Output Panel

- Paper-like white surface
- Large radius, soft border
- Minimal elevation
- Plan content should be easy to scan and print

### Week Cards

- Soft panel background
- Rounded card shell
- Week heading separated by spacing, not a visible rule
- Colored reading block should have rounded outer corners only:
  - first reading row: top-left and top-right
  - middle rows: square
  - last reading row: bottom-left and bottom-right

### Calendar

- Full-width table
- Rounded outer container
- Quiet grid lines
- Dates small and muted
- Passage text gets visual priority

### Buttons

- Primary buttons use Action blue
- `12px` radius
- Subtle hover movement is okay
- Focus rings must be visible

## 6. Print Behavior

Print output must remain clean:

- Hide settings, sample links, and app chrome
- Preserve useful section colors
- Remove decorative shadows
- Keep borders readable but light
- Avoid layout rules that make printed plans overflow

## 7. Do

- Make the generated plan the visual center.
- Use modern CSS: grid, container queries, logical properties, `clamp()`.
- Keep spacing calm and predictable.
- Favor legibility over decoration.
- Keep all styling in vanilla CSS.

## 8. Do Not

- Do not add marketing-page hero treatments.
- Do not use gradients as a primary style.
- Do not add decorative illustrations.
- Do not make the palette feel like a single beige theme.
- Do not use rounded corners on every individual colored row when rows belong to one block.
