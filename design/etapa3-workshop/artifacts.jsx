/* Visual artifacts referenced by the memo. Each is a small self-contained
   React component so the prose-side stays clean. */

// ---- Status line: the anti-AI footer ----
function StatusLine({ creed = "lendo. sem resumos." }) {
  return (
    <div className="statusline">
      <span className="sl-segment"><span className="dot"></span><b>esparta-tech/scorehub-signature-unico</b></span>
      <span className="sl-segment">PR <b>#231</b></span>
      <span className="sl-segment">15 arq <b>·</b> +1896 −264</span>
      <span className="sl-segment">CI <b>passou</b> em 2m41s</span>
      <span className="sl-segment">visto há <b>2m23s</b></span>
      <span className="sl-creed">{creed}</span>
    </div>
  );
}

// ---- PR list density mockup ----
function PRListMock({ density = "comfortable" }) {
  return (
    <div className="app-frame" style={{maxWidth: 420}}>
      <div className="frame-cap">
        <span>pull requests · pra revisar</span>
        <span>{density}</span>
      </div>
      <div className="prlist">
        <div className="group">scorehub-signature-unico</div>
        <div className="row active">
          <span className="ci"></span>
          <span className="title">fix(unico): convert SignatureUnico naked saves to CAS-JPQL writers</span>
          <span className="meta"><span>15f</span><span>14h</span></span>
        </div>
        <div className="group">scorehub-signature</div>
        <div className="row">
          <span className="ci"></span>
          <span className="title">merge develop → main</span>
          <span className="meta"><span>33f</span><span>3h</span></span>
        </div>
        <div className="row">
          <span className="ci warn"></span>
          <span className="title">refactor: extract retry policy into RetryStrategy</span>
          <span className="meta"><span>8f</span><span>1d</span></span>
        </div>
        <div className="group">scorehub-events-document-generator-go</div>
        <div className="row">
          <span className="ci"></span>
          <span className="title">chore: merge develop into main</span>
          <span className="meta"><span>29f</span><span>3h</span></span>
        </div>
        <div className="row">
          <span className="ci idle"></span>
          <span className="title">fix: document and prepare Chromium concurrent rendering</span>
          <span className="meta"><span>2f</span><span>3w</span></span>
        </div>
        <div className="row">
          <span className="ci fail"></span>
          <span className="title">feat: signed-receipt service for audit trail</span>
          <span className="meta"><span>11f</span><span>5d</span></span>
        </div>
      </div>
    </div>
  );
}

