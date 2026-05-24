# Implementation Plan — Etapa 3 "Calm Workshop"

Plano executável em sessões independentes de ~30–60 min cada. Cada sessão é auto-contida: começa do zero, lê só o necessário, deixa um estado verificável.

Regras herdadas do README (não negociáveis, valem em todas as sessões):
- Sem IA. Sem avatares. Sem chips coloridos pra estado. Sem emoji reactions. Sem spinner girando. Sem tour de onboarding.
- **Um acento por vez.** Botões NÃO usam acento como fill — exceção única: o botão Revisar (accent-soft bg + accent border + text color).
- Estado se comunica por **rule + cor do elemento pai**, não por Badge.
- Motion: 220ms ease, uma duração, uma curva. Nada de bounce.

Antes de cada sessão, rodar (mas só validar no fim):
```bash
pnpm tsc --noEmit && pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm exec vite build
```
Esse comando valida apenas o frontend. **Smoke real do app** (no fim da etapa OU quando a sessão afetar comportamento runtime) exige:
```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 pnpm tauri dev
```
e o build de release final, conforme `CLAUDE.md`:
```bash
NO_STRIP=true pnpm tauri build --bundles rpm
```

Branch por sessão: `feat/etapa-3-N-<slug>` a partir de `master`. Merge com `--no-ff` no fim. Bump de versão por sessão merged (patch). Build rpm conforme `CLAUDE.md`.

---

## Índice

| # | Título | Depende de | Mexe em | ETA |
|---|---|---|---|---|
| S1 | Paleta Paper/Linen + acentos + serif | — | tokens.css, globals.css, ThemeProvider, types | 45 min |
| S2 | Componente `<StatusLine>` | S1 | novo `components/layout/StatusLine.tsx`, App.tsx | 45 min |
| S3 | Tipografia por role nos primitives | S1 | Button, Badge, Modal, Tabs, EmptyState | 50 min |
| S4 | PR list rows densos + meta mono | S1, S3 | PrListItem, PrListPanel | 40 min |
| S5 | Diff file header tipográfico + seen-dot | S1, S3 | DiffPanel (cabeçalho), globals.css | 35 min |
| S6 | Comment widget em 3 estados | S1, S3 | InlineThreadWidget, InlineDraftWidget, InlineCommentEditor, inlineWidgetStyle | 60 min |
| S7 | Settings modal tipográfico + 7 seções | S1, S3, S2 | SettingsModal + 7 section files, types.ts, Rust Settings | 60 min |
| S8 | Ctrl+K palette com creed footer + scope chip | S1, S3, S7 | CommandPalette | 35 min |
| S9 | Empty / loading / error / first-run | S1, S3 | EmptyState, PrListPanel, DiffPanel, FileTreePanel, App.tsx (PatSection) | 50 min |
| S10 | PR list collapse-rail (28px com CI dots) | S4 | Layout.tsx, novo `components/layout/PrListRail.tsx`, uiStore | 45 min |

Ordem recomendada: S1 → (S2 ∥ S3) → S4 → S5 → S6 → S7 → S8 → S9 → S10. S2 e S3 podem ir em paralelo após S1; tudo o resto é sequencial dentro da cadeia indicada.

---

## S1 · Paleta Paper/Linen + acentos + fonte serif

**Objetivo:** trocar Catppuccin (latte/mocha) por Paper/Linen, adicionar 4 acentos (sage/ochre/ink/rust), adicionar Source Serif 4 e `--font-serif`. Nenhuma mudança visual em componentes — só foundation.

**Referências do handoff:** `README.md` seções 1 (Palette) e 2 (Typography — só o `--font-serif` por ora).

**Arquivos a tocar:**
- `src/styles/tokens.css` — adicionar `--font-serif`, `--c-line`, `--c-line-soft`, `--c-success`, `--c-warn`, `--c-danger`, `--c-info`. Manter spacing/radius/motion existentes.
- `src/styles/globals.css` — substituir blocos `body[data-theme="latte"]` e `body[data-theme="mocha"]` pelas novas cores Paper/Linen. Renomear tokens (`latte` → `paper`, `mocha` → `linen`). Adicionar `body[data-accent="sage|ochre|ink|rust"]` com sobrescrita de `--c-accent` + `--c-accent-soft` por tema. Adicionar `--c-diff-add`, `--c-diff-add-ln`, `--c-diff-del`, `--c-diff-del-ln` por tema. Adicionar `@font-face` para Source Serif 4 italic 400/500 apontando para `src/assets/fonts/` (servido via Vite asset import).
- `src/assets/fonts/source-serif-4-italic-400.woff2` (novo) — baixar `~25 KB` do CDN Fontsource ou Google Fonts, comitar no repo. **Sem Google Fonts em runtime.** Tauri é offline-first.
- `src/assets/fonts/source-serif-4-italic-500.woff2` (novo) — idem.
- `src/theme/ThemeProvider.tsx` — renomear `ResolvedTheme = "latte" | "mocha"` → `"paper" | "linen"`. Atualizar `document.body.dataset.theme`. Manter o tipo `ThemeChoice` ("light" | "dark" | "system") — mapeamento `light → paper`, `dark → linen`.
- `src/theme/catppuccin.ts` — renomear o arquivo pra `src/theme/palette.ts`, exportar `paper` + `linen` com as novas cores. Atualizar todos os imports.
- `src/theme/monaco-themes.ts` — atualizar refs (`monacoLatte` / `monacoMocha` → `monacoPaper` / `monacoLinen`). Refazer mapping pra novas cores (`base`, `text`, `subtext`, `overlay`, `accent`, `success`, `warn`, `danger`, `info`).
- `src/components/diff/DiffPanel.tsx` — atualizar imports + nome de tema Monaco.
- `src/ipc/types.ts` — sem mudança ainda; `accent_color` entra em S7. Em S1 hardcode `data-accent="sage"` em `App.tsx` ou via ThemeProvider.

