export type Theme = 'paper' | 'linen';

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'paper' || stored === 'linen') return stored;
  return prefersDark ? 'linen' : 'paper';
}
