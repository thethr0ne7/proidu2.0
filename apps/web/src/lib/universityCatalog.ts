import type { UniversityRegion } from '../data/regions';

export interface UniversityCatalogEntry {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  city?: string;
  isBranch: boolean;
  sourceUrl: string;
}

const CACHE_VERSION = '2025-02';
const CACHE_PREFIX = `proidu:universities:${CACHE_VERSION}:`;
const REQUEST_TIMEOUT_MS = 18_000;

export function getOfficialRegionUrl(region: UniversityRegion): string {
  return `https://monitoring.miccedu.ru/iam/2025/_vpo/material.php?id=${region.monitoringId}&type=2`;
}

export async function loadRegionUniversities(
  region: UniversityRegion,
  options: { force?: boolean; signal?: AbortSignal } = {}
): Promise<UniversityCatalogEntry[]> {
  const cacheKey = `${CACHE_PREFIX}${region.id}`;
  if (!options.force) {
    const cached = readCache(cacheKey);
    if (cached.length > 0) return cached;
  }

  const officialUrl = getOfficialRegionUrl(region);
  const endpoints = [
    `https://r.jina.ai/http://monitoring.miccedu.ru/iam/2025/_vpo/material.php?id=${region.monitoringId}&type=2`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(officialUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(officialUrl)}`,
    officialUrl
  ];

  const errors: string[] = [];
  for (const endpoint of endpoints) {
    try {
      const raw = await fetchText(endpoint, options.signal);
      const parsed = parseUniversityCatalog(raw, region);
      if (parsed.length > 0) {
        writeCache(cacheKey, parsed);
        return parsed;
      }
      errors.push(`Пустой ответ: ${new URL(endpoint).host}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Не удалось загрузить официальный список. ${errors.slice(0, 2).join(' · ')}`);
}

export function parseUniversityCatalog(raw: string, region: UniversityRegion): UniversityCatalogEntry[] {
  const fromHtml = parseHtml(raw, region);
  if (fromHtml.length > 0) return dedupe(fromHtml);

  const fromMarkdown = parseMarkdown(raw, region);
  if (fromMarkdown.length > 0) return dedupe(fromMarkdown);

  return [];
}

export function searchUniversities(entries: UniversityCatalogEntry[], query: string): UniversityCatalogEntry[] {
  const needle = normalize(query).toLocaleLowerCase('ru-RU');
  if (!needle) return entries;
  return entries.filter((entry) => {
    const haystack = `${entry.name} ${entry.city ?? ''} ${entry.regionName}`.toLocaleLowerCase('ru-RU');
    return haystack.includes(needle);
  });
}

function parseHtml(raw: string, region: UniversityRegion): UniversityCatalogEntry[] {
  if (!raw.includes('<')) return [];

  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(raw, 'text/html');
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="inst.php?id="]'));

    return anchors
      .map((anchor) => {
        const name = normalize(anchor.textContent ?? '');
        const href = anchor.getAttribute('href') ?? '';
        if (!isInstitutionName(name) || !href) return null;
        const sourceUrl = absolutize(href);
        const context = normalize(anchor.parentElement?.textContent ?? '');
        return toEntry(name, sourceUrl, region, extractCity(context));
      })
      .filter((entry): entry is UniversityCatalogEntry => Boolean(entry));
  }

  // Vitest/SSR environments do not expose DOMParser. Keep a narrow fallback
  // that only accepts official institution links rather than parsing arbitrary HTML.
  const entries: UniversityCatalogEntry[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']*inst\.php\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/giu;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(raw)) !== null) {
    const name = normalize(stripHtml(match[2]));
    if (!isInstitutionName(name)) continue;
    const surrounding = raw.slice(Math.max(0, match.index - 80), match.index + match[0].length + 180);
    entries.push(toEntry(name, absolutize(match[1]), region, extractCity(stripHtml(surrounding))));
  }
  return entries;
}

function parseMarkdown(raw: string, region: UniversityRegion): UniversityCatalogEntry[] {
  const entries: UniversityCatalogEntry[] = [];
  const patterns = [
    /\[([^\]]{8,500})\]\((https?:\/\/monitoring\.miccedu\.ru\/iam\/2025\/_vpo\/inst\.php\?id=\d+[^)]*)\)/giu,
    /\[([^\]]{8,500})\]\((\/iam\/2025\/_vpo\/inst\.php\?id=\d+[^)]*)\)/giu
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      const name = normalize(match[1]);
      if (!isInstitutionName(name)) continue;
      const tail = raw.slice(match.index + match[0].length, match.index + match[0].length + 180);
      entries.push(toEntry(name, absolutize(match[2]), region, extractCity(tail)));
    }
  }

  return entries;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&laquo;|&#171;/giu, '«')
    .replace(/&raquo;|&#187;/giu, '»')
    .replace(/&amp;/giu, '&');
}

function toEntry(
  name: string,
  sourceUrl: string,
  region: UniversityRegion,
  city?: string
): UniversityCatalogEntry {
  const sourceId = sourceUrl.match(/[?&]id=(\d+)/)?.[1] ?? slugify(name);
  return {
    id: `${region.id}-${sourceId}`,
    name,
    regionId: region.id,
    regionName: region.name,
    city,
    isBranch: /филиал/iu.test(name),
    sourceUrl
  };
}

function isInstitutionName(value: string): boolean {
  if (value.length < 8) return false;
  if (/информационно-аналитические материалы|мониторинг|на карте/iu.test(value)) return false;
  return /университет|институт|академи|семинари|школа|училище|образовательн/iu.test(value);
}

function extractCity(value: string): string | undefined {
  const match = value.match(/(?:^|[\s>])(?:г\.|город\s+)([^\n\r<]{2,70})/iu);
  if (!match) return undefined;
  return normalize(match[1].replace(/\s{2,}.*$/, '').replace(/\d{6}.*$/, ''));
}

function absolutize(href: string): string {
  try {
    return new URL(href, 'https://monitoring.miccedu.ru/iam/2025/_vpo/').toString();
  } catch {
    return href;
  }
}

function dedupe(entries: UniversityCatalogEntry[]): UniversityCatalogEntry[] {
  const map = new Map<string, UniversityCatalogEntry>();
  for (const entry of entries) {
    const key = `${entry.regionId}:${entry.sourceUrl || normalize(entry.name).toLowerCase()}`;
    if (!map.has(key)) map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[·•\-–—\s]+|[·•\-–—\s]+$/g, '').trim();
}

function slugify(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/[^a-zа-яё0-9]+/giu, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function fetchText(url: string, externalSignal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain,text/html,application/xhtml+xml' }
    });
    if (!response.ok) throw new Error(`${new URL(url).host}: HTTP ${response.status}`);
    return await response.text();
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }
}

function readCache(key: string): UniversityCatalogEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { savedAt: number; entries: UniversityCatalogEntry[] };
    if (!Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch {
    return [];
  }
}

function writeCache(key: string, entries: UniversityCatalogEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), entries }));
  } catch {
    // Storage can be unavailable in restrictive Telegram/browser modes.
  }
}