**Done quando:**
- [ ] App abre em tema linen + accent sage por default; toggle system/light/dark continua funcionando.
- [ ] `document.body.dataset.theme` é `"paper"` ou `"linen"`; `document.body.dataset.accent` é `"sage"`.
- [ ] Monaco diff renderiza com as novas cores (sem buracos de cor velha vazando).
- [ ] `pnpm tsc --noEmit` passa. `pnpm test` passa (vai precisar atualizar mocks de tema em testes; checar `src/__tests__/CommandPalette.test.tsx`, `FileTreePanel.test.tsx`, `SettingsModal.test.tsx`).
- [ ] Visualmente: sem mudança em componentes além das cores (fontes, layout iguais).

**Risco:**
- **Decisão fixa: rename direto, sem alias.** `--c-green` → `--c-success`, `--c-red` → `--c-danger`, `--c-amber` → `--c-warn`, `--c-blue` → `--c-info`. Antes de renomear: grep `--c-green\|--c-red\|--c-amber\|--c-blue` em todo `src/`, atualizar de uma vez (DiffPanel, PrListItem, InlineDraftWidget, Banner, Toast, FileTreeNode, monaco-themes). Sem alias temporário — alias tende a virar permanente.

---

## S2 · Componente `<StatusLine>`

**Objetivo:** criar componente novo de 28px no rodapé, sem substituir nada ainda. Subscreve PR atual + draft count + creed. Layout: row de segments + creed à direita em italic serif.

**Depende de:** S1 (precisa de `--font-serif`, `--c-success/warn/danger`, `--c-line`, `--c-mantle`).

**Referências do handoff:** `README.md` seção 4 → "Status line"; `App Mock 1520x960.html` rodapé; `Notes on a Workshop.html` seções 1 e 8.

**Arquivos a tocar:**
- `src/components/layout/StatusLine.tsx` (novo) — componente que lê de `usePrsStore` (currentPr, ci_status, diff lengths), `useDraftsStore` (drafts.length). Layout flex row, gap 24px, padding 0 16px, height 28px, mantle bg, border-top 1px line. Segments:
  - Repo dot (CI color) + `owner/repo`
  - `PR #<n>`
  - `<n> arq · +<x> −<y>` (somar additions/deletions do diff)
  - `∗ <n> rascunho` quando draft count > 0
  - Creed à direita em `var(--font-serif)` italic 12.5
- `src/App.tsx` — adicionar `<StatusLine />` como último filho do `<div>` raiz (depois de Layout, antes dos modals). Hardcode `creed="lendo. sem resumos."` por enquanto.

**Done quando:**
- [ ] StatusLine aparece em todos os estados (com/sem PR aberto).
- [ ] Sem PR: mostra só o creed (segments vazios → reduzem).
- [ ] Com PR aberto: mostra repo dot + número + counts; draft count aparece e some.
- [ ] Creed em italic serif visível à direita.
- [ ] Sem regressão no Layout (status line é fora do `<Layout>`, então ele não pode "comer" altura do diff).
- [ ] Tipos passam, testes passam.

**Risco:**
- Layout existente já é `display: flex; flexDirection: column; height: 100vh` com `flex: 1, minHeight: 0` no wrapper do Layout. Adicionar a StatusLine como `flex: 0 0 28px` deve funcionar, mas validar que o painel central não corta diff.
- Em estado "no PR" o Layout mostra um painel à direita vazio; StatusLine deve aparecer normalmente abaixo dele.

---

## S3 · Tipografia por role nos primitives

**Objetivo:** estabelecer "três jobs, três famílias" nos primitives (`ui/`) e em containers leves (titlebar, group headers). Sem mexer em PrListItem / FileTree / Diff (esses têm sessões próprias).

**Depende de:** S1 (precisa de `--font-serif` + tokens novos).

