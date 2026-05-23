import { useState, type ReactNode } from "react";
import { Inbox, Search, RefreshCw } from "lucide-react";
import { Avatar } from "./Avatar";
import { Badge, type BadgeTone } from "./Badge";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";
import { Dropdown } from "./Dropdown";
import { EmptyState } from "./EmptyState";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";
import { Tabs } from "./Tabs";
import { Textarea } from "./Textarea";
import { Tooltip } from "./Tooltip";

/** Hidden gallery for sanity-checking primitives. Open via `#/__ui`. */
export function UiGallery() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [modal, setModal] = useState(false);

  return (
    <div style={{
      padding: "var(--space-9)",
      maxWidth: 960,
      margin: "0 auto",
      color: "var(--c-text)",
      background: "var(--c-base)",
      minHeight: "100vh",
      fontFamily: "var(--font-ui)",
    }}>
      <h1 style={{ marginTop: 0 }}>UI primitives</h1>
      <p style={{ color: "var(--c-subtext)" }}>Sanity check for sub-phase 2.1.</p>

      <Section title="Buttons">
        {(["primary", "ghost", "danger", "subtle"] as ButtonVariant[]).map(v => (
          <div key={v} style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-3)", alignItems: "center" }}>
            <span style={{ width: 80, fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>{v}</span>
            {(["sm", "md", "lg"] as ButtonSize[]).map(s => (
              <Button key={s} variant={v} size={s}>{v} {s}</Button>
            ))}
            <Button variant={v} disabled>disabled</Button>
            <Button variant={v} leadingIcon={<Search size={14} />}>com ícone</Button>
          </div>
        ))}
        <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "center" }}>
          <span style={{ width: 80, fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>link</span>
          <Button variant="link">resolver</Button>
          <Button variant="link" tone="accent">salvar rascunho</Button>
          <Button variant="link" disabled>disabled</Button>
        </div>
        <Button variant="icon" leadingIcon={<RefreshCw size={14} />} aria-label="refresh" />
      </Section>

      <Section title="Inputs">
        <Input placeholder="Texto comum" />
        <Input placeholder="Mono" mono />
        <Input placeholder="Invalid" invalid />
        <Textarea placeholder="Multi-linha…" rows={3} />
        <Dropdown defaultValue="b">
          <option value="a">Opção A</option>
          <option value="b">Opção B</option>
          <option value="c">Opção C</option>
        </Dropdown>
      </Section>

      <Section title="Tabs">
        <Tabs<"a" | "b" | "c">
          value={tab}
          onChange={setTab}
          tabs={[{ id: "a", label: "Aba A" }, { id: "b", label: "Aba B" }, { id: "c", label: "Aba C" }]}
        />
        <div style={{ padding: "var(--space-5)" }}>Conteúdo: {tab}</div>
      </Section>

      <Section title="Badge / Avatar / Spinner">
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
          {(["neutral", "accent", "green", "amber", "red", "blue"] as BadgeTone[]).map(t => (
            <Badge key={t} tone={t}>{t}</Badge>
          ))}
          <Avatar login="octocat" />
          <Avatar login="ghost-user" size={32} />
          <Spinner />
          <Spinner size={20} color="var(--c-accent)" />
        </div>
      </Section>

      <Section title="Tooltip">
        <Tooltip label="Tooltip de teste">
          <Button variant="ghost">Hover me</Button>
        </Tooltip>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={<Inbox size={24} />}
          title="Nada na sua fila."
          description="tudo limpo · 09:42"
          action={<Button variant="link" tone="accent">abrir configurações</Button>}
        />
      </Section>

      <Section title="Modal">
        <Button variant="primary" onClick={() => setModal(true)}>Abrir modal</Button>
        <Modal
          title="Modal de teste"
          open={modal}
          onClose={() => setModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
              <Button variant="subtle" onClick={() => setModal(false)}>Ok</Button>
            </>
          }
        >
          <p>Conteúdo do modal. Esc fecha. Click fora fecha.</p>
        </Modal>
      </Section>

      <Section title="Badge — hairline state tag">
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
          <Badge tone="hairline">aberto</Badge>
          <Badge tone="hairline">rascunho</Badge>
          <Badge tone="hairline">resolvido</Badge>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--space-10)" }}>
      <h3 style={{
        margin: "0 0 var(--space-5)",
        fontSize: "var(--text-md)",
        color: "var(--c-subtext)",
        textTransform: "uppercase",
        letterSpacing: 0.6,
      }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>{children}</div>
    </section>
  );
}
