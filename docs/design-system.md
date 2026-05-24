# Visual Design System

> Originally §4.6 of CLAUDE.md. **Load this doc for every UI task** — every color, spacing, badge color, and breakpoint decision must come from here.

The app's visual language is **professional, neutral, and information-dense** — closer to enterprise tooling (Linear, GitHub) than consumer software. The user is doing serious work over long sessions; the UI must reduce cognitive load, never compete for attention. Tokens live in `tailwind.config.ts` and CSS variables in `styles/globals.css`, so shadcn primitives consume them automatically.

## 1. Color tokens (semantic, not raw)

Tokens are HSL CSS variables to support light/dark switching. Components reference semantic names only — never raw hex.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `0 0% 100%` | `222 47% 8%` | Page background |
| `--foreground` | `222 47% 11%` | `210 20% 95%` | Body text |
| `--muted` | `210 16% 96%` | `217 33% 14%` | Subtle surfaces (table headers, disabled fields) |
| `--muted-foreground` | `215 16% 40%` | `215 16% 60%` | Secondary text, metadata |
| `--card` | `0 0% 100%` | `222 47% 10%` | Card / panel surface |
| `--border` | `214 20% 88%` | `217 33% 20%` | Divider, input border |
| `--primary` | `215 65% 30%` | `212 80% 60%` | Brand: deep institutional blue. Primary actions, links |
| `--primary-foreground` | `0 0% 100%` | `222 47% 8%` | Text on primary |
| `--accent` | `215 30% 92%` | `217 33% 18%` | Hover / selected row |
| `--destructive` | `0 72% 45%` | `0 70% 55%` | Delete, archive, irreversible actions |
| `--warning` | `38 92% 45%` | `40 90% 55%` | OVERDUE, "viewing records you as custodian" |
| `--success` | `142 60% 35%` | `142 55% 50%` | COMPLETED, successful upload |
| `--info` | `200 75% 40%` | `200 70% 55%` | Info banners, audit highlights |

Brand rationale: the deep institutional blue evokes uniform/badge contexts without being literal; it stays legible at small sizes and reads as "serious" rather than "consumer-friendly."

## 2. Enum → color mapping

Every status/priority enum from the backend renders as a `<Badge>` with consistent colors so users build muscle memory across modules.

**`CaseStatus`**
| Value | Color | Badge variant |
|---|---|---|
| `OPEN` | `--info` | outline |
| `UNDER_INVESTIGATION` | `--primary` | solid |
| `PAUSED` | `--muted-foreground` | outline |
| `CLOSED` | `--success` | subtle |

**`CasePriority` / `TaskPriority`**
| Value | Color |
|---|---|
| `LOW` | `--muted-foreground` |
| `MEDIUM` | `--info` |
| `HIGH` | `--warning` |
| `CRITICAL` / `URGENT` | `--destructive` |

**`TaskStatus`**
| Value | Color |
|---|---|
| `PENDING` | `--muted-foreground` |
| `IN_PROGRESS` | `--info` |
| `COMPLETED` | `--success` |
| `OVERDUE` | `--destructive` (high-emphasis: solid badge + icon) |
| `CANCELLED` | `--muted` (strikethrough title in lists) |

**`EvidenceStatus`**
| Value | Color |
|---|---|
| `REGISTERED` | `--info` |
| `IN_CUSTODY` | `--primary` |
| `TRANSFERRED` | `--warning` |
| `ARCHIVED` | `--muted-foreground` |

**`InvolvementType`**
| Value | Color |
|---|---|
| `VICTIM` | `--info` |
| `SUSPECT` | `--destructive` |
| `WITNESS` | `--warning` |
| `OTHER` | `--muted-foreground` |

Archived entities (`archived: true` on cases/evidence, `deleted: true` on media) render with reduced opacity (`opacity-60`) and a small "Archived" pill regardless of their status badge.

## 3. Typography

- **Family:** `Inter` (UI) with system fallback (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). `JetBrains Mono` for IDs, hashes, S3 keys, JSON snippets in the audit viewer.
- **Scale (Tailwind):** `text-xs` (12px) metadata · `text-sm` (14px) body/tables · `text-base` (16px) form inputs · `text-lg` (18px) section titles · `text-xl` (20px) page titles · `text-2xl` (24px) dashboard headings.
- **Weight:** body `400`, emphasis `500`, headings `600`. No `700`+ in UI chrome.
- **Line height:** `leading-normal` (1.5) for prose, `leading-tight` (1.25) for headings and tables.
- **Numerals:** `font-variant-numeric: tabular-nums` on all tables and counters so columns align.

## 4. Spacing, radii, elevation

- **Spacing scale:** Tailwind default 4px base; UI uses primarily `2, 3, 4, 6, 8` (8/12/16/24/32 px).
- **Radii:** `--radius: 0.5rem` (8px) global; inputs/buttons `rounded-md`, cards `rounded-lg`, badges `rounded-full`.
- **Elevation:** minimal — `shadow-sm` for cards, `shadow-md` for dialogs/popovers, no shadows on lists or tables. Borders carry structure, not shadows.
- **Layout grid:** sidebar `w-64` (collapsible to `w-16`), top bar `h-14`, content max-width `max-w-7xl` with `px-6` gutters.

## 5. Density

Two density modes, persisted in `useUiStore`:

