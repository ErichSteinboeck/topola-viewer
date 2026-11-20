import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'fs';
import {parse as parseGedcom} from 'parse-gedcom';
import {createIntl, createIntlCache} from 'react-intl';
import {GedcomData} from '../util/gedcom_util';
import {associatedEventLines, placeKey, placesMatch} from './hover_helpers';

const intl = createIntl({locale: 'de', messages: {}}, createIntlCache());

describe('placeKey', () => {
  it('ignores only case and superfluous whitespace', () => {
    expect(placeKey('  Wien   Wieden 327  ')).toBe(placeKey('wien wieden 327'));
    expect(placeKey('Wieden 327')).not.toBe(placeKey('Wieden 327, Wien'));
    expect(placeKey('')).toBe('');
  });
});

describe('placesMatch', () => {
  it('matches complete places at the start or end of composite marriage places in either direction', () => {
    const combined = 'Germanns / Rudmanns 63';
    expect(placesMatch(combined, 'Germanns')).toBe(true);
    expect(placesMatch('Germanns', combined)).toBe(true);
    expect(placesMatch(combined, 'Rudmanns 63')).toBe(true);
    expect(placesMatch('Rudmanns 63', combined)).toBe(true);
    expect(placesMatch(combined, 'Rudmanns')).toBe(false);
  });

  it('requires a boundary and never matches only part of a name', () => {
    expect(placesMatch('Wien', 'Wiener Neustadt')).toBe(false);
    expect(placesMatch('Germanns', 'Altgermanns')).toBe(false);
    expect(placesMatch('Wieden 327', 'Wieden 327, Wien')).toBe(true);
    expect(placesMatch('Rudmanns 63', 'Rudmanns 64')).toBe(false);
    expect(placesMatch('', '')).toBe(false);
  });
});

describe('associatedEventLines', () => {
  it('shows christening with a birth date and burial with death where present', () => {
    const input = readFileSync('public/examples/wienfluss-huber.ged', 'utf8');
    const entries = parseGedcom(input);
    const indis: GedcomData['indis'] = {};
    for (const entry of entries) {
      if (entry.tag === 'INDI')
        indis[entry.pointer.replaceAll('@', '')] = entry;
    }
    const gedcom: GedcomData = {indis, fams: {}, other: {}};
    const christening = associatedEventLines(gedcom, 'I500003', 'birth', intl);
    expect(christening).toHaveLength(1);
    expect(christening[0]).toContain('Taufe');
    expect(christening[0]).toContain('26. November 1846');
    expect(associatedEventLines(gedcom, 'I500001', 'death', intl)).toEqual([]);
  });
});
