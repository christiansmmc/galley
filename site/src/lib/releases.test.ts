import { describe, it, expect } from 'vitest';
import { categorizeAsset, buildDownloads, type Release } from './releases';

describe('categorizeAsset', () => {
  it('maps extensions to platforms', () => {
    expect(categorizeAsset('Galley-0.9.1-1.x86_64.rpm')).toBe('rpm');
    expect(categorizeAsset('Galley_0.9.1_amd64.deb')).toBe('deb');
    expect(categorizeAsset('Galley_0.9.1_x64-setup.msi')).toBe('windows');
    expect(categorizeAsset('Galley_0.9.1_x64-setup.exe')).toBe('windows');
  });
  it('is case-insensitive', () => {
    expect(categorizeAsset('GALLEY.RPM')).toBe('rpm');
  });
  it('returns null for unknown assets', () => {
    expect(categorizeAsset('Galley.AppImage')).toBeNull();
    expect(categorizeAsset('latest.json')).toBeNull();
  });
});

describe('buildDownloads', () => {
  const release: Release = {
    tag_name: 'v0.9.1',
    published_at: '2026-06-01T00:00:00Z',
    html_url: 'https://github.com/christiansmmc/galley/releases/tag/v0.9.1',
    assets: [
      { name: 'Galley-0.9.1-1.x86_64.rpm', browser_download_url: 'https://x/r.rpm' },
      { name: 'Galley_0.9.1_amd64.deb', browser_download_url: 'https://x/d.deb' },
      { name: 'Galley_0.9.1_x64-setup.exe', browser_download_url: 'https://x/w.exe' },
      { name: 'noise.txt', browser_download_url: 'https://x/n.txt' },
    ],
  };

  it('returns one button per platform in ORDER (rpm, deb, windows)', () => {
    const dl = buildDownloads(release);
    expect(dl.map((d) => d.platform)).toEqual(['rpm', 'deb', 'windows']);
    expect(dl[0].url).toBe('https://x/r.rpm');
    expect(dl[2].label).toBe('Windows');
  });
  it('only includes platforms present in the release', () => {
    const winOnly = buildDownloads({ ...release, assets: [release.assets[2]] });
    expect(winOnly).toHaveLength(1);
    expect(winOnly[0].platform).toBe('windows');
  });
  it('takes the first asset of each platform', () => {
    const dl = buildDownloads({
      ...release,
      assets: [
        { name: 'Galley-1.0-1.x86_64.rpm', browser_download_url: 'https://x/first.rpm' },
        { name: 'Galley-1.0-2.x86_64.rpm', browser_download_url: 'https://x/second.rpm' },
      ],
    });
    expect(dl[0].url).toBe('https://x/first.rpm');
  });
  it('carries the version tag', () => {
    expect(buildDownloads(release)[0].version).toBe('v0.9.1');
  });
  it('returns an empty list when there are no recognised assets', () => {
    expect(buildDownloads({ ...release, assets: [{ name: 'x.txt', browser_download_url: 'https://x/x' }] })).toEqual([]);
  });
});
