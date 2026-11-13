import { describe, it, expect } from 'vitest';
import { STRINGS, detectLang, type Lang } from './i18n';

describe('detectLang', () => {
  it('prefers a valid stored value', () => {
    expect(detectLang('pt', 'en-US')).toBe('pt');
    expect(detectLang('en', 'pt-BR')).toBe('en');
  });
  it('ignores an invalid stored value and falls back to navigator', () => {
    expect(detectLang('xx', 'pt-BR')).toBe('pt');
    expect(detectLang(null, 'pt')).toBe('pt');
  });
  it('defaults to en when navigator is not portuguese', () => {
    expect(detectLang(null, 'en-GB')).toBe('en');
    expect(detectLang(null, undefined)).toBe('en');
  });
});

describe('STRINGS', () => {
  it('has identical keys for en and pt', () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.pt).sort());
  });
  it('has no empty strings', () => {
    for (const lang of ['en', 'pt'] as Lang[])
      for (const v of Object.values(STRINGS[lang])) expect(v.length).toBeGreaterThan(0);
  });
});
