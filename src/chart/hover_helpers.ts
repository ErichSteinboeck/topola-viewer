import {GedcomEntry} from 'parse-gedcom';
import {IntlShape} from 'react-intl';
import {GedcomData, getData} from '../util/gedcom_util';
import {translateDate} from '../util/date_util';

/** Compare full GEDCOM place names, not the shortened labels on screen. */
export function placeKey(place: string | undefined): string {
  return (place || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function eventLine(
  entry: GedcomEntry,
  label: string,
  intl: IntlShape,
): string {
  const dateEntry = entry.tree.find((part) => part.tag === 'DATE');
  const placeEntry = entry.tree.find((part) => part.tag === 'PLAC');
  const date = dateEntry?.data ? translateDate(dateEntry.data, intl) : '';
  const place = placeEntry ? getData(placeEntry).join('\n') : '';
  return [label, date, place].filter(Boolean).join(' · ');
}

/** Additional church events shown with birth/death, when present. */
export function associatedEventLines(
  gedcom: GedcomData | undefined,
  individualId: string,
  kind: 'birth' | 'death',
  intl: IntlShape,
): string[] {
  const person = gedcom?.indis[individualId];
  if (!person) return [];
  const german = intl.locale.toLowerCase().startsWith('de');
  const events = kind === 'birth'
    ? [{tag: 'CHR', label: german ? 'Taufe' : 'Christening'},
       {tag: 'BAPM', label: german ? 'Taufe' : 'Baptism'}]
    : [{tag: 'BURI', label: german ? 'Beerdigung' : 'Burial'},
       {tag: 'CREM', label: german ? 'Einäscherung' : 'Cremation'}];
  return person.tree.flatMap((entry) => {
    const match = events.find((event) => event.tag === entry.tag);
    return match ? [eventLine(entry, match.label, intl)] : [];
  });
}