// ---- Diff + comment widget mockup (the big one) ----
function DiffMock() {
  return (
    <div className="app-frame">
      <div className="frame-cap">
        <span>diff · SignatureRetryCancelProcessBusinessImpl.java</span>
        <span>monaco view-zone host</span>
      </div>
      <div className="diff-mock">
        <div className="file-head">
          <span className="seen" title="marcar como visto"></span>
          <span className="path">
            <span>src</span><span className="slash">/</span>
            <span>main</span><span className="slash">/</span>
            <span>java</span><span className="slash">/</span>
            <span>br</span><span className="slash">/</span>
            <span>com</span><span className="slash">/</span>
            <span>scorehub</span><span className="slash">/</span>
            <span>…</span><span className="slash">/</span>
            <span>businessservice</span><span className="slash">/</span>
            <span>unico</span><span className="slash">/</span>
            <span className="leaf">SignatureRetryCancelProcessBusinessImpl.java</span>
          </span>
          <span className="delta">
            <span className="add">+10</span>
            <span className="del">−9</span>
          </span>
        </div>

        <div className="line"><span className="gut left">42</span><span className="gut right">42</span><code>    <span className="tk-key">if</span> (shouldRetry) {'{'}</code></div>
        <div className="line del"><span className="gut left">47</span><span className="gut right"> </span><code>        signatureUnico.<span className="tk-fn">setBiometricStatus</span>(<span className="tk-type">SignatureBiometricStatusEnum</span>.FRAUD);</code></div>
        <div className="line del"><span className="gut left">48</span><span className="gut right"> </span><code>        signatureUnico.<span className="tk-fn">setActive</span>(<span className="tk-key">false</span>);</code></div>
        <div className="line del"><span className="gut left">49</span><span className="gut right"> </span><code>        signatureUnicoService.<span className="tk-fn">save</span>(signatureUnico);</code></div>
        <div className="line add"><span className="gut left"> </span><span className="gut right">46</span><code>        <span className="tk-key">if</span> (!signatureUnicoService.<span className="tk-fn">tryMarkRetryFraudAndDeactivate</span>(signatureUnico.<span className="tk-fn">getId</span>())) {'{'}</code></div>

        {/* Resolved thread */}
        <div className="cmt resolved">
          <div className="ribbon">
            <b>L46</b><span className="sep">·</span>
            <span>christiansmmc</span><span className="sep">·</span>
            <span>14h</span>
            <span className="state">resolvido</span>
          </div>
          <div className="body">
            Já discutimos isso na #228 — o método novo segue a convenção <code>tryX</code> do projeto. Mantemos.
          </div>
        </div>

        <div className="line add"><span className="gut left"> </span><span className="gut right">47</span><code>            log.<span className="tk-fn">warn</span>(<span className="tk-str">"Skipping retry process — concurrent thread already marked FRAUD: {'{}'}"</span>,</code></div>
        <div className="line add"><span className="gut left"> </span><span className="gut right">48</span><code>                signatureUnico.<span className="tk-fn">getId</span>());</code></div>
        <div className="line add"><span className="gut left"> </span><span className="gut right">49</span><code>            <span className="tk-key">return</span>;</code></div>
        <div className="line"><span className="gut left">50</span><span className="gut right">50</span><code>        {'}'}</code></div>

        {/* Active thread */}
        <div className="cmt">
          <div className="ribbon">
            <b>L47</b><span className="sep">·</span>
            <span>christiansmmc</span><span className="sep">·</span>
            <span>9m</span>
            <span className="state">aberto</span>
          </div>
          <div className="body">
            Mensagem em inglês quebra o padrão do arquivo — os outros <code>log.info</code>/<code>log.warn</code> aqui estão em PT-BR. Padroniza?
          </div>
          <div className="actions">
            <a>resolver</a>
            <a>responder</a>
            <a className="primary">salvar rascunho</a>
          </div>
        </div>

        <div className="line"><span className="gut left">51</span><span className="gut right">51</span><code></code></div>
        <div className="line"><span className="gut left">52</span><span className="gut right">52</span><code>    signaturePerson.<span className="tk-fn">setStatus</span>(<span className="tk-type">SignaturePersonStatusEnum</span>.RETRY);</code></div>

        {/* Draft */}
        <div className="cmt draft">
          <div className="ribbon">
            <b>L52</b><span className="sep">·</span>
            <span>rascunho</span><span className="sep">·</span>
            <span>agora</span>
            <span className="state">draft</span>
          </div>
          <div className="body" style={{color: 'var(--c-subtext)', fontStyle: 'italic'}}>
            faltou status check antes do <code>setStatus</code>? Verificar com…
          </div>
          <div className="actions">
            <a>descartar</a>
            <a className="primary">incluir no review</a>
          </div>
        </div>

        <div className="line"><span className="gut left">53</span><span className="gut right">53</span><code>    signaturePersonService.<span className="tk-fn">save</span>(signaturePerson);</code></div>
        <div className="line"><span className="gut left">54</span><span className="gut right">54</span><code></code></div>
      </div>
    </div>
  );
}

// ---- Empty / loading / error / onboard states ----
function EmptyState() {
  return (
    <div className="state-card">
      <span className="label">empty · "pra revisar"</span>
      <div className="stage">
        <div className="state-empty">
          Nada na sua fila.
          <small>tudo limpo · 09:42</small>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-card">
      <span className="label">loading · pr list refresh</span>
      <div className="stage" style={{padding: '40px 20px', alignItems: 'stretch', flexDirection: 'column'}}>
        <div className="state-loading">
          <div className="progress"></div>
          <div style={{height: 18}}></div>
          <div className="skel med"></div>
          <div className="skel short"></div>
          <div className="skel med"></div>
          <div className="skel short"></div>
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="state-card">
      <span className="label">error · github 401</span>
      <div className="stage" style={{alignItems: 'flex-start', textAlign: 'left', paddingTop: 56}}>
        <div className="state-error">
          <div><span className="err">error:</span> github.com responded <span className="err">401 unauthorized</span>.</div>
          <div className="note">  token expirou em 23/05 às 18:42</div>
          <div className="hint">  <a>reautenticar →</a>   <a>abrir configurações</a></div>
        </div>
      </div>
    </div>
  );
}

function OnboardState() {
  return (
    <div className="state-card">
      <span className="label">first run · no repos</span>
      <div className="stage" style={{alignItems: 'flex-start', textAlign: 'left', paddingTop: 48}}>
        <div className="state-onboard">
          <h5>Nenhum repositório, ainda.</h5>
          <p>Aponta esta ferramenta pros repositórios que você revisa todo dia. Ela vai ficar quieta até você abrir um PR.</p>
          <a className="link">adicionar repositório →</a>
        </div>
      </div>
    </div>
  );
}