**Referências do handoff:** `README.md` seção 2 "Typography — three jobs"; tabela "Type roles".

**Pré-passo (já feito durante o planejamento):** `grep -rn 'variant="primary"' src/` retornou 11 call sites. Roteiro de migração:

| call site | nova variant | observação |
|---|---|---|
| `components/layout/TitleBar.tsx:135` (Revisar) | **manter `primary`** | redefinido em S3: accent border + accent-soft bg + text color (não mais fill branco). É o ÚNICO sobrevivente de `primary`. |
| `components/diff/InlineCommentEditor.tsx:68` (Salvar draft) | `link` | tratado em S6, mas o variant precisa existir após S3. |
| `components/diff/InlineThreadWidget.tsx:138` (Responder) | `link` | idem S6. |
| `components/settings/PatSection.tsx:43` (Conectar) | `subtle` (refeito em S9 como first-run text link `accent`) | S9 owns visual. |
| `components/settings/ContaSection.tsx:106` (Substituir token) | `subtle` | tratado em S7. |
| `components/settings/BrowseReposModal.tsx:116` (Salvar) | `subtle` | tratado em S7. |
| `components/settings/ReposSection.tsx:86` (Adicionar repo) | `subtle` | tratado em S7. |
| `components/review/ReviewSubmitPanel.tsx:46` (Enviar review) | `subtle` (ou `primary` se decidirmos que é gêmeo do Revisar — **decisão aberta**) | flag pra discutir em S7/S6. Default: `subtle`. |
| `components/ui/UiGallery.tsx` (3 usos) | atualizar pra demonstrar `primary` (Revisar), `link`, `subtle` | demo interno. |

**Arquivos a tocar:**
- `src/components/ui/Button.tsx` — adicionar variant `"link"`: semântica `<button>` (não `<a>`), visual de text link — bg transparent, sem border, sem altura fixa (`height: auto`), padding `0`, mono 11, color `--c-subtext`, hover color `--c-text` + `border-bottom: 1px solid var(--c-line)`. Prop `tone?: "neutral" | "accent"` para variar cor primária (accent quando for ação-de-registro do bloco). Primary fica redefinido para o Revisar (accent border + accent-soft bg + text color, NÃO fill branco). Sizes mantêm.
- `src/components/ui/Modal.tsx` — title em `var(--font-serif)` italic 22 / 400. Border `--c-line` (não mais `--c-surface1`). Close button hairline-bordered.
- `src/components/ui/EmptyState.tsx` — title em `var(--font-serif)` italic 15.5, sem ícone com background pill (remover prop `icon` ou ignorá-la; o handoff diz "no icon"). Sub-line opcional em mono 11 / 0.04em uppercase, overlay color.
- `src/components/ui/Badge.tsx` — manter para casos onde for inevitável, mas adicionar variant `"hairline"` (1px border, no fill, mono uppercase 10 / 0.08em). Maioria dos usos vai sair em sessões posteriores.
- `src/components/ui/Tabs.tsx` — labels em mono 11 / 0.10em uppercase? Não, README só pede uppercase em pane headers e group labels — Tabs (current/inactive) ficam em sans 12 / 400 (mono só se for label de "fact"). Underline em accent (1px) na ativa.
- `src/components/layout/TitleBar.tsx` — breadcrumb: slashes em `--c-overlay`, leaf (repo) com `font-weight: 500`. PR número em mono `--c-overlay`. PR title em sans 13 / 500. Remover `ChevronRight` (vai virar `/` em mono).

**Done quando:**
- [ ] Modal title aparece em italic serif.
- [ ] Empty state title aparece em italic serif, sem ícone-pill.
- [ ] Button variant `"link"` existe e renderiza como text-link (sem altura de control fixa, sem border).
- [ ] Button variant `"primary"` agora é hairline accent + accent-soft bg + text color (Revisar test renderiza corretamente).
- [ ] Titlebar mostra `org / repo` com slashes overlay.
- [ ] Sem regressão em outros lugares (rodar testes).

**Risco:**
- A mudança visual de `primary` (filled-accent branco → hairline accent-soft) é grande. Mitigação: tabela de migração acima foi gerada do grep antes do início. ReviewSubmitPanel é a única decisão aberta (default `subtle`, escalar se rever).
- Tabs: se `Tabs<T>` recebe ReactNode no label, manter compatibilidade pra que `Pra revisar (3)` funcione (o `(3)` ideal seria mono mas não vamos quebrar a API aqui).

---

## S4 · PR list rows: densidade + mono meta + sem author

**Objetivo:** PrListItem mais denso, meta em mono `15f · 14h`, sem author, active row = mantle bg + hairline accent embaixo. Group label vira `LABEL ─────────` com hairline rule.

**Depende de:** S1 (tokens), S3 (assumindo que Button link existe — não obrigatório aqui, mas group label estilo é S3-adjacent).

