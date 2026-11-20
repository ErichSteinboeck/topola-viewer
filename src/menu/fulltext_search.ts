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

/** Strip markup for searching while preserving recognizable plain-text notes. */
function readable(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|lt|gt);/gi, ' ')
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
        if (!['HUSB', 'WIFE', 'CHIL', 'RIN', '_UID', '_UPD'].includes(entry.tag)) {
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
          context: (start ? '…' : '') + context + (start + 165 < entry.text.length ? '…' : ''),
        };
      });
  }
}
