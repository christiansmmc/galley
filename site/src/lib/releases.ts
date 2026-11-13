export type Platform = 'rpm' | 'deb' | 'windows';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}
export interface Release {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}
export interface Download {
  platform: Platform;
  label: string;
  url: string;
  version: string;
}

const LABELS: Record<Platform, string> = {
  rpm: 'Linux · .rpm (Fedora/Nobara)',
  deb: 'Linux · .deb (Ubuntu/Debian)',
  windows: 'Windows',
};
const ORDER: Platform[] = ['rpm', 'deb', 'windows'];

export function categorizeAsset(name: string): Platform | null {
  const n = name.toLowerCase();
  if (n.endsWith('.rpm')) return 'rpm';
  if (n.endsWith('.deb')) return 'deb';
  if (n.endsWith('.msi') || n.endsWith('.exe')) return 'windows';
  return null;
}

/**
 * Build one download button per platform present in the release, labelled with
 * the available build (Windows / Linux · .rpm / Linux · .deb). First asset of
 * each platform wins; buttons come back in ORDER.
 */
export function buildDownloads(release: Release): Download[] {
  const byPlatform = new Map<Platform, ReleaseAsset>();
  for (const asset of release.assets) {
    const p = categorizeAsset(asset.name);
    if (p && !byPlatform.has(p)) byPlatform.set(p, asset);
  }
  return ORDER.filter((p) => byPlatform.has(p)).map((p) => ({
    platform: p,
    label: LABELS[p],
    url: byPlatform.get(p)!.browser_download_url,
    version: release.tag_name,
  }));
}
