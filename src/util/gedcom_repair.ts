/**
 * Repair physical lines that some GEDCOM exporters (notably MyHeritage)
 * accidentally emit without a GEDCOM level and tag inside NOTE/BIO/TEXT.
 *
 * GEDCOM CONC joins text with NO separator. In contrast, CONT inserts a line
 * break. We never infer spaces based on line length: a broken HTML tag, entity,
 * word, or URL can span physical lines at an arbitrary character.
 *
 * Deliberately conservative: malformed lines outside text records are left
 * untouched rather than silently corrupting the family structure.
 */
const GEDCOM_RECORD = /^(\d+)\s+(?:(?:@[^\s@]+@)\s+)?([A-Za-z0-9_]+)(?:\s|$)/;
const TEXT_TAGS = new Set(['NOTE', 'TEXT', 'BIO', '_BIO']);

export function repairGedcomTextLines(input: string): string {
  const lines = input.split(/\r\n|\n|\r/);
  const result: string[] = [];
  let activeTextLevel: number | undefined;
  let repaired = 0;

  for (const line of lines) {
    const parsed = GEDCOM_RECORD.exec(line);
    // GEDCOM levels are nonnegative small integers (0..99 in GEDCOM 7).
    // A note line such as '1855 H' is not a GEDCOM record.
    const record = parsed && Number(parsed[1]) <= 99 ? parsed : null;
    if (record) {
      const level = Number(record[1]);
      const tag = record[2].toUpperCase();
      if (activeTextLevel !== undefined && level <= activeTextLevel) {
        activeTextLevel = undefined;
      }
      if (TEXT_TAGS.has(tag)) {
        activeTextLevel = level;
      }
      result.push(line);
    } else if (line.trim() === '') {
      // An empty physical line is commonly an exporter formatting artifact.
      // HTML paragraph breaks are represented by <p>/<br> in the note itself.
      // Do not guess a GEDCOM CONT, which would change the recorded text.
      result.push(line);
    } else if (activeTextLevel !== undefined) {
      result.push(`${activeTextLevel + 1} CONC ${line}`);
      repaired++;
    } else {
      result.push(line);
    }
  }

  if (repaired) {
    console.warn(
      `Repaired ${repaired} untagged GEDCOM text continuation line(s).`,
    );
  }
  return repaired ? result.join('\n') : input;
}
