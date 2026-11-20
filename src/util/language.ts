/** Resolve UI language: URL, saved preference, browser. */
const SUPPORTED = new Set(['en', 'de', 'bg', 'cs', 'fr', 'it', 'pl', 'ru', 'sv']);
function normalized(value: string | null | undefined): string | undefined {
  const lang = value?.split(/[-_]/)[0].toLowerCase();
  return lang && SUPPORTED.has(lang) ? lang : undefined;
}
export function getPreferredLanguage(): string {
  const topLevel = new URLSearchParams(window.location.search).get('lang');
  const hashQuery = window.location.hash.split('?')[1];
  const hashLanguage = hashQuery ? new URLSearchParams(hashQuery).get('lang') : null;
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem('topola-language');
  } catch {
    // Storage can be disabled.
  }
  return normalized(topLevel) || normalized(hashLanguage) ||
    normalized(saved) || normalized(navigator.language) || 'en';
}
/** Reload with a different language, preserving current chart parameters. */
export function setPreferredLanguage(language: string): void {
  const normalizedLanguage = normalized(language);
  if (!normalizedLanguage) return;
  try {
    window.localStorage.setItem('topola-language', normalizedLanguage);
  } catch {
    // URL override continues to work.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('lang', normalizedLanguage);
  const hashParts = url.hash.split('?');
  if (hashParts.length > 1) {
    const hashParams = new URLSearchParams(hashParts.slice(1).join('?'));
    hashParams.delete('lang');
    const rest = hashParams.toString();
    url.hash = hashParts[0] + (rest ? '?' + rest : '');
  }
  window.location.assign(url.toString());
}