**Referências do handoff:** `README.md` seção 4 → "PR list row", "Group label"; `App Mock 1520x960.html` cena `lista` ou `diff` (rail expansível).

**Arquivos a tocar:**
- `src/components/prs/PrListItem.tsx` — reescrever grid: `14px 1fr auto`, gap 10px, padding `var(--density-row-pad-y) var(--space-7)`. CI dot 7×7 (não 8). Title: sans 12.5 / 400 (não medium), ellipsize, line-height 1.3. Meta direita: mono 10.5 / 400 `--c-subtext`, formato `{changed_files}f · {age}` (drop author). Sep `·` em `--c-overlay`. Active state: bg `--c-mantle` + border-bottom `1px solid var(--c-accent)`. Remover loading-via-Spinner em favor de opacity .75 + cursor progress (já existe parcialmente).
- `src/components/prs/PrListPanel.tsx` — group header redesign: container flex row, padding `14px 14px 4px`, label em mono 10 / 0.10em uppercase `--c-overlay`, seguido de `<div style={{flex: 1, height: 1, background: 'var(--c-line-soft)'}}/>`. Remover `textTransform`/`letterSpacing` antigos.
- `src/util/time.ts` — verificar se `formatAge` retorna algo tipo `14h`/`3d`/`2w`. Se retornar `há 14 horas`, criar nova função `formatAgeCompact` ou ajustar.

**Done quando:**
- [ ] Linha de PR sem author visível.
- [ ] Meta em mono no formato `15f · 14h`.
- [ ] PR ativo: bg mantle + hairline accent embaixo (sem chevron, sem left rule).
- [ ] Group label parece `SCOREHUB-API ─────────────────` com hairline.
- [ ] Hover continua funcionando (bg mantle, mas linha ativa fica em mantle permanentemente — pode precisar usar `--c-surface0` no ativo ou definir nova convenção: ativa NÃO usa hover background, usa border-bottom accent + bg mantle).
- [ ] Testes existentes (`PrListPanel.test.tsx` se houver) passam.

**Risco:**
- A regra do CSS atual `.prr-row[data-selected="true"]:hover { background: var(--c-surface0) }` em `globals.css` brigaria com a nova convenção mantle+accent-underline. Ajustar `.prr-row` no globals.css junto.

---

## S5 · Diff file header tipográfico + seen-dot

**Objetivo:** substituir o pill "Marcar como visto" por uma seen-dot 9×9; refazer o path em mono com slashes overlay; delta no canto direito em mono success/danger.

**Depende de:** S1 (cores), S3 (Button link pra "copiar caminho", "side-by-side").

**Referências do handoff:** `README.md` seção 4 → "Diff file header"; mock cena `diff`.

**Arquivos a tocar:**
- `src/components/diff/DiffPanel.tsx` — o cabeçalho atual fica em `lines ~488–521`. Refatorar:
  - Layout: flex row, padding `10px 24px`, mantle bg, border-bottom `1px solid var(--c-line)`.
  - Seen-dot à esquerda: 9×9 circle, 1.5px border `--c-overlay`, transparent fill. Quando visto: fill + border `--c-accent`. Click handler (já existe `setViewed`). Tooltip mono lowercase: `marcar como visto · v`.
  - Path: mono 11, slashes split em spans `--c-overlay`, leaf em span `font-weight: 500` `--c-text`. Helper inline pra ellipsizar meio (`src/main/.../leaf.java`) preservando o leaf.
  - Delta direita (margin-left auto): `<span class="add">+{add}</span> <span class="del">−{del}</span>`, mono 10.5, success/danger.
  - Right actions (depois do delta): text links mono 11 — `copiar caminho` e `side-by-side ↔ inline`. Hover subtext → text.
- `src/util/path.ts` (novo OU em-arquivo) — função `splitPath(path: string): { head: string[], leaf: string }` para renderização.

**Done quando:**
- [ ] Pill "Marcar como visto" sumiu.
- [ ] Seen-dot funciona: click toggla, fill aparece em accent quando visto.
- [ ] Path: `src` / `main` / `java` / `App.java` com slashes em overlay, App.java em weight 500.
- [ ] `+128 −77` à direita, success/danger.
- [ ] Atalho `V` ainda toggla viewed (não esquecer de validar com keyboard).
- [ ] Sem regressão no atalho de copiar path se já existir.

**Risco:**
- O `<button>` atual com aria-pressed precisa virar um `<button>` redondo accessibly. Manter `aria-pressed`, `title`, `aria-label`.
- Ellipsização no meio: começar simples (sem ellipsizar), e só implementar se path > 60 chars. Senão fica scope creep.

---

## S6 · Comment widget em 3 estados (open / draft / resolved)