// ---- Palette board ----
function PaletteBoard() {
  const rows = [
    { name: 'base',     role: 'janela',         lightHex: '#F4F1EA', darkHex: '#16161A' },
    { name: 'mantle',   role: 'titlebar / chrome', lightHex: '#EDE9DF', darkHex: '#1B1B1F' },
    { name: 'surface0', role: 'painel ativo',   lightHex: '#FAF7F0', darkHex: '#222226' },
    { name: 'surface1', role: 'modal · hover',  lightHex: '#FFFFFF', darkHex: '#2A2A2F' },
    { name: 'line',     role: 'régua firme',    lightHex: '#D9D2C2', darkHex: '#2E2E33' },
    { name: 'text',     role: 'tinta',          lightHex: '#2A2723', darkHex: '#DCD8CF' },
    { name: 'subtext',  role: 'metadado',       lightHex: '#6B6358', darkHex: '#8E887D' },
    { name: 'overlay',  role: 'rótulo · gutter', lightHex: '#A09787', darkHex: '#5B564E' },
    { name: 'accent',   role: 'foco · ativo',   lightHex: '#5E7556', darkHex: '#8FA888', em: true },
    { name: 'success',  role: 'CI · added',     lightHex: '#4F7A3E', darkHex: '#7CA664' },
    { name: 'warn',     role: 'CI · rascunho',  lightHex: '#B8853A', darkHex: '#C9A35A' },
    { name: 'danger',   role: 'CI · removed',   lightHex: '#A64A3A', darkHex: '#C77863' },
    { name: 'info',     role: 'keywords · links', lightHex: '#3B5C7E', darkHex: '#7AA5C9' },
  ];

  const Col = ({ title, sub, hexKey }) => (
    <div className="col">
      <h4><span>{title}</span><span>{sub}</span></h4>
      <div>
        {rows.map(r => (
          <div className="swatch-row" key={r.name + hexKey}>
            <div className="chip" style={{background: r[hexKey]}}></div>
            <div className="name">
              <b>{r.name}</b>
              <em>{r.role}</em>
            </div>
            <div className="hex">{r[hexKey]}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="palette">
      <Col title="paper" sub="day · papel envelhecido" hexKey="lightHex" />
      <Col title="linen" sub="night · linho escuro" hexKey="darkHex" />
    </div>
  );
}

// ---- Type specimen ----
function TypeSpecimen() {
  return (
    <div className="type-specimen">
      <div className="type-row">
        <span className="role">titlebar pr</span>
        <span style={{fontFamily:'var(--font-sans)', fontSize: 13, fontWeight: 500}}>
          fix(unico): convert SignatureUnico naked saves to CAS-JPQL writers
        </span>
        <span className="spec">13 · 500 · sans</span>
      </div>
      <div className="type-row">
        <span className="role">breadcrumb</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 12, color:'var(--c-subtext)'}}>
          esparta-tech<span style={{color:'var(--c-overlay)'}}>/</span>scorehub-signature-unico
        </span>
        <span className="spec">12 · mono</span>
      </div>
      <div className="type-row">
        <span className="role">pr list title</span>
        <span style={{fontFamily:'var(--font-sans)', fontSize: 13, lineHeight: 1.4}}>
          fix(unico): convert SignatureUnico naked saves to CAS-JPQL writers
        </span>
        <span className="spec">13 · 400 · sans</span>
      </div>
      <div className="type-row">
        <span className="role">pr list meta</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--c-subtext)'}}>
          christiansmmc · 14h · 15f
        </span>
        <span className="spec">11 · mono</span>
      </div>
      <div className="type-row">
        <span className="role">group label</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--c-overlay)'}}>
          scorehub-signature-unico
        </span>
        <span className="spec">10 · mono · 0.10em</span>
      </div>
      <div className="type-row">
        <span className="role">file tree</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 12}}>
          SignatureRetryCancelProcessBusinessImpl.java
        </span>
        <span className="spec">12 · mono</span>
      </div>
      <div className="type-row">
        <span className="role">diff file header</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 11}}>
          src<span style={{color:'var(--c-overlay)'}}>/</span>main<span style={{color:'var(--c-overlay)'}}>/</span>…<span style={{color:'var(--c-overlay)'}}>/</span><b style={{fontWeight:500}}>Impl.java</b>
          <span style={{color:'var(--c-success)', marginLeft: 12}}>+10</span>
          <span style={{color:'var(--c-danger)', marginLeft: 8}}>−9</span>
        </span>
        <span className="spec">11 · mono</span>
      </div>
      <div className="type-row">
        <span className="role">comment body</span>
        <span style={{fontFamily:'var(--font-sans)', fontSize: 12.5, lineHeight: 1.55}}>
          Mensagem em inglês quebra o padrão do arquivo — padroniza?
        </span>
        <span className="spec">12.5 · sans</span>
      </div>
      <div className="type-row">
        <span className="role">comment ribbon</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--c-subtext)'}}>
          <b style={{color:'var(--c-text)', fontWeight:500}}>L47</b> <span style={{color:'var(--c-overlay)'}}>·</span> christiansmmc <span style={{color:'var(--c-overlay)'}}>·</span> 9m
        </span>
        <span className="spec">11 · mono</span>
      </div>
      <div className="type-row">
        <span className="role">state tag</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--c-accent)'}}>aberto · resolvido · draft</span>
        <span className="spec">10 · 0.08em</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  StatusLine,
  PRListMock,
  DiffMock,
  EmptyState,
  LoadingState,
  ErrorState,
  OnboardState,
  PaletteBoard,
  TypeSpecimen,
});
