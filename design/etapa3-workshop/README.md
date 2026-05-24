# Handoff: PR Reviewer — "Calm Workshop" Redesign

## Overview

A design-direction package for the Tauri 2 + React + TypeScript PR reviewer app. The redesign is a **deliberate counter-statement to AI-first dev tools**: no summarization, no smart suggestions, no autocomplete-as-feature. The product is for developers who read diffs carefully, line by line, and ship because they understand the code.

The visual brief: **calm, focused, craftsman-like.** Sublime-Text-era intentionality with a hint of Linear's discipline, minus the SaaS gloss.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing the intended visual direction and behavior, not production code to lift directly. The task is to translate this direction into the existing Tauri 2 / React / TypeScript codebase using its established primitives (`src/components/ui/`), design tokens (`src/styles/tokens.css`), and layout shell. The HTML mock is high-fidelity for visual decisions and approximate for interaction flow; recreate the behavior in real React with real Monaco integration.

## Fidelity

**High-fidelity.** Pixel values, hex codes, type sizes, motion timings — all in this document are intended as the targets. The HTML mock at `App Mock 1520x960.html` is the canonical visual reference at the user's resolution.

---

## What ships

The redesign is eight inter-locking choices. Each is independently shippable, but they reinforce each other.

### 1. Palette — replace Catppuccin entirely

The current Catppuccin Latte/Mocha pairing is too "personal dotfile flexing" for the positioning. Replace with **Paper** (warm light) and **Linen** (true-neutral dark). Two themes, one accent, four CI-semantic colors.

#### Paper (light)
| token | hex | role |
|---|---|---|
| `--c-base` | `#F4F1EA` | window / panel background |
| `--c-mantle` | `#EDE9DF` | titlebar, status line, chrome |
| `--c-surface0` | `#FAF7F0` | active panel, modal-nav background |
| `--c-surface1` | `#FFFFFF` | modal body, comment widget background |
| `--c-line` | `#D9D2C2` | firm rule (panel separators, modal borders) |
| `--c-line-soft` | `#E5DFD0` | hairline rule (row separators, indent guides) |
| `--c-text` | `#2A2723` | body text |
| `--c-subtext` | `#6B6358` | metadata, deemphasized prose |
| `--c-overlay` | `#A09787` | gutter numbers, slashes in paths, separators |
| `--c-accent` | `#5E7556` | focus + active state (sage default) |
| `--c-accent-soft` | `rgba(94,117,86,0.12)` | accent backgrounds, hover tints |
| `--c-success` | `#4F7A3E` | CI passed, diff added, success states |
| `--c-warn` | `#B8853A` | CI in progress, draft state |
| `--c-danger` | `#A64A3A` | CI failed, diff removed, errors |
| `--c-info` | `#3B5C7E` | keywords (Java/syntax) |

#### Linen (dark)
| token | hex | role |
|---|---|---|
| `--c-base` | `#16161A` | (note: true neutral, NOT blue-black) |
| `--c-mantle` | `#1B1B1F` | |
| `--c-surface0` | `#222226` | |
| `--c-surface1` | `#2A2A2F` | |
| `--c-line` | `#2E2E33` | |
| `--c-line-soft` | `#26262B` | |
| `--c-text` | `#DCD8CF` | |
| `--c-subtext` | `#8E887D` | |
| `--c-overlay` | `#5B564E` | |
| `--c-accent` | `#8FA888` | sage |
| `--c-accent-soft` | `rgba(143,168,136,0.12)` | |
| `--c-success` | `#7CA664` | |
| `--c-warn` | `#C9A35A` | |
| `--c-danger` | `#C77863` | |
| `--c-info` | `#7AA5C9` | |

#### Alternate accents (user-selectable in Settings → Aparência)
| name | light | dark |
|---|---|---|
| sage (default) | `#5E7556` | `#8FA888` |
| ochre | `#8E6A2C` | `#C9A35A` |
| ink | `#3B5570` | `#7AA5C9` |
| rust | `#8B4A38` | `#C78866` |