**Objetivo:** redesenhar o widget de comentário inline (Monaco view zones) seguindo o spec do README: 2px left rule + state tag no ribbon comunicam estado. Sem badge, sem fill, sem button-shape. Actions como hairline text links.

**Depende de:** S1 (tokens accent/warn/overlay), S3 (Button variant `link` pra actions, se quiser usar primitive; OK ter `<a>` direto também).

**Referências do handoff:** `README.md` seção 4 → "Comment widget"; cena `diff` no mock; `Notes on a Workshop.html` seção 6.

**Arquivos a tocar:**
- `src/components/diff/inlineWidgetStyle.ts` — refatorar `inlineWidgetShell`:
  - bg `--c-surface1` (paper) / `--c-base` (linen) — usar `var(--c-surface1)` que via tokens já resolve por tema.
  - border `1px solid var(--c-line-soft)` em todos os lados EXCETO esquerda.
  - padding `10px 16px 12px`.
  - max-width: manter o sticky-left existente; capear em 540px em side-by-side, 680px em inline. Adicionar prop ou dois shells diferentes.
  - REMOVER border-radius (handoff implica retângulo limpo) ou deixar `--radius-sm`.
- `src/components/diff/InlineThreadWidget.tsx` — reestruturar:
  - Wrapper com `border-left: 2px solid var(--c-accent)` (estado open). Se thread.resolved → `--c-overlay`, opacity 0.7.
  - Ribbon: mono 11 `L{line} · {side === "RIGHT" ? "direita" : "esquerda"} · {lastAuthor} · {age}` + state tag à direita: mono 10 / 0.08em uppercase em accent (ABERTO) ou overlay (RESOLVIDO).
  - Comments: sans 12.5, line-height 1.55, color text. Author como prefixo em mono 11 subtext. SEM Avatar.
  - Actions: row de `<Button variant="link">` em mono 11 → `resolver  responder  salvar rascunho`. **Sempre `<button>`, NUNCA `<a>` sem href** (a11y + tab order). Hover: text + `border-bottom: 1px solid var(--c-line)`. "Resolver" usa `tone="accent"`; demais `tone="neutral"`.
- `src/components/diff/InlineDraftWidget.tsx` — wrapper com `border-left: 2px dashed var(--c-warn)`. Ribbon mono `L{line} · rascunho · {age}` + tag `RASCUNHO` em warn. Body sans italic subtext. Actions: `<Button variant="link">descartar</Button>  <Button variant="link" tone="accent">incluir no review</Button>`.
- `src/components/diff/InlineCommentEditor.tsx` — manter funcional (textarea + save/cancel), mas alinhar visualmente: 2px dashed warn left rule (é proto-rascunho), Textarea sans 12.5, actions como `<Button variant="link">`. Ação primária `salvar rascunho` com `tone="accent"`.

**Done quando:**
- [ ] Open thread: rule sólido accent à esquerda, ABERTO em accent.
- [ ] Draft: rule tracejado warn, RASCUNHO em warn, body italic.
- [ ] Resolved: rule sólido overlay, RESOLVIDO em overlay, opacity 0.7.
- [ ] Sem Avatar em nenhum widget.
- [ ] Actions são `<button class="link">` (semântica button, visual link). Tab order funciona; clicáveis via Enter/Space.
- [ ] Submit de reply (Ctrl+Enter) continua funcionando; resolver funciona.
- [ ] View zones não vazam altura (continuar usando o cálculo existente em DiffPanel — pode precisar ajustar `heightInLines` ligeiramente porque ribbon ocupa diferente).

**Risco:**
- O hook `useDiffViewZones` usa `heightInLines` para reservar espaço; se o widget novo for mais alto/baixo, vai dar overflow visual. Recalibrar a fórmula em DiffPanel `~lines 263–296`.
- Remover `Avatar` import — checar se `src/components/ui/Avatar.tsx` ainda é usado em outros lugares; se não, deixar pra delete em sessão de cleanup.
- `--c-surface1` em globals.css atual aponta pra cor diferente de Paper/Linen. Após S1, surface1 deve ser `#FFFFFF` (paper) / `#2A2A2F` (linen) — verificar.

---

## S7 · Settings modal tipográfico + 7 seções + Voz/Acento

**Objetivo:** aplicar tipografia (serif italic titles, mono uppercase labels, hairline segmented controls), adicionar **Voz** (creed picker) e **Acento** (4 swatches) em Aparência, adicionar campo `accent_color` + `creed` em Settings (TS + Rust).

**Depende de:** S1 (font-serif, accent system), S3 (Button link variant), S2 (StatusLine consome `creed`).

**Referências do handoff:** `README.md` seção 4 → "Settings modal", "Settings modal — full sections"; `App Mock 1520x960.html` cenas gear-opened.

