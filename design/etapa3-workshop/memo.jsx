/* The long-form design memo. Each section is hand-written; artifacts come
   from artifacts.jsx. */

function Section({ n, label, title, children }) {
  return (
    <section className="section">
      <div className="num">
        {n}
        <small>{label}</small>
      </div>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Pushback({ children, label = "where to resist" }) {
  return (
    <div className="pushback">
      <strong>{label}</strong>
      {children}
    </div>
  );
}

// Inline swatch picker for accent — the TweakColor primitive only takes hex
// strings, but our accents are theme-aware named tokens. Roll our own.
function AccentSwatches({ value, theme, onChange }) {
  const map = {
    sage:  theme === 'light' ? '#5E7556' : '#8FA888',
    ochre: theme === 'light' ? '#8E6A2C' : '#C9A35A',
    ink:   theme === 'light' ? '#3B5570' : '#7AA5C9',
    rust:  theme === 'light' ? '#8B4A38' : '#C78866',
  };
  return (
    <div style={{display: 'flex', gap: 6, padding: '6px 0'}}>
      {Object.entries(map).map(([k, hex]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          title={k}
          style={{
            flex: 1,
            height: 30,
            background: hex,
            border: '1.5px solid ' + (value === k ? 'var(--c-text)' : 'transparent'),
            outline: '1px solid rgba(0,0,0,0.08)',
            outlineOffset: -1,
            cursor: 'pointer',
            borderRadius: 2,
            position: 'relative',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'transparent',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Memo() {
  const defaults = {
    theme: document.documentElement.dataset.theme || 'dark',
    accent: document.documentElement.dataset.accent || 'sage',
    density: document.documentElement.dataset.density || 'comfortable',
    creed: 'lendo. sem resumos.',
  };
  const [tweaks, setTweak] = useTweaks(defaults);

  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.accent = tweaks.accent;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks]);

  return (
    <React.Fragment>
      <div className="memo">

        {/* ───── Masthead ───── */}
        <header className="masthead">
          <div>
            <div className="eyebrow">design memo · 23 mai 2026</div>
            <h1>Notes on a <em>workshop</em>.</h1>
            <p className="lede">
              Direction for the PR reviewer. The goal isn't to redesign — it's to commit. The current build is competent; what it lacks is a position. Below: eight choices that, taken together, would let this app look like itself across a desk full of dev tools.
            </p>
          </div>
          <div className="colophon">
{`for       christian
re        etapa 3 · identity
fidelity  high · opinionated
length    long-form`}
          </div>
        </header>

        {/* ───── 1 · Identity ───── */}
        <Section n="1" label="identity" title={<>The single move. <em>Three candidates, one pick.</em></>}>
          <p className="lede">
            Right now nothing in the chrome says <em>this</em> app made <em>this</em> choice. The PR title, the titlebar, the panels — they're handsome and forgettable. To stop being anonymous you need one move you can defend in a screenshot. Here are three; I'd ship the third.
          </p>

          <div className="directions">
            <div>
              <div className="tag">a · marginalia</div>
              <h3>A colored thread along the left edge.</h3>
              <p>A 2px rule down the entire titlebar that takes the active PR's CI color: green, amber, red, idle. Status as a permanent fact, not a chip you have to find. Always visible from across the room.</p>
              <div className="verdict">good but quiet — you'd want more</div>
            </div>
            <div>
              <div className="tag">b · ledger</div>
              <h3>Mono for every number; sans for prose.</h3>
              <p>Adopt a strict split: PR numbers, file counts, line deltas, timestamps, hashes, lengths — all JetBrains Mono. Sans only for the things humans wrote. It reads like a typesetting decision in a journal, not a UI accident.</p>
              <div className="verdict">small change, big personality</div>
            </div>
            <div>
              <div className="tag">c · status line</div>
              <h3>A vim-coded footer that never lies.</h3>
              <p>Persistent 24px footer with branch, last-fetch, CI time, dwell time on the current file, and a one-line creed in italic serif at the right. Real information. It is the app's signature.</p>
              <div className="verdict pick">ship this. compose with (b).</div>
            </div>
          </div>

          <p style={{marginTop: 20}}>
            The status line is the one to commit to. It's a craftsman's affordance — vim, tmux, Sublime — that signals "this tool respects you enough not to gamify your attention." Combine it with the typographic ledger (b) and you have a recognizable app. (a) is good but invisible after a day; (c) is good <em>especially</em> after a day.
          </p>

          <StatusLine creed="lendo. sem resumos." />

          <p className="dim" style={{fontSize: 'var(--text-sm)', marginTop: 12}}>
            Above, in context. The creed lives on the right in italic serif — the one place a serif appears in the entire app. The rest is mono. The dot is the only color. Branch and CI time are facts the developer would otherwise have to <span className="kbd">Ctrl+K</span> to find.
          </p>

          <Pushback>
            If somebody asks to turn the creed into "Esparta Tech" or a tagline that's actually marketing copy, refuse. The creed is positioning, not branding. It works because it sounds like it's talking to the developer, not at them. If it ever feels cute, it's broken.
          </Pushback>
        </Section>

        {/* ───── 2 · Palette ───── */}
        <Section n="2" label="palette" title={<>Drop Catppuccin. <em>It's too sweet for what you're saying.</em></>}>
          <p className="lede">
            Catppuccin is a beautiful palette built for personal dotfile flexing. The mauves and pinks are wonderful in a terminal that <em>is</em> personality. They fight you when the product's pitch is restraint. Propose: <b>Paper</b> (light) and <b>Linen</b> (dark) — warm neutrals tuned to feel like aged paper and dark linen, with one true accent and four CI semantics.
          </p>

          <PaletteBoard />

          <p>
            Why this serves the brief, concretely:
          </p>
          <ul>
            <li>Light mode is <em>warm</em>, not white. <code style={{fontFamily:'var(--font-mono)', fontSize: 12}}>#F4F1EA</code> beats <code style={{fontFamily:'var(--font-mono)', fontSize: 12}}>#FFFFFF</code> for long sessions and looks intentional next to the diff colors.</li>
            <li>Dark mode is a true neutral (<code style={{fontFamily:'var(--font-mono)', fontSize: 12}}>#16161A</code>), not blue-black. A blue-black dark theme is the SaaS default; you don't want to look like a SaaS.</li>
            <li>One accent, period. Sage by default; ochre, ink, or rust if the user wants to commit. No "primary blue + secondary purple" nonsense.</li>
            <li>CI colors aren't candy. <code style={{fontFamily:'var(--font-mono)', fontSize: 12}}>#7CA664</code> is a moss-green, not a hex-greenscreen. The amber and rust are restrained. They read at a glance without buzzing.</li>
          </ul>

          <p>
            Try it live — accent swatches are in the Tweaks panel. Sage is the recommendation; ochre is the version that leans more "library carrel"; ink is the most conservative; rust is for the user who reads on a dark theme and wants warmth.
          </p>

          <Pushback>
            If the user asks for a brand-blue or a brand-purple, push back. A bright accent on a flat surface is a casino tell. Restrict the accent to a single visual job: <em>focus and active state</em>. Don't paint buttons with it. Don't paint headers with it.
          </Pushback>
        </Section>

        {/* ───── 3 · Density ───── */}
        <Section n="3" label="density" title={<>The list is sparse. The tree is fine. The diff is right. <em>Re-balance.</em></>}>
          <p className="lede">
            Looking at the screenshots: the PR list <em>feels</em> sparse not because it has too much room, but because it has too little content per row. Each row is a dot and a title and two tiny metadata fragments floating in a lot of vertical air. The fix isn't more padding — it's more <em>density of information</em>.
          </p>

          <p>
            Concrete: keep the row height roughly the same in Confortável, but pack more in. Add a stronger group label (uppercase mono, hairline rule after the text), put line-count and file-count on the right in mono — those are the numbers a reviewer actually scans for. Drop the "loud" purple repo-group typography in favor of overlay-color, narrow rule.
          </p>

          <PRListMock density={tweaks.density} />

          <p>
            That's the proposed list. Three things changed:
          </p>
          <ul>
            <li><b>Group label sits on a hairline rule</b> instead of being a big block. The visual weight is now in the rule, not the text — your eye reads the rule as section, the text is just the label.</li>
            <li><b>Right-aligned mono meta</b> (<code style={{fontFamily:'var(--font-mono)', fontSize:12}}>15f · 14h</code>) is scannable: <em>how big</em> and <em>how old</em>. The author name was eaten — it's redundant once you know who you are.</li>
            <li><b>Active row uses background lift only</b>, no left-rule chevron. Cleaner. The mantle color is the affordance.</li>
          </ul>

          <p>The file tree should stay roughly where it is, with one addition: hairline vertical guides at each indent level. Right now nested folders dissolve into the surface; a 1px line at <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>--c-line-soft</code> would solve it without adding chrome.</p>

          <p>The diff pane is the right density. Monaco's defaults are good for code; don't fight them.</p>

          <Pushback label="where to push back">
            If reviewers complain the list is "too dense" after this change, the right answer is the Tweaks density toggle. <em>Don't</em> add per-row icons or avatars. Avatars are the GitHub web tax — they're noise on a screen you'll see 200 times today.
          </Pushback>
        </Section>

        {/* ───── 4 · Color usage ───── */}
        <Section n="4" label="color" title={<>Color is grammar, not decoration. <em>Five places. Period.</em></>}>
          <p className="lede">
            The rule should be: a surface gets color only if the color carries meaning the reader could otherwise miss. Decorative color in a workshop tool is a "look at me" gesture and kills the brief. Here are the only five places color should appear:
          </p>

          <ul>
            <li><b>CI status dots.</b> Green / amber / red / overlay. You already do this. Keep it.</li>
            <li><b>Comment thread state.</b> Open threads get a 2px accent rule on the left edge of the widget. Resolved threads lose the rule and drop to <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>overlay</code> tint; the body text dims. Draft threads use a dashed rule in <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>warn</code>. The state is the rule; you never need a colored badge.</li>
            <li><b>Diff hunks.</b> Subtle tinted background plus a 2px left rule in <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>success</code>/<code style={{fontFamily:'var(--font-mono)', fontSize:12}}>danger</code>. The rule is what carries the meaning; the background is just enough to scan blocks.</li>
            <li><b>Viewed files in the tree.</b> Unviewed = <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>text</code>. Viewed = <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>subtext</code> with a faint accent dot to the right of the filename. No checkbox, no pill. Just a quieter version of the same row.</li>
            <li><b>Focus / active.</b> Accent only. One color. The focused input gets a 1px accent border; the active PR row gets the accent in its bottom hairline (not the whole row tinted).</li>
          </ul>

          <p>
            What you do <em>not</em> color: buttons (use chrome neutrals + accent only on the action-of-record in a row), tabs (underline only, no fill), section headers (overlay color, no fill), titlebar pieces (no), the breadcrumb (no), the file tree row backgrounds (no — only the icon-to-the-right marker shifts).
          </p>

          <div className="callout">
            A diff is mostly black-and-white text on tinted bands. If your eye is pulled by anything else on the screen, that thing is wrong. The chrome's job is to disappear when you're reading.
          </div>

          <Pushback>
            Someone will eventually want "draft" to be its own bright orange chip on every row of the file tree. Resist. The dashed rule in the comment widget is doing the work; an additional badge is double-counting and trains the user to ignore both.
          </Pushback>
        </Section>

        {/* ───── 5 · Typography ───── */}
        <Section n="5" label="type" title={<>Decide what's mono, what's sans, what's italic — and stop. <em>Three jobs total.</em></>}>
          <p className="lede">
            The relationships in the screenshots aren't wrong, they're undecided. Almost everything is one sans at one size. Commit to a system where every visible string belongs to one of three categories — <b>prose</b> (sans), <b>fact</b> (mono), and <b>voice</b> (italic serif, used sparingly) — and the hierarchy emerges for free.
          </p>

          <TypeSpecimen />

          <p>The principle behind the numbers above:</p>
          <ul>
            <li><b>Mono is for things the developer typed or the system counted.</b> Filenames, IDs, line numbers, timestamps, line deltas, branch names, commit hashes, group labels. If you can copy-paste it, it's mono.</li>
            <li><b>Sans is for prose.</b> Comment bodies, PR titles, button labels, modal text. The PR title is the only sans element bold enough to read across the room (13px / 500), which gives it its rightful priority.</li>
            <li><b>Italic serif is the app's voice.</b> Used only for: section numbers in Settings, the status-line creed, empty-state lines ("Nada na sua fila."), and modal titles in Settings. Three appearances per session, max. That's what makes it land.</li>
          </ul>

          <p>
            On the Settings modal you sent: the section titles ("Aparência", "Configurações") should be italic serif at <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>22 / 400</code>. The form labels stay mono uppercase. The segmented controls (<b>system / light / dark</b>) become quiet hairline borders, not pill buttons — pill buttons are SaaS, hairline is workshop.
          </p>

          <Pushback>
            If anyone proposes adding a third sans weight (300, 700) for "hierarchy", say no. You need 400 and 500 and that's it. Hierarchy comes from family + color + size, not from weight gymnastics.
          </Pushback>
        </Section>

        {/* ───── 6 · The diff ───── */}
        <Section n="6" label="diff" title={<>This is the room. <em>Furnish it like one.</em></>}>
          <p className="lede">
            Ninety percent of the user's day is here. Monaco is a competent tenant — don't fight it — but the file header and the comment widget are <em>yours</em> and they're where the app's personality has to live. Below: the proposal in full.
          </p>

          <DiffMock />

          <p>What changed from the screenshots:</p>
          <ul>
            <li><b>"Marcar como visto" is now a dot, not a button.</b> 9px circle on the far left of the file header — empty = unviewed, filled accent = viewed. Click to toggle. One affordance, no copy. The button is fighting for attention against the path; the dot disappears until you need it.</li>
            <li><b>The path becomes typographic, not chrome.</b> Slashes drop to <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>overlay</code>; the filename gets weight 500. Reads like a citation, not a breadcrumb. Long paths can ellipsize the middle segments without losing the leaf.</li>
            <li><b>Line deltas sit at the right edge in mono.</b> <code style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--c-success)'}}>+10</code> <code style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--c-danger)'}}>−9</code>. Plain. Already mono-coded.</li>
            <li><b>Diff hunks have a 2px left rule</b> in the success/danger tint. The tinted background is dialed back to ~10% so the rule does the work. On a long file at 4am this matters.</li>
          </ul>

          <p>The comment widget is the centerpiece. Three states, one form:</p>
          <ul>
            <li><b>Open thread</b> — solid accent left rule. Ribbon: <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>L47 · christiansmmc · 9m</code> with <code style={{fontFamily:'var(--font-mono)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em'}}>aberto</code> in accent at the right. Body in sans. Actions as hairline text links, not buttons (resolver / responder / salvar rascunho).</li>
            <li><b>Resolved</b> — same shape, rule drops to overlay, the whole widget reduces opacity to ~70%. State tag reads "resolvido". You see they exist; you don't read them.</li>
            <li><b>Draft</b> — dashed left rule in warn. Body is italic + subtext. State tag "draft" in warn. Action row: "descartar" / "incluir no review". The dashed rule is the entire affordance — no other chrome required.</li>
          </ul>

          <p>
            One detail worth defending: the actions are text links, not buttons. Buttons in a comment widget that's already living inside Monaco's view zones are noisy and inconsistent (Monaco draws its own scroll). Hairline text links are calmer and survive any width.
          </p>

          <Pushback>
            Two things people will ask for that you should refuse:
            <ul style={{marginTop: 8}}>
              <li>An emoji reaction row. No. Reactions are GitHub-web theater; this app is for people who write paragraphs.</li>
              <li>A "Resolve with AI" or "Suggest fix" action. <em>Absolute</em> no. One feature like this and the entire positioning is gone, you'd have to rebrand.</li>
            </ul>
          </Pushback>
        </Section>

        {/* ───── 7 · States ───── */}
        <Section n="7" label="states" title={<>States that don't get design love. <em>Now they do.</em></>}>
          <p className="lede">
            Empty / loading / error / first-run states are where most apps reveal that nobody cared. Treating them as first-class is itself the brief — a workshop has a quiet voice when the bench is empty, too.
          </p>

          <div className="states">
            <EmptyState />
            <LoadingState />
            <ErrorState />
            <OnboardState />
          </div>

          <p>Four small principles, one per card:</p>
          <ul>
            <li><b>Empty = italic serif, one line.</b> "Nada na sua fila." No icon. No illustration. No CTA. Below it, in tiny mono, a real fact: when you were last clean. The line tells the user it's <em>intentionally</em> empty, the timestamp proves the app is alive.</li>
            <li><b>Loading = a 1px progress sweep + skeleton bars.</b> No spinner. Spinners are placeholders for thought; the 1px sweep is a marquee status. The skeleton fills the same shape the content will fill — no layout jump on arrival.</li>
            <li><b>Error = a compiler message, formatted exactly like one.</b> Mono, lowercase `error:` in danger, indentation for the cause, indented `→` for the action. Reads like <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>cargo</code> output. Resist the urge to put a sad-face SVG anywhere near it.</li>
            <li><b>First-run = a sentence, not a tour.</b> One italic serif line ("Nenhum repositório, ainda.") + one paragraph in subtext + one mono action link. Twenty words total. No onboarding modal, no checkmarks-to-complete, no progress bar of setup steps.</li>
          </ul>

          <Pushback>
            Loading states are the easiest place for AI-slop to creep in ("Did you know? Claude can summarize this PR…"). The answer is: nothing happens in a loading state except loading. Empty space is not a marketing opportunity.
          </Pushback>
        </Section>

        {/* ───── 8 · Anti-AI detail ───── */}
        <Section n="8" label="anti-ai" title={<>The detail that does the work. <em>Pick the creed.</em></>}>
          <p className="lede">
            You asked for one small thing. Here it is: <b>the status line creed</b>. A single italic serif phrase that sits at the right end of the persistent footer, visible every minute the app is open. It is the only piece of "voice" in the entire UI. It is what the app is, said in five words.
          </p>

          <p>Five candidates I've tried out loud. The first is my recommendation; the rest are alternates the user might prefer:</p>

          <div style={{display:'grid', gap: 1, background:'var(--c-line)', border:'1px solid var(--c-line)', margin:'20px 0'}}>
            {[
              ["lendo. sem resumos.",            "the recommendation. quietly anti-LLM. reads like a vow."],
              ["código antes do colega.",         "older-school. 'read the code, not your teammate's interpretation.'"],
              ["sem atalhos não pedidos.",        "specifically rejects autocomplete-as-feature."],
              ["um diff por vez.",                "almost meditative. closest to the 'craftsman' note."],
              ["você é o revisor.",               "the bluntest. probably too earnest."],
            ].map(([phrase, gloss], i) => (
              <div key={i} style={{background:'var(--c-base)', padding:'14px 18px', display:'grid', gridTemplateColumns:'minmax(220px, 1fr) 2fr', gap: 24, alignItems:'baseline'}}>
                <span style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 'var(--text-md)'}}>{phrase}</span>
                <span style={{fontSize: 'var(--text-sm)', color:'var(--c-subtext)'}}>{gloss}</span>
              </div>
            ))}
          </div>

          <p>
            Click each below to preview the creed live in the footer (the status line at the bottom of this doc updates too):
          </p>

          <div style={{display:'flex', flexWrap:'wrap', gap: 8, margin:'12px 0 20px'}}>
            {[
              "lendo. sem resumos.",
              "código antes do colega.",
              "sem atalhos não pedidos.",
              "um diff por vez.",
              "você é o revisor.",
            ].map(p => (
              <button
                key={p}
                onClick={() => setTweak('creed', p)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  background: tweaks.creed === p ? 'var(--c-accent-soft)' : 'var(--c-mantle)',
                  color: tweaks.creed === p ? 'var(--c-accent)' : 'var(--c-subtext)',
                  border: '1px solid ' + (tweaks.creed === p ? 'var(--c-accent)' : 'var(--c-line)'),
                  padding: '6px 12px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <p>
            Beyond the creed, three smaller anti-AI gestures worth shipping in the same PR:
          </p>
          <ul>
            <li><b>The Ctrl+K palette has a one-line footer in italic serif:</b> <em>"sem sugestões. apenas o que você buscar."</em> — visible only when the input is empty. Disappears the moment you type. Sets the contract.</li>
            <li><b>"Marcar como visto" logs to the status line.</b> When you click the seen-dot, the status line briefly reads <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>visto · Impl.java · 47 linhas · 2m41s</code>. Reading time is a fact about you, the reviewer, not the AI. The app respects it back to you.</li>
            <li><b>Default keyboard for resolving a thread is <span className="kbd">Ctrl+Enter</span>, not a button.</b> Tooltips on hover use mono lowercase: <code style={{fontFamily:'var(--font-mono)', fontSize:12}}>resolver · ⌃↵</code>. Lowercase mono everywhere a tooltip appears. It is what an experienced tool feels like.</li>
          </ul>

          <Pushback>
            People will, eventually, ship a "Diff Insights" panel or a "PR Health Score" or some such. Don't. The status line is the entire metric panel this app needs.
          </Pushback>
        </Section>

        {/* ───── Closing ───── */}
        <div className="closing">
          <h2>Where to resist user pushback.</h2>
          <p className="dim" style={{maxWidth:'62ch', fontSize:'var(--text-sm)'}}>
            A compressed version of the no's above, in one place, for the day a stakeholder asks. The positioning falls over if any of these get a yes.
          </p>

          <ul className="resist-list">
            {[
              ['no ai',         "“Add a button to summarize this PR with Claude.”",        "summary is the reviewer's job; outsourcing it is the brief, inverted."],
              ['no candy',      "“The accent should be a brand purple.”",                  "an accent on a flat surface is a casino tell. workshop tools don't gamble."],
              ['no chips',      "“Add a draft/open/resolved colored chip on every comment.”", "the rule on the left edge is doing the work. chips double-count and noise the diff."],
              ['no reactions',  "“Add emoji reactions like github.”",                       "this app is for people who write paragraphs, not for people who scroll."],
              ['no tours',      "“Add an onboarding tour for new users.”",                  "the first-run state is a sentence. anyone shipping production code can find a settings panel."],
              ['no avatars',    "“Show committer avatars in the pr list.”",                  "you already know who you are. avatars are the github-web tax."],
              ['no insights',   "“A panel with pr health metrics.”",                         "the status line is the dashboard. anything else is a place to ignore numbers in."],
              ['no spinners',   "“The loading spinner spins.”",                              "spinners are placeholders for thought. the 1px sweep is information."],
            ].map(([tag, ask, why], i) => (
              <li key={i}>
                <span className="tag">{tag}</span>
                <span className="ask">{ask}</span>
                <span className="why">{why}</span>
              </li>
            ))}
          </ul>

          <div style={{marginTop: 56, color:'var(--c-subtext)', fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:'var(--text-md)', maxWidth:'60ch'}}>
            One last thing — and I'd close on it. The reason this product exists is that someone, somewhere, is going to keep reading code carefully. The design's only job is to make that person feel like the tool was made by another one of them.
          </div>
          <div style={{marginTop: 24, color:'var(--c-overlay)', fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)'}}>
            — fim do memo.
          </div>
        </div>
      </div>

      {/* Persistent footer with status line as a live preview */}
      <div style={{position:'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, borderTop:'1px solid var(--c-line)'}}>
        <StatusLine creed={tweaks.creed || 'lendo. sem resumos.'} />
      </div>

      {/* ───── Tweaks panel ───── */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            label="mode"
            value={tweaks.theme}
            options={[
              {value: 'light', label: 'paper'},
              {value: 'dark', label: 'linen'},
            ]}
            onChange={(v) => setTweak('theme', v)}
          />
        </TweakSection>
        <TweakSection title="Accent">
          <AccentSwatches value={tweaks.accent} theme={tweaks.theme} onChange={(v) => setTweak('accent', v)} />
        </TweakSection>
        <TweakSection title="PR list density">
          <TweakRadio
            label="rows"
            value={tweaks.density}
            options={[
              {value: 'compact', label: 'compact'},
              {value: 'comfortable', label: 'comfort'},
              {value: 'spacious', label: 'spacious'},
            ]}
            onChange={(v) => setTweak('density', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

window.Memo = Memo;