**One accent at a time.** The accent has one visual job: **focus and active state.** Never paint buttons primary-color, never paint section headers in accent. The accent is used in: focused-input border, active-row bottom hairline, comment-widget left rule (open state), unviewed→viewed file marker, and select navigation indicators in the modal.

#### Diff hunk tints
```css
--c-diff-add:    rgba(124, 166, 100, 0.10);  /* dark */ or rgba(79, 122, 62, 0.10);  /* light */
--c-diff-add-ln: rgba(124, 166, 100, 0.32);  /* dark */ or rgba(79, 122, 62, 0.22);  /* light */
--c-diff-del:    rgba(199, 120, 99, 0.10);   /* dark */ or rgba(166, 74, 58, 0.10);  /* light */
--c-diff-del-ln: rgba(199, 120, 99, 0.32);   /* dark */ or rgba(166, 74, 58, 0.22);  /* light */
```

The 2px left rule does the work; the tinted background is dialed to ~10% opacity so the rule is what the eye registers.

---

### 2. Typography — three jobs, three families

Commit to a strict split. Every visible string belongs to one of three categories:

| category | family | when |
|---|---|---|
| **prose** | sans (Inter / system stack via `--font-ui`) | comment bodies, PR titles, modal labels, button copy, plain text |
| **fact** | mono (JetBrains Mono via `--font-mono`) | filenames, IDs, line numbers, timestamps, deltas, branch names, hashes, group labels, status line, tooltip copy |
| **voice** | italic serif (Source Serif 4 — needs to be added) | section titles in Settings modal, empty-state lines, status-line creed, modal subheadings. **Max ~3 appearances per session.** |

#### Type roles (exact specs)

| role | family | size | weight | letter-spacing | color | notes |
|---|---|---|---|---|---|---|
| titlebar — PR title | sans | 13 | 500 | -0.005em | text | the only sans element this bold in the entire app |
| titlebar — PR number | mono | 11 | 400 | 0 | overlay | e.g. `#231` |
| titlebar — breadcrumb org | mono | 12 | 400 | 0 | subtext | |
| titlebar — breadcrumb repo (leaf) | mono | 12 | 500 | 0 | text | weight bump to mark leaf |
| titlebar — slashes | mono | 12 | 400 | 0 | overlay | `/` separators dim |
| pane header | mono | 10 | 500 | 0.10em | overlay | uppercase, e.g. "PULL REQUESTS" |
| group label (PR list) | mono | 10 | 500 | 0.10em | overlay | uppercase + 1px hairline to right of text |
| pr list — title | sans | 12.5 | 400 | 0 | text | line-height 1.3 |
| pr list — meta | mono | 10.5 | 400 | 0 | subtext | `15f · 14h` pattern, sep dot in overlay color |
| file tree | mono | 12 | 400 | 0 | text (unviewed) / subtext (viewed) | |
| file tree — delta | mono | 10.5 | 400 | 0 | success/danger | `+128 −77` |
| pr banner — title | sans | 15 | 500 | -0.005em | text | line-height 1.35 |
| pr banner — meta | mono | 11 | 400 | 0 | subtext | with `b` highlights in text color |
| diff file header — path | mono | 11 | 400 | 0 | text + overlay slashes | `.leaf { font-weight: 500; }` |
| diff line — gutter | mono | 11 | 400 | 0 | overlay | right-aligned, padding-right 10px |
| diff line — code | mono | 12 | 400 | 0 | text | tokenized with syntax colors |
| hunk header | mono | 11 | 400 | 0 | subtext | italic, `@@ −36,33 +36,34 @@` |
| comment ribbon | mono | 11 | 400 | 0 | subtext | with `b` in text color (line ref) |
| comment state tag | mono | 10 | 400 | 0.08em | accent / warn / overlay | uppercase, e.g. "ABERTO" |
| comment body | sans | 12.5 | 400 | 0 | text | line-height 1.55 |
| comment body — code inline | mono | 11.5 | 400 | 0 | text on mantle bg | 1px 5px padding, 2px radius |
| comment actions | mono | 11 | 400 | 0 | subtext (links) / accent (primary) | hairline text links, NOT buttons |
| status line — segment | mono | 11 | 400 | 0 | subtext | with `b` in text color |
| status line — creed | serif italic | 12.5 | 400 | 0.005em | subtext | right-aligned, the app's voice |
| modal — title | serif italic | 22 | 400 | -0.005em | text | e.g. "Configurações" |
| modal — section title | serif italic | 18 | 400 | 0 | text | e.g. "Aparência" |
| modal — field label | mono | 10 | 400 | 0.10em | subtext | uppercase, e.g. "TEMA" |
| modal — hint | serif italic | 12.5 | 400 | 0 | subtext | max-width 56ch |
| modal — segment button | mono | 11.5 | 400 | 0 | subtext / text (active) | hairline borders, never pill |
| empty state | serif italic | 15.5 | 400 | 0 | subtext | e.g. "Nada na sua fila." |
| empty state — sub | mono | 11 | 400 | 0.04em | overlay | timestamp under the line |