**Arquivos a tocar:**
- `src-tauri/src/...` (procurar `struct Settings` / `struct UiPrefs` em `commands/` ou `state/`) — adicionar campos `accent_color: String` (default `"sage"`) e `creed: String` (default `"lendo. sem resumos."`). Migration: serde default-handlers pra settings.json existentes sem o campo não dão crash.
- `src/ipc/types.ts` — adicionar `accent_color: "sage" | "ochre" | "ink" | "rust"` e `creed: string` em `UiPrefs`.
- `src/components/settings/SettingsModal.tsx` — refazer shell:
  - Modal width 760px, max-height `calc(100% - 80px)`.
  - Header full-width: `Configurações` em serif italic 22 / 400.
  - Sidebar 200px, mantle bg, vertical nav. Item ativo: 2px accent left rule + `--c-base` bg.
  - Body padding `24px 32px`. Cada section abre com serif italic 18.
- `src/components/settings/AparenciaSection.tsx` — refazer com pattern "field":
  - **Tema** (light / dark / system) → segmented control hairline (não Button subtle/ghost).
  - **Acento** (4 swatches 28×28, border `--c-text` no ativo). Salva em `accent_color` e seta `document.body.dataset.accent`.
  - **Densidade** → segmented control.
  - **Caminhos compactos** → checkbox quadrado 14×14 com fill accent.
  - **Voz (creed)** → **dropdown** (`<select>` nativo estilizado com hairline border, mono 11.5, sem chevron customizado). 5 opções (handoff seção 8): `lendo. sem resumos.` (default), `código antes do colega.`, `sem atalhos não pedidos.`, `um diff por vez.`, `você é o revisor.`. **Não usar 5 radios** — stack vertical de italic-serif polui e estoura a regra de "máx 3 aparições de serif por sessão".
- `src/components/settings/ReposSection.tsx`, `FiltersSection.tsx`, `DiffSection.tsx`, `PaletteSection.tsx`, `ContaSection.tsx`, `AtalhosSection.tsx` — aplicar `<h3>` serif italic 18 + field pattern. Trocar Buttons primary por subtle/link. Não trocar lógica — só tipografia.
- `src/components/layout/StatusLine.tsx` — substituir creed hardcoded por `useSettingsStore(s => s.settings?.ui.creed ?? "lendo. sem resumos.")`.
- `src/App.tsx` — após settings load, setar `document.body.dataset.accent = settings.ui.accent_color`.

**Done quando:**
- [ ] Modal abre, sidebar com 7 itens, ativo com 2px accent left rule.
- [ ] Section titles em serif italic.
- [ ] Aparência tem 5 fields: Tema, Acento, Densidade, Caminhos compactos, Voz.
- [ ] Trocar acento muda `--c-accent` em todo app em tempo real.
- [ ] Trocar voz muda creed na StatusLine em tempo real.
- [ ] Persistência: fechar+abrir app mantém escolhas.
- [ ] Settings velhos (sem `accent_color`/`creed`) carregam com defaults sem crash.

**Risco:**
- **Maior risco da etapa.** Mexer no Rust Settings tem que ser feito com `#[serde(default = "default_creed")]` em cada campo novo, senão settings.json existente quebra parsing. Testar com settings.json antigo.
- A seção Atalhos é a mais densa visualmente. Se quebrar, validar especificamente porque é a única que tem tabela `.kbd-list` — pode precisar ajustar height/scroll do modal.
- Trocar Buttons em todas as seções de uma vez é arriscado; fazer section-por-section e rodar testes entre cada uma. SettingsModal tem `SettingsModal.test.tsx` — manter passando.

---

## S8 · Ctrl+K palette: creed footer + scope chip + glifo

**Objetivo:** afinar a paleta — adicionar creed italic serif no footer quando input vazio, glifo `⌕` em overlay, scope chip em accent.

**Depende de:** S1 (font-serif), S3 (text-link patterns), S7 (creed em settings, OU usar default hardcoded `"sem sugestões. apenas o que você buscar."` que é o creed específico da paleta — verificar README seção 4: é uma string fixa, NÃO o creed do StatusLine).

**Referências do handoff:** `README.md` seção 4 → "Ctrl+K command palette"; mock click no ⌘K do titlebar.

**Arquivos a tocar:**
- `src/components/layout/CommandPalette.tsx`:
  - Input row: adicionar `<span>⌕</span>` à esquerda (mono `--c-overlay`). Adicionar "esc" hint à direita em mono `--c-overlay`.
  - Scope chip: quando `scope` ativo, render em `--c-accent-soft` bg + accent border + accent text, mono 11. (Atual: surface0 bg + surface1 border subtext.)
  - Footer split em dois: esquerda continua com `↑↓ navegar · ↵ abrir · ⌘↵ abrir em background · esc fechar`; direita: quando `query === "" && !scope`, mostrar `<span>` serif italic `sem sugestões. apenas o que você buscar.` em `--c-subtext`. Desaparece quando o usuário digita.
  - Group header `Repositórios/Pull Requests/...` em mono 10 / 0.10em uppercase overlay (consistência com S4 group label) + hairline rule à direita opcional.
  - Active row: mantle bg + 2px accent left rule.
  - Matched text highlighted em `--c-accent` (já existe fuzzy; se highlight ainda não está renderizado, adicionar).

