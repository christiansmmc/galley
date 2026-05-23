import { usePrsStore } from "../../state/prsStore";
import { useDraftsStore } from "../../state/draftsStore";

export function ThreadsSidebar({ path }: { path: string }) {
  const threads = usePrsStore(s => s.threads).filter(t => t.path === path);
  const drafts = useDraftsStore(s => s.drafts).filter(d => d.path === path);
  const remove = useDraftsStore(s => s.remove);

  if (threads.length === 0 && drafts.length === 0) {
    return <div style={{ padding: 12, color: "var(--c-subtext)", fontSize: 12 }}>Sem comentários neste arquivo.</div>;
  }

  return (
    <div style={{ padding: 12, overflow: "auto", height: "100%" }}>
      {drafts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-amber)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Rascunhos
          </div>
          {drafts.map(d => (
            <div key={d.id} style={{
              padding: 8, marginBottom: 6, borderRadius: 5,
              background: "var(--c-mantle)", border: "1px solid var(--c-surface1)", fontSize: 12,
            }}>
              <div style={{ fontSize: 10, color: "var(--c-subtext)", fontFamily: "var(--font-mono)" }}>
                L{d.line} · {d.side}
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.body}</div>
              <button onClick={() => remove(d.id)} style={{
                marginTop: 6, background: "transparent", border: 0,
                color: "var(--c-red)", cursor: "pointer", fontSize: 11, padding: 0,
              }}>Apagar</button>
            </div>
          ))}
        </div>
      )}
      {threads.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Threads
          </div>
          {threads.map(t => (
            <div key={t.id} style={{
              padding: 8, marginBottom: 6, borderRadius: 5,
              background: "var(--c-mantle)", border: "1px solid var(--c-surface1)",
            }}>
              <div style={{ fontSize: 10, color: "var(--c-subtext)", fontFamily: "var(--font-mono)" }}>
                L{t.line ?? "?"} · {t.side}
              </div>
              {t.comments.map(c => (
                <div key={c.id} style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--c-surface0)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-subtext)" }}>{c.author}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.body}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
