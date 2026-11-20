import {GedcomEntry} from 'parse-gedcom';
import {IntlShape} from 'react-intl';
import {translateDate} from '../util/date_util';
import {GedcomData, getData} from '../util/gedcom_util';

/** Compare full GEDCOM place names, not the shortened labels on screen. */
export function placeKey(place: string | undefined): string {
  return (place || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

/**
 * Match equal places, or a complete place at the beginning/end of the other
 * name. A boundary is required so "Wien" never matches "Wiener Neustadt".
 * In particular, "Germanns / Rudmanns 63" matches both "Germanns"
 * and "Rudmanns 63" independently.
 */
export function placesMatch(left: string, right: string): boolean {
  const a = placeKey(left);
  const b = placeKey(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const matchesEdge = (longer: string, shorter: string) => {
    if (longer.length <= shorter.length) return false;
    if (longer.startsWith(shorter)) {
      return !/[\p{L}\p{N}]/u.test(longer.charAt(shorter.length));
    }
    if (longer.endsWith(shorter)) {
      return !/[\p{L}\p{N}]/u.test(
        longer.charAt(longer.length - shorter.length - 1),
      );
    }
    return false;
  };
  return matchesEdge(a, b) || matchesEdge(b, a);
}

export interface AssociatedEvent {
  label: string;
  value: string;
}

function eventLine(entry: GedcomEntry, label: string, intl: IntlShape): AssociatedEvent {
  const dateEntry = entry.tree.find((part) => part.tag === 'DATE');
  const placeEntry = entry.tree.find((part) => part.tag === 'PLAC');
  const date = dateEntry?.data ? translateDate(dateEntry.data, intl) : '';
  const place = placeEntry ? getData(placeEntry).join('\n') : '';
  return {label, value: [date, place].filter(Boolean).join(' · ')};
}

/** Additional church events shown with birth/death, when present. */
export function associatedEventDetails(
  gedcom: GedcomData | undefined,
  individualId: string,
  kind: 'birth' | 'death',
  intl: IntlShape,
): AssociatedEvent[] {
  const person = gedcom?.indis[individualId];
  if (!person) return [];
  const german = intl.locale.toLowerCase().startsWith('de');
  const events =
    kind === 'birth'
      ? [
          {tag: 'CHR', label: german ? 'Taufe' : 'Christening'},
          {tag: 'BAPM', label: german ? 'Taufe' : 'Baptism'},
        ]
      : [
          {tag: 'BURI', label: german ? 'Beerdigung' : 'Burial'},
          {tag: 'CREM', label: german ? 'Einäscherung' : 'Cremation'},
        ];
  return person.tree.flatMap((entry) => {
    const match = events.find((event) => event.tag === entry.tag);
    return match ? [eventLine(entry, match.label, intl)] : [];
  });
}

/** Backwards-compatible string output for the original event hover. */
export function associatedEventLines(
  gedcom: GedcomData | undefined,
  individualId: string,
  kind: 'birth' | 'death',
  intl: IntlShape,
): string[] {
  return associatedEventDetails(gedcom, individualId, kind, intl).map(
    ({label, value}) => [label, value].filter(Boolean).join(' · '),
  );
}
