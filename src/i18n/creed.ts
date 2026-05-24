type TFn = (key: string) => string;

export const CREED_IDS = [
  "reading",
  "code_first",
  "no_shortcuts",
  "one_diff",
  "you_review",
] as const;

export type CreedId = (typeof CREED_IDS)[number];

const LEGACY_TO_ID: Record<string, CreedId> = {
  "lendo. sem resumos.": "reading",
  "código antes do colega.": "code_first",
  "sem atalhos não pedidos.": "no_shortcuts",
  "um diff por vez.": "one_diff",
  "você é o revisor.": "you_review",
};

export function normalizeCreed(value: string | undefined | null): string {
  if (!value) return CREED_IDS[0];
  if ((CREED_IDS as readonly string[]).includes(value)) return value;
  return LEGACY_TO_ID[value] ?? value;
}

export function resolveCreed(value: string | undefined | null, t: TFn): string {
  const normalized = normalizeCreed(value);
  if ((CREED_IDS as readonly string[]).includes(normalized)) {
    return t(`settings.appearance.voice_options.${normalized}`);
  }
  return normalized;
}
