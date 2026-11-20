import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'fs';
import {parse as parseGedcom} from 'parse-gedcom';
import {gedcomEntriesToJson} from 'topola';
import {GedcomData} from '../util/gedcom_util';
import {FulltextSearchIndex} from './fulltext_search';

describe('FulltextSearchIndex', () => {
  it('finds people by places and HTML-formatted event notes', () => {
    const entries = parseGedcom(
      readFileSync('public/examples/wienfluss-huber.ged', 'utf8'),
    );
    const indis: GedcomData['indis'] = {};
    const fams: GedcomData['fams'] = {};
    entries.forEach((entry) => {
      const id = entry.pointer.replaceAll('@', '');
      if (entry.tag === 'INDI') indis[id] = entry;
      if (entry.tag === 'FAM') fams[id] = entry;
    });
    const index = new FulltextSearchIndex(
      {indis, fams, other: {}},
      gedcomEntriesToJson(entries),
    );

    expect(index.search('Lungentuberkulose').map((r) => r.id)).toContain(
      'I500001',
    );
    expect(index.search('Kohlmarkt').map((r) => r.id)).toContain('I500002');
    expect(index.search('Beschauzettel')[0].context).toContain('Beschauzettel');
    expect(index.search('no-such-person-place-word')).toEqual([]);
  });
});