**Done quando:**
- [ ] Abrir paleta sem digitar mostra creed no footer direito.
- [ ] Digitar uma letra: creed some.
- [ ] Apagar tudo: creed reaparece.
- [ ] Scope chip aparece em accent ao entrar em um repo.
- [ ] Group headers em mono uppercase overlay.
- [ ] `CommandPalette.test.tsx` continua passando.

**Risco:**
- Footer tem 4 spans hoje; adicionar nova area direita pode quebrar layout. Usar `display: flex; justify-content: space-between` no footer outer, com `<div style={{display:flex; gap:20px}}>` na esquerda e o creed em `<span style={{marginLeft:'auto'}}>` — mas footer já tem `flexWrap: wrap`, então cuidado.

---

## S9 · Estados: empty / loading / error / first-run

**Objetivo:** alinhar empty/loading/error/first-run à voz "calma, mono, uma frase italic". Sem ícones-pill. Loading = 1px sweep + skeleton bars. Error = compiler-output. First-run = uma frase.

**Depende de:** S1 (cores + serif), S3 (EmptyState já refatorado pra serif italic).

**Referências do handoff:** `README.md` seções 4 (PR list state variants, First-run, No PR active placeholder) + 5 (Empty / loading / error states); mock cenas `vazio`, `loading`, `erro`, `sem repos`.

**Arquivos a tocar:**
- `src/components/ui/EmptyState.tsx` — finalizar shape:
  - Title serif italic 15.5 / 400 `--c-subtext` (sem prop `icon` aplicada, sem bg pill).
  - Sub-line opcional mono 11 / 0.04em uppercase `--c-overlay`.
  - Remover prop `compact` (todos centrados, mas left-aligned é variante usada pelo first-run — adicionar prop `align?: "center" | "left"`).
- `src/components/common/Toast.tsx` ou novo `src/components/ui/Sweep.tsx` — keyframe `@keyframes sweep { 0% { left: -30%; } 100% { left: 100%; } }` em CSS global. Componente `<Sweep />` renderiza um 1px bar absoluto no topo do parent (parent deve ser `position: relative`).
- `src/components/prs/PrListPanel.tsx` — substituir `<Spinner>` central por `<Sweep />` no topo + skeleton bars (mantle blocks) abaixo. Substituir 4 variantes de EmptyState (`renderEmpty`) pelos novos shapes do README; remover icons.
- `src/components/diff/DiffPanel.tsx` — substituir Spinner+texto "Carregando PR" por sweep+skeleton. Substituir EmptyState "Selecione um arquivo" por linha serif italic `Escolha um PR à esquerda.` + sub mono `nada está selecionado.` (com fallback "Selecione um arquivo na árvore" se PR carregado mas sem arquivo).
- `src/components/files/FileTreePanel.tsx` — substituir Spinner.
- `src/components/settings/PatSection.tsx` ou novo `src/components/onboarding/FirstRun.tsx` — refazer tela inicial sem PAT como first-run do handoff: max 480px left-aligned, eyebrow mono uppercase `primeira vez`, title serif italic 28 `Nenhum repositório, ainda.` (ou "Sem token, ainda." dependendo do gate), 2 parágrafos sans 13.5 subtext, 2 actions text links accent. Vinte palavras.
- Error state: criar `<ErrorBlock kind="..." />` em `src/components/ui/ErrorBlock.tsx` — render compiler-style. Usar em Banner quando 401.

**Done quando:**
- [ ] PR list vazia mostra `Nada na sua fila.` em serif + timestamp mono.
- [ ] PR list loading mostra 1px sweep accent no topo + skeleton bars (nada gira).
- [ ] Diff sem arquivo selecionado: linha serif italic, sem ícone.
- [ ] First-run (sem PAT): tela left-aligned, ≤20 palavras de prose, 2 links.
- [ ] Banner 401: formato `error: github.com responded 401 unauthorized.` mono, `→ reautenticar` em accent.
- [ ] Nada gira em lugar nenhum (search uses de Spinner: refresh icon na lista é OK porque é um botão).

**Risco:**
- Trocar PatSection pode quebrar o gate inicial. Manter a lógica de `setPat` intacta, só refazer visual.
- Spinner em refresh do PrListPanel header: handoff não fala de refresh especificamente. Trocar pra Sweep no botão fica estranho. Manter Spinner ali só (refresh ativo é um estado de ação, não loading geral) — anotar como exceção.

---

## S10 · PR list collapse-rail 28px com CI dots verticais

