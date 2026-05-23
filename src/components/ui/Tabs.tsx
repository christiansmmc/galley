import type { ReactNode } from "react";

interface Tab<T extends string> {
  id: T;
  label: ReactNode;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  trailing?: ReactNode;
}

export function Tabs<T extends string>({ tabs, value, onChange, trailing }: Props<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)",
      }}
    >
      {tabs.map(t => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              padding: "var(--space-4) var(--space-2)",
              border: 0,
              background: active ? "var(--c-base)" : "transparent",
              color: active ? "var(--c-text)" : "var(--c-subtext)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-medium)" as unknown as number,
              borderBottom: `2px solid ${active ? "var(--c-accent)" : "transparent"}`,
              transition: "color var(--transition-fast), background var(--transition-fast)",
            }}
          >
            {t.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