**Resist weight gymnastics.** 400 and 500 only. No 300 or 700. Hierarchy comes from family + color + size.

---

### 3. Layout — three panes, with collapse on PR open

The shell at 1520×960 (canonical reference size) is:

```
┌──────────────────────────────────────────────────────────────────┐
│ titlebar  36px                                                    │
├──────────────────────────────────────────────────────────────────┤
│ ┌────┬───────┬──────────────────────────────────────────────────┐ │
│ │rail│ tree  │  diff                                            │ │
│ │28px│ 360px │  1132px (or 1fr)                                 │ │
│ └────┴───────┴──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ status line  28px                                                 │
└──────────────────────────────────────────────────────────────────┘
```

When **no PR is open**: `280 / 0 / 1fr` (file tree hidden, PR list takes 280, diff fills rest). Or simply hide the diff pane until a PR is open and show the PR list at full width.

When **a PR is open** (default): PR list **collapses to a 28px rail**, file tree appears at 280–360px, diff fills the rest. The rail shows: expand chevron at top, hairline separator, vertical stack of CI-colored dots representing the queue, a counter at the bottom.

When the user opens the rail: full PR list returns at 280px, file tree shrinks to 280px. A close affordance in the PR list header collapses back to rail.

**Transition:** `grid-template-columns 220ms ease`. Single property, single easing. No bounce.

#### Densities (Settings → Aparência → Densidade)

Compact / Confortável (default) / Espaçosa, applied as `body[data-density]` and used by `--density-row-pad-*` tokens already in the codebase. Row paddings I recommend:

| pane | compact | comfortable | spacious |
|---|---|---|---|
| PR list row | 5px | 9px | 13px (current) |
| file tree row | 3px | 4px | 6px |
| diff line | 1px | 2px | 3px |

---

### 4. Component specs

#### Status line (`<StatusLine>`) — **new component**

Persistent footer, 28px tall, mantle bg, top hairline border.

Layout: row of "segments" left-to-right, gap 24px. The last item floats right (`margin-left: auto`) and is the **creed** in italic serif — the app's voice.