**Objetivo:** quando PR aberto, PR list colapsa pra rail de 28px com chevron expand + stack vertical de CI dots + counter. Click no rail expande a lista (file tree encolhe).

**Depende de:** S4 (PrListItem já no novo formato pra quando expandir).

**Referências do handoff:** `README.md` seção 3 → "Layout — three panes, with collapse on PR open"; mock cena `diff` (rail visível à esquerda).

**Arquivos a tocar:**
- `src/components/layout/PrListRail.tsx` (novo):
  - 28px wide, full-height, mantle bg, border-right `1px solid var(--c-line)`.
  - Top: chevron-right icon button (expand) 28×28.
  - Hairline separator.
  - Stack vertical de dots 6×6 nas cores CI (success/warn/danger/overlay), uma por PR na fila atual (top 12 ou todos com scroll). Click no dot abre o PR direto.
  - Bottom: counter mono `{n}` em overlay.
- `src/components/layout/Layout.tsx` — refazer:
  - Trocar `react-resizable-panels` por CSS grid simples: `grid-template-columns: var(--col-1) var(--col-2) var(--col-3); transition: grid-template-columns 220ms ease;` (manter resize ainda? handoff não diz — manter por enquanto, mas grid simples é mais alinhado).
  - Estados:
    - Sem PR: PR list 280px, diff 1fr (sem file tree).
    - PR aberto + lista expandida: PR list 280px, file tree 280px, diff 1fr.
    - PR aberto + lista colapsada (default ao abrir): PR rail 28px, file tree 360px, diff 1fr.
  - Substituir o overlay-button atual (linhas 89–111) pelo `<PrListRail />` propriamente dito.
  - Ao abrir PR (mudança de `currentPr`), setar `prListCollapsed = true` automaticamente.
  - Ao expandir rail, encolher file tree para 280px.
- `src/state/uiStore.ts` — verificar `prListCollapsed` / `fileTreeCollapsed` semantics; talvez não precise mudar.

**Done quando:**
- [ ] Abrir um PR colapsa PR list pra 28px e mostra rail com dots CI.
- [ ] Click no chevron do rail expande PR list (file tree encolhe).
- [ ] Click num dot do rail abre aquele PR.
- [ ] Counter no rodapé do rail mostra `{n}` correto.
- [ ] Transição é uma única 220ms ease, sem bounce.
- [ ] Voltar pra lista (chevron back do titlebar) volta ao estado expandido.

**Risco:**
- **Risco alto:** trocar `react-resizable-panels` por CSS grid quebra resize manual via mouse drag. Decisão: manter `react-resizable-panels` por sessão e só mudar para grid se a transição animada não funcionar. Validar antes de partir pra rewrite.
- O state em `useUiStore` (`prListCollapsed`) está acoplado ao Panel ref-based collapse — controlar via CSS grid muda o modelo. Talvez melhor: manter Panels, mas adicionar `transition` no wrapper e renderizar `<PrListRail />` em vez do panel quando colapsado.
- Tabs (`Pra revisar / Meus`) e Search desaparecem na rail — verificar que muscle-memory `Ctrl+P` (focus search) ainda funciona quando expande de novo.

---

## Riscos transversais

- **Rust Settings migration (S7):** qualquer campo novo deve ter `#[serde(default = "...")]` para não quebrar `settings.json` antigos.
- **Catppuccin → Paper/Linen rename (S1):** muitos arquivos referenciam `--c-green` / `--c-red` / `--c-amber` / `--c-blue` diretamente. Decidir entre rename total ou alias temporário.
- **Source Serif 4 offline:** Tauri app idealmente não depende de Google Fonts em runtime. Se for problema, hospedar woff2 local em `src/assets/fonts/`.
- **Tauri capabilities:** se alguma sessão adicionar drag novo ou listen evento novo (não previsto), atualizar `src-tauri/capabilities/default.json` por `core:event:allow-*`.
- **Testes:** cada sessão deve atualizar os snapshots/mocks afetados (especialmente `CommandPalette.test.tsx`, `FileTreePanel.test.tsx`, `SettingsModal.test.tsx`).

---

## Validação final (depois de todas as 10 sessões)

- [ ] `pnpm tsc --noEmit && pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` — verde.
- [ ] `NO_STRIP=true pnpm tauri build --bundles rpm` — build completo do app (NÃO só `vite build`).
- [ ] Abrir mock `App Mock 1520x960.html` lado a lado com o app a 1520×960 — paridade visual nas 6 cenas (diff, lista, vazio, loading, erro, sem repos).
- [ ] Trocar entre 2 temas × 4 acentos sem regressão visual.
- [ ] Trocar entre 3 densidades.
- [ ] Trocar entre os 5 creeds.
- [ ] Smoke completo no app: abrir PR, navegar arquivos, marcar visto, criar draft, resolver thread, submeter review.
- [ ] Instalar rpm via `sudo dnf install`. Abrir do menu do sistema.
