import { describe, it, expect } from 'vitest';
import { resolveInitialTheme, type Theme } from './theme';

describe('resolveInitialTheme', () => {
  it('prefers a valid stored value', () => {
    expect(resolveInitialTheme('linen', true)).toBe('linen');
    expect(resolveInitialTheme('paper', true)).toBe('paper');
  });
  it('falls back to linen when system prefers dark', () => {
    expect(resolveInitialTheme(null, true)).toBe('linen');
  });
  it('falls back to paper when system does not prefer dark', () => {
    expect(resolveInitialTheme(null, false)).toBe('paper');
    expect(resolveInitialTheme('bogus', false)).toBe('paper');
  });
});
