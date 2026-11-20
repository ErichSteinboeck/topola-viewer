import {GedcomEntry} from 'parse-gedcom';
import {JsonGedcomData, JsonIndi} from 'topola';
import {GedcomData, getData} from '../util/gedcom_util';
import {SearchResult} from './search_index';

export interface FulltextResult extends SearchResult {
  context?: string;
}

interface IndexedText {
  id: string;
  indi: JsonIndi;
  text: string;
  normalized: string;
}

function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Decode HTML entities and remove markup for both indexing and previews. */
function readable(text: string): string {
  // Convert layout tags to spaces before textContent removes the HTML nodes.
  const spaced = text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(?:p|div|li|h[1-6]|tr)\b[^>]*>/gi, ' ');
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(spaced, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  // Non-browser fallback for tests and server-side consumers.
  const names: Record<string, string> = {
    auml: 'ä',
    Auml: 'Ä',
    ouml: 'ö',
    Ouml: 'Ö',
    uuml: 'ü',
    Uuml: 'Ü',
    szlig: 'ß',
    nbsp: ' ',
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    eacute: 'é',
    Eacute: 'É',
    agrave: 'à',
    egrave: 'è',
  };
  return spaced
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (entity, code: string) => {
      if (code.startsWith('#')) {
        const hex = code.charAt(1).toLowerCase() === 'x';
        const number = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        return number > 0 && number <= 0x10ffff
          ? String.fromCodePoint(number)
          : entity;
      }
      return names[code] ?? entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function collect(entry: GedcomEntry, out: string[]): void {
  // CONC/CONT are reconstructed as part of the parent, not independent hits.
  if (entry.tag !== 'CONC' && entry.tag !== 'CONT') {
    if (entry.data && !/^@[^@]+@$/.test(entry.data)) {
      out.push(readable(getData(entry).join(' ')));
    }
    entry.tree.forEach((child) => collect(child, out));
  }
}

/** A local-only index. No GEDCOM content is sent to an external service. */
export class FulltextSearchIndex {
  private rows: IndexedText[];

  constructor(gedcom: GedcomData, chartData: JsonGedcomData) {
    const names = new Map(chartData.indis.map((indi) => [indi.id, indi]));
    const familyText = new Map<string, string[]>();
    Object.entries(gedcom.fams).forEach(([id, family]) => {
      const chunks: string[] = [];
      family.tree.forEach((entry) => {
        if (
          !['HUSB', 'WIFE', 'CHIL', 'RIN', '_UID', '_UPD'].includes(entry.tag)
        ) {
          collect(entry, chunks);
        }
      });
      familyText.set(id, chunks);
    });
    this.rows = Object.entries(gedcom.indis).flatMap(([id, person]) => {
      const indi = names.get(id);
      if (!indi) return [];
      const chunks: string[] = [];
      person.tree.forEach((entry) => collect(entry, chunks));
      const families = person.tree.filter((entry) => entry.tag === 'FAMS');
      families.forEach((family) => {
        const familyId = family.data.replaceAll('@', '');
        chunks.push(...(familyText.get(familyId) || []));
      });
      const text = chunks.filter(Boolean).join(' | ');
      return [{id, indi, text, normalized: normalize(text)}];
    });
  }

  search(query: string): FulltextResult[] {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return this.rows
      .filter((entry) => words.every((word) => entry.normalized.includes(word)))
      .slice(0, 20)
      .map((entry) => {
        const first = entry.normalized.indexOf(words[0]);
        const start = Math.max(0, first - 55);
        const context = entry.text.slice(start, start + 165);
        return {
          id: entry.id,
          indi: entry.indi,
          context:
            (start ? '…' : '') +
            context +
            (start + 165 < entry.text.length ? '…' : ''),
        };
      });
  }
}
