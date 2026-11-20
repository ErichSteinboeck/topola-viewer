import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'fs';
import {createIntl, createIntlCache} from 'react-intl';
import {parse as parseGedcom} from 'parse-gedcom';
import {GedcomData} from '../util/gedcom_util';
import {associatedEventLines, placeKey} from './hover_helpers';

const intl = createIntl({locale: 'de', messages: {}}, createIntlCache());

describe('placeKey', () => {
  it('ignores only case and superfluous whitespace', () => {
    expect(placeKey('  Wien   Wieden 327  ')).toBe(placeKey('wien wieden 327'));
    expect(placeKey('Wieden 327')).not.toBe(placeKey('Wieden 327, Wien'));
    expect(placeKey('')).toBe('');
  });
});

describe('associatedEventLines', () => {
  it('shows christening with a birth date and burial with death where present', () => {
    const input = readFileSync('public/examples/wienfluss-huber.ged', 'utf8');
    const entries = parseGedcom(input);
    const indis: GedcomData['indis'] = {};
    for (const entry of entries) {
      if (entry.tag === 'INDI') indis[entry.pointer.replaceAll('@', '')] = entry;
    }
    const gedcom: GedcomData = {indis, fams: {}, other: {}};
    const christening = associatedEventLines(gedcom, 'I500003', 'birth', intl);
    expect(christening).toHaveLength(1);
    expect(christening[0]).toContain('Taufe');
    expect(christening[0]).toContain('26. November 1846');
    expect(associatedEventLines(gedcom, 'I500001', 'death', intl)).toEqual([]);
  });
});