Segments shown (each shows what's true; segments hide when irrelevant):
- Repo dot + name (CI dot in success/warn/danger/overlay)
- `PR #<num>`
- `<n> arq · +<x> −<y>`
- `CI <state> em <duration>`
- `visto há <duration>` (dwell time on current file)
- Draft/open counter when nonzero: `∗ 1 rascunho · 1 aberto`
- **Creed** (right): one italic-serif phrase. Default: *"lendo. sem resumos."* User-configurable via Settings → Aparência → Voz. Alternates: *"código antes do colega."*, *"sem atalhos não pedidos."*, *"um diff por vez."*, *"você é o revisor."*

Segments use `<b>` for emphasized text (text color over the segment's subtext base).

When an event fires (file viewed, draft saved), one segment briefly flashes for 2s:  
`visto · Impl.java · 47 linhas · 2m41s` → reverts to default segments.

#### Comment widget (`<CommentWidget>`) — **redesigned**

Three states (open / draft / resolved). All same shape. State is communicated **entirely** by the left edge rule and the state tag in the ribbon. No badge, no chip, no fill.

Renders as a Monaco view zone (existing integration). Inside the view zone, render:

```
┌─[2px sage rule] ──────────────────────────────────┐
│                                                   │
│  L47 · direita · christiansmmc · 9m      ABERTO   │  ← ribbon: mono 11, state tag mono 10/0.08em uppercase
│                                                   │
│  Mensagem em inglês quebra o padrão do            │  ← body: sans 12.5, line-height 1.55
│  arquivo — os outros log.info / log.warn          │
│  daqui estão em PT-BR. Padroniza?                 │
│                                                   │
│                resolver  responder  salvar rascunho  ← actions: mono 11, hairline text links
└───────────────────────────────────────────────────┘
```

State rules:
- **open**: solid 2px left rule in `--c-accent`, state tag in accent, body in text color
- **draft**: dashed 2px left rule in `--c-warn`, state tag in warn, body in subtext + italic
- **resolved**: solid 2px left rule in `--c-overlay`, state tag in overlay, opacity 0.7

Layout:
- card has 1px `--c-line-soft` border (all sides except the 2px left)
- background `--c-surface1` (paper) / `--c-base` (linen)
- 10px 16px 12px padding
- `max-width: 540px` in side-by-side; `680px` in inline
- `position: sticky; left: 24px` so the widget stays visible during horizontal scroll
- When anchored to the right side (`data-side="right"`), positioned with `margin-left: calc(50% + 12px)` in side-by-side; reset to `margin-left: 24px` in inline mode
- The ribbon includes the `anchor` (esquerda / direita) only in side-by-side mode

Actions are **hairline text links** (`<a>` styled, mono 11, color subtext). Hover: text color + underline in `--c-line`. The "primary" action (e.g. "salvar rascunho", "incluir no review") uses `--c-accent` color but no fill.

**Do not** render a button-shaped element. Buttons in a view zone are noisy and inconsistent with Monaco's scroll behavior.

#### PR list row (`<PRListRow>`) — **denser, more typographic**

Grid template: `14px 1fr auto`, gap 10px, padding `9px 14px` (comfortable).

- CI dot: 7×7 circle in success/warn/danger/overlay (`--c-success` / `--c-warn` / `--c-danger` / `--c-overlay`)
- Title: sans 12.5, single line, ellipsize
- Meta (right-aligned): mono 10.5, `<spans>` separated by `·` in overlay color. Show `<files>f · <age>`. **Do not show author** — the reviewer knows who they are.

**Active row**: background `--c-mantle`, bottom border hairline `--c-accent`. No left chevron, no left rule. The mantle lift + accent underline are the affordance.

#### Group label (PR list, repo headers)

Mono 10 / 0.10em / uppercase / overlay color. Padding `14px 14px 4px`. Followed by a `flex: 1; height: 1px; background: --c-line-soft` element to render as `LABEL ──────────`. The visual weight sits in the rule, not the text.

#### File tree row (`<FileTreeRow>`) — **add indent guides + viewed marker**

Grid: `<indent> 14px 1fr auto`, gap 6px, padding `3px 12px 3px 8px`.

- Indent: per-level hairline vertical guides at each indent column (1px lines in `--c-line-soft`). At depth N, render N guides.
- Name: mono 12, color `--c-text` (unviewed) or `--c-subtext` (viewed). Truncate with ellipsis.
- Delta (right): mono 10.5, two children (`+N` in success, `−N` in danger), gap 6px.
- **Seen dot** (far right): 6×6 circle, 1.5px border in overlay color. When viewed: fill + border `--c-accent`. Click toggles viewed state.

Active row gets a 2px `--c-accent` left rule (pseudo-element, positioned absolute at left: 0).

#### Diff file header (`<DiffFileHeader>`) — **typographic, not chrome**

Layout: `flex` row, padding `10px 24px`, mantle bg, line border bottom.

Left to right, gap 14px:
1. **Seen dot** (9×9, 1.5px overlay border, transparent fill). Click to mark viewed. When viewed: filled + bordered `--c-accent`. **Replace the "Marcar como visto" pill button entirely** — the dot is the entire affordance.
2. **Path**: mono 11, slashes in overlay color, leaf with `font-weight: 500` in text color. Long paths: ellipsize middle segments (`src/main/.../leaf.java` style) while preserving the leaf.
3. **Delta** (right-aligned via `margin-left: auto`): two mono spans, `+N` in success, `−N` in danger, gap 10px.
4. **Right actions**: text links in mono 11, gap 14px. E.g. `copiar caminho · side-by-side`. Hover: subtext → text.

No box-shadow. No background lift. The header is a 1px line above and below the path.

#### Settings modal (`<SettingsModal>`) — **typographic shell**

Two-column grid: `200px 1fr`. Width 760px, max-height `calc(100% - 80px)`. Centered in the main area (not over the titlebar or status line). Box-shadow `0 20px 60px rgba(0,0,0,0.5)`.

- **Header** (full-width): "Configurações" in serif italic 22/400, with a hairline-bordered close button on the right.
- **Sidebar nav** (200px, mantle bg): vertical list of section links. Active link has a 2px `--c-accent` left rule + `--c-base` background. Inactive: subtext, hover: text.
- **Body**: 24px 32px padding. Each section opens with a serif italic 18/400 title.

Form patterns inside the body:

- **Field**: vertical flex, gap 8px. Label is mono 10 / 0.10em / uppercase / subtext. Control follows. Hint below in serif italic 12.5, subtext, max-width 56ch.
- **Segmented control**: hairline-bordered, NOT pill. Each segment has `border-right: 1px solid --c-line` (last child no border). Active segment: `--c-mantle` background, text color. Hover (non-active): text color.
- **Accent picker**: row of 28×28 square swatches with 1.5px transparent border. Active swatch: border in `--c-text`.
- **Checkbox**: 14×14 box, 1.5px overlay border. Checked: filled `--c-accent` with white `✓` inside. No "toggle switch" patterns.

Esc closes. Click on backdrop closes. Tab navigation within modal.

#### Titlebar — **already mostly right; minor adjustments**

- 36px tall, mantle background, line bottom border. Drag region set on the empty area.
- Left segment (drag): back chevron, breadcrumb path (slashes overlay, leaf weight 500), PR number in overlay mono, PR title in sans 13/500.
- Right segment (no-drag):
  - **Ctrl+K hint**: mono 11, padding 4px 10px, 1px line border, `--c-base` background. Inside: a faded `⌘` glyph in overlay color, then `K`. Hover lifts to `--c-surface0`.
  - **Revisar button**: mono 11, padding 4px 14px, 1px accent border, `--c-accent-soft` background, text color. Hover: filled accent, base text. **Don't ship this as a generic "primary button" — it's the only filled-style button in the entire app, reserved for the review action.**
  - **Window controls** (gear, minimize, maximize, close): 36×36 icon buttons, no background, subtext color icons, 14×14 SVG. Hover lifts to `--c-surface0`; close hover fills `--c-danger` with white icon.

The settings gear opens the Settings modal (no separate page).

#### Ctrl+K command palette

Centered modal, 640px wide, max 480px tall. Opens above the app body (between titlebar and status line). Top: input row with scope chip in accent (e.g. `@scorehub-signature-unico`), `⌕` glyph in overlay, mono 13 input, "esc" hint on the right. Body: scrollable results grouped by source (arquivos, pull requests, comandos…). Each result row: 16px icon column (mono glyph) + title + right-aligned mono meta. Matched text highlighted in `--c-accent`. Active row: mantle background + 2px accent left rule.

Footer (mantle bg, top hairline): left = keyboard hints (`↑↓ navegar · ↵ abrir · ⌘↵ abrir em background · esc fechar`), right = italic-serif creed *"sem sugestões. apenas o que você buscar."* — this disappears once the user types a character, returns when empty.

#### Settings modal — full sections

Seven nav items (Aparência, Repositórios, Filtros, Diff, Paleta, Conta, Atalhos). All sections use the same form patterns:

- **`<h3>`** — section title, italic serif 18/400
- **`<h4>`** — subsection rule, mono 10 / 0.10em uppercase, with hairline bottom border
- **`.field`** — vertical flex (label + control + optional hint)
- **`.seg`** — segmented control, hairline borders, NOT pill
- **`.check`** — 14px box checkbox with accent fill when on
- **`.cfg-number`** — number stepper with hairline borders and unit label in overlay
- **`.cfg-list`** — table-like list of items (repos, filters, account info) with hairline-rule rows and text-link actions on the right
- **`.cfg-add`** — input + hairline buttons row for adding new items
- **`.kbd-list`** — keyboard shortcut table with `desc / em` cells on the left and a row of mono-keycap spans on the right

The Atalhos section is the most opinionated: ~14 default shortcuts, mapped to vim-ish single-letter keys (`J/K` for nav, `V` for viewed, `C` for comment, `N` for next change) and standard modifier-Enter for resolve/include. Single keys are intentional — this app is for people who learn the keyboard.

#### PR list state variants (4 states)

The PR list pane swaps content based on `data-pr-state`:

- **`full`** — the normal list of grouped PR rows (default)
- **`empty`** — centered italic-serif line ("Nada na sua fila.") + mono timestamp sub-line ("tudo limpo · 09:42"). The search/tabs chrome remains.
- **`loading`** — 1px accent sweep along the top + skeleton bars in mantle color (group labels at 60% width, row pairs at 75/35% widths). Search/tabs chrome remains.
- **`error`** — left-aligned compiler-style block. `error:` prefix in danger, indented cause in subtext, dim hint lines in overlay, `→ <action>` links in accent.

These same four state-shape principles apply anywhere a list/data view exists in the app: just substitute the content.

#### First-run screen (no repos)

Replaces the entire main area (titlebar + status line still visible). Left-aligned card, max 480px wide:

- Eyebrow: mono 10 / 0.10em uppercase "primeira vez"
- Title: italic serif 28/400 "Nenhum repositório, ainda."
- Two paragraphs (sans 13.5, subtext, line-height 1.6, max 46ch)
- Two action links in mono 12 with hairline accent underlines

**Twenty words of prose, two link actions.** No tour, no checklist, no progress bar of setup steps.

#### "No PR active" placeholder

When the PR list is open but no PR is selected (after closing one, e.g.), the diff pane chrome hides entirely and shows a centered italic-serif line: "Escolha um PR à esquerda." with sub "nada está selecionado." in mono overlay. Single sentence. No illustration.

---

### 5. Empty / loading / error states

All four state types follow the same voice: **calm, mono-coded, with one italic line.**

#### Empty (e.g. "Nada pra revisar")

```
┌──────────────────────────────┐
│                              │
│                              │
│     Nada na sua fila.        │   ← serif italic 15.5, subtext
│       tudo limpo · 09:42     │   ← mono 11 / 0.04em, overlay
│                              │
│                              │
└──────────────────────────────┘
```

No icon. No CTA. No illustration. The mono timestamp is the proof of life — confirms the app is fetching, just has nothing to show.

#### Loading

A 1px progress sweep along the top of the pane (`--c-accent`, 30% width, indeterminate 1.6s ease-in-out), plus skeleton bars at row heights (`--c-mantle` blocks). **No spinner.** Spinners are placeholders for thought; the 1px sweep is information.

```css
@keyframes sweep { 0% { left: -30%; } 100% { left: 100%; } }
```

#### Error

Formatted as compiler output. Mono, left-aligned (not centered).

```
error: github.com responded 401 unauthorized.
  token expirou em 23/05 às 18:42
  reautenticar →    abrir configurações
```

`error:` prefix in `--c-danger`, indented cause in subtext, indented `→` action link in `--c-accent`. Reads like `cargo` or `tsc` output.

#### First-run (no repos configured)

Left-aligned, ~36ch max-width.

```
Nenhum repositório, ainda.      ← serif italic 18/500

Aponta esta ferramenta pros      ← sans 12.5, subtext, line-height 1.55
repositórios que você revisa
todo dia. Ela vai ficar quieta
até você abrir um PR.

adicionar repositório →          ← mono 11, accent, hairline underline
```

**No onboarding tour. No progress bar of setup steps. Twenty words of prose, one link.**

---

### 6. Interactions & motion

| event | response |
|---|---|
| open PR | PR list rail collapse, file tree appear, diff load. Single 220ms ease transition on `.main` grid-template-columns. |
| close PR | reverse — file tree hides, PR list expands. |
| toggle file viewed | seen dot fills accent; status line briefly logs `visto · <file> · <lines> linhas · <duration>` for 2s, then reverts. |
| save draft comment | dashed-warn widget appears in place; status line counter `∗ N rascunho` increments. |
| resolve thread | widget transitions to opacity 0.7 + overlay rule. Body text dims to subtext. 220ms opacity transition. |
| Ctrl+K | command palette opens centered; footer shows italic serif *"sem sugestões. apenas o que você buscar."* until the input gains a character, then footer hides. |
| ESC in any modal/palette | closes immediately. |
| hover on toolbar icon | 100ms ease background fade to `--c-surface0`. |

**Resist motion gymnastics.** No spring physics, no stagger, no parallax. Single duration (220ms) and single easing (ease) for all UI transitions. Diff scrolling uses Monaco's own behavior; don't override.

---

### 7. The eight "no" rules — what to refuse when asked

These are positioning-load-bearing. Any one of them shipping kills the brief.

| ask | refuse | reason |
|---|---|---|
| "Add a button to summarize this PR with Claude / AI" | **absolutely** | summary is the reviewer's job. one such feature and the entire positioning is gone. |
| "Make the accent brand-purple / brand-blue" | yes | bright accent on flat surface is a casino tell. one muted accent only. |
| "Add a colored chip for draft/open/resolved on every comment" | yes | the rule on the left edge is doing the work. chips double-count and noise the diff. |
| "Add emoji reactions like GitHub" | yes | this app is for people who write paragraphs. |
| "Add an onboarding tour" | yes | first-run is a sentence. anyone shipping production code can find Settings. |
| "Show committer avatars in the PR list" | yes | the user already knows who they are. avatars are the GitHub-web tax. |
| "A 'PR Health' insights panel" | yes | the status line is the dashboard. anything else is a place to ignore numbers in. |
| "Make the loading spinner spin" | yes | spinners are placeholders for thought. the 1px sweep is information. |

---

## Where this maps to your existing codebase

The codebase already has the right shape — this redesign is mostly token replacement + a few new components + tightened typography rules.

| existing | action |
|---|---|
| `src/styles/tokens.css` | replace Catppuccin tokens with Paper/Linen above. Keep your existing spacing scale, radii, motion, z-index tokens. Add `--font-serif`. |
| `src/components/ui/Button.tsx` | most usages should drop to hairline text-link variant. Reserve "primary filled" only for the Revisar action. |
| `src/components/ui/Modal.tsx` | apply the two-column shell pattern + italic-serif title. |
| `src/components/ui/Badge.tsx` | review usage. State should be communicated by rule + color of the parent element, not by a Badge. Likely remove most usages. |
| custom titlebar | keep structure, update only colors/typography per spec. |
| three-pane layout | add the rail-collapse behavior on PR open. New `<PRListRail>` component (28px, vertical dots + chevron). |
| Monaco DiffEditor + view zones | redesign the view-zone content to the new comment widget spec. Sticky-left already in place per your notes. |
| Settings modal | apply typographic shell. Tema/Densidade/Acento under Aparência. Add the **Voz** field (status-line creed selector — text-options dropdown). |
| Ctrl+K palette | add italic-serif empty-state footer line. |
| `<EmptyState>` primitive | reshape per spec — italic-serif line + mono timestamp sub-line. Remove icon prop. |
| **new**: `<StatusLine>` | persistent 28px footer. Subscribes to PR state, draft count, file-viewed events. |

---

## Files in this bundle

| file | purpose |
|---|---|
| `App Mock 1520x960.html` | the canonical visual reference — full app at the user's resolution, in linen + sage by default. **Scene navigator at bottom-left** switches between 6 scenes: `diff` (default with comments inline), `lista` (PR list expanded, no PR active), `vazio` (empty PR list), `loading` (skeleton + 1px sweep), `erro` (401 compiler-style), `sem repos` (first-run full-screen). Other toggles: `sbs / inline` (diff layout mode). Click ⌘K in titlebar to open the Ctrl+K command palette. Click the gear to open Settings (7 sections clickable: Aparência, Repositórios, Filtros, Diff, Paleta, Conta, Atalhos). Theme (linen/paper) and accent live inside Settings → Aparência. |
| `Notes on a Workshop.html` | long-form design memo — explains the eight directions in prose, with embedded artifacts (palette board, type specimen, state cards, comment-widget variations, status-line creed picker). Read this first if you want the *why*; use the App Mock for the *what*. |
| `memo.css` / `memo.jsx` / `artifacts.jsx` / `tweaks-panel.jsx` | the React + CSS that powers `Notes on a Workshop.html`. Reference only — don't lift directly into the app. |

## Assets

No image assets. All visuals are CSS, SVG icons (inline), and typography. Fonts loaded via Google Fonts in the mocks:
- **Inter** (400, 500, 600) — sans / prose
- **JetBrains Mono** (400, 500, 600) — mono / facts (you already have this)
- **Source Serif 4** (italic 400/500) — voice. **This is the one new font dependency.** ~30KB woff2 for italic-only subset.

If 30KB feels heavy, alternates: Iowan Old Style (system on macOS), Palatino Linotype (system on Windows), Georgia (universal). System-serif fallback already in the CSS stack.

---

## Open questions to resolve before implementation

1. **Creed default and alternates**: ship a single default ("lendo. sem resumos.") and four alternates in Settings, or ship one creed with no alternate? My recommendation is one default + 4 alternates; the choice is itself part of the personality, and most users will keep the default.
2. **Settings → Voz** as a field: do you want the creed-picker UI shown to all users, or hidden behind a "show advanced" toggle? Default visible.
3. **Status line on narrow widths**: at <900px (not a target per constraints, but worth knowing) some segments should drop. The creed and the active-PR segment should be the last to go.
4. **Indent guides** in file tree: ship them by default, or behind a Settings toggle? My take: default on, no toggle. The codebase already has "compact paths" as a toggle — the indent guides are visual companion to that and shouldn't compound the option surface.

Ask the designer (or me, in another session) before deviating on any of the "eight no's" — they're load-bearing.