- **Comfortable** (default) — table rows `h-12`, form fields `h-10`. Used everywhere by default.
- **Compact** — table rows `h-9`, form fields `h-8`. Toggle on audit/task list views where the user scans many rows.

## 6. Iconography

- **Library:** `lucide-react`, sized `h-4 w-4` inline, `h-5 w-5` in buttons, `h-6 w-6` in section headers.
- **Conventions:** stroke-only icons; never filled. Status icons paired with badges (e.g. `AlertTriangle` for OVERDUE, `CheckCircle2` for COMPLETED, `ShieldAlert` for evidence view warnings, `Lock` for archived).
- **Color:** inherit from text by default; only colored when paired with a semantic state.

## 7. Light & dark mode

Both ship from day one. Toggle in the top bar, persisted in `localStorage` (`aegiscase:theme = light | dark | system`). `system` follows `prefers-color-scheme`. Dark mode is the recommended default for night-shift operational use.

## 8. Motion

Restrained. `transition-colors` and `transition-opacity` on interactive elements (150 ms). No spring physics, no page transitions. Dialogs use shadcn defaults (~200 ms fade + 4 px translate). Respect `prefers-reduced-motion`: disable all non-essential transitions when set.

## 9. Accessibility tokens

- Minimum contrast: text `4.5:1`, large text and icons `3:1`. All semantic tokens above pass WCAG AA against their paired foreground.
- Focus ring: `ring-2 ring-primary ring-offset-2 ring-offset-background` on every interactive element. Never `outline: none` without a replacement.
- Hit targets: minimum `40 × 40 px`. Icon-only buttons always carry `aria-label`.

## 10. Page archetypes

To keep visual rhythm consistent, every screen follows one of four archetypes:

| Archetype | Used for | Layout |
|---|---|---|
| **List** | `/cases`, `/users`, `/tasks`, `/evidence`, `/audit` | Page title + filters bar + `DataTable` + `PaginationBar` |
| **Detail** | `/cases/:id`, `/evidence/:id`, `/tasks/:id`, `/involved/:id` | Breadcrumb + entity header (title, status badges, key metadata, action menu) + tabs (Overview · Evidence · Tasks · Involved · Audit · Media) |
| **Form** | `/cases/new`, `/users/new`, edit pages | Card-centered, max `max-w-2xl`, label-above-input, sticky action bar |
| **Dashboard** | `/dashboard` per role | Grid of cards (`grid-cols-1 lg:grid-cols-3`), each card a focused widget |

## 11. Responsive design

**Desktop-first, but 100% mobile-compatible.** The app is optimized for ≥ 1280 px (the realistic working surface for investigators), and remains fully usable down to 360 px (field/phone use for status checks, quick task updates, evidence intake from the scene).

**Tailwind breakpoints used:**

| Token | Min width | Primary use |
|---|---|---|
| `sm` | 640 px | Phones in landscape |
| `md` | 768 px | Tablets |
| `lg` | 1024 px | Small laptop / desktop (target floor for full-feature parity) |
| `xl` | 1280 px | Standard desktop (design baseline) |
| `2xl` | 1536 px | Wide desktop |

**Responsive behavior by archetype:**

| Archetype | < `md` (mobile) | `md`–`lg` (tablet) | ≥ `lg` (desktop) |
|---|---|---|---|
| Shell | Sidebar collapses to bottom drawer triggered by a top-bar menu icon; top bar sticky | Sidebar collapsible (`w-16`) | Sidebar expanded (`w-64`) |
| List | Cards (one per row) replace `DataTable`; non-essential columns hidden; filter bar collapses into a `Sheet` | `DataTable` with reduced columns | Full `DataTable` |
| Detail | Tabs become a horizontally scrollable scroller; entity header stacks vertically; action menu collapses into a `…` menu | Two-column inner layout | Two/three-column inner layout |
| Form | Single column, full width, sticky bottom action bar | Single column max `max-w-2xl` | Centered card `max-w-2xl` |
| Dashboard | `grid-cols-1`, cards stack | `grid-cols-2` | `grid-cols-3` |
| **Kanban** | Single visible column with horizontal swipe between status columns + segmented control to jump | 2 columns scrollable | All 5 status columns visible with horizontal scroll if needed |

**Rules:**
- Touch targets stay ≥ 44 × 44 px on `< md` (overrides the 40 px desktop minimum).
- Tables that cannot collapse cleanly (audit, custody chain) become horizontally scrollable with a sticky first column, never get truncated.
- Dialogs become full-screen `Sheet`s on `< md` to preserve form ergonomics.
- File upload supports the device camera on `< md` via `<input capture="environment">` for evidence intake from the field.
- No hover-only affordances: every action reachable by hover on desktop must have a tap-equivalent on mobile (long-press is **not** used — visible buttons or menus only).

**Testing matrix:** every feature is verified on three viewport profiles before merge — `375 × 812` (mobile), `768 × 1024` (tablet), `1440 × 900` (desktop). Playwright E2E suite (Phase 9) runs against the desktop profile; visual smoke runs against mobile.

## 12. Implementation notes

- All tokens defined once in `styles/globals.css` (CSS vars) and `tailwind.config.ts` (semantic theme).
- shadcn/ui primitives consume these tokens automatically — no per-component color overrides in feature code.
- A `/styleguide` route (dev-only, gated behind `import.meta.env.DEV`) renders every token, badge, and archetype for visual regression review.
