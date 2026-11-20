/**
 * Repair malformed, untagged physical lines within GEDCOM text records.
 *
 * CONC appends characters without a separator, while CONT adds a line break.
 * MyHeritage exports sometimes omit the numeric level and CONC tag entirely
 * for HTML paragraphs. The original file is never modified.
 */
const GEDCOM_RECORD = /^(\\d+)\\s+(?:(?:@[^\\s@]+@)\\s+)?([A-Za-z0-9_]+)(?:\\s|$)/;
const TEXT_TAGS = new Set(['NOTE', 'TEXT', 'BIO', '_BIO']);

export interface GedcomRepairReport {
  /** Text for the GEDCOM parser (original when no repair was needed). */
  text: string;
  /** Number of malformed physical lines repaired as GEDCOM CONC. */
  repairedLines: number;
  /** Number of nonempty malformed lines left unchanged outside text records. */
  unrepairedLines: number;
  /** First few affected line numbers (1-based), for diagnosis. */
  affectedLines: number[];
}

export function repairGedcomTextLinesWithReport(
  input: string,
): GedcomRepairReport {
  const lines = input.split(/\\r\\n|\\n|\\r/);
  const result: string[] = [];
  let activeTextLevel: number | undefined;
  let repairedLines = 0;
  let unrepairedLines = 0;
  const affectedLines: number[] = [];

  for (const [index, line] of lines.entries()) {
    const parsed = GEDCOM_RECORD.exec(line);
    // The GEDCOM level is a small nonnegative integer, not a year such as 1855.
    const record = parsed && Number(parsed[1]) <= 99 ? parsed : null;
    if (record) {
      const level = Number(record[1]);
      const tag = record[2].toUpperCase();
      if (activeTextLevel !== undefined && level <= activeTextLevel) {
        activeTextLevel = undefined;
      }
      if (TEXT_TAGS.has(tag)) activeTextLevel = level;
      result.push(line);
    } else if (line.trim() === '') {
      // Empty physical lines cannot be reconstructed unambiguously. In the
      // MyHeritage HTML examples, paragraph breaks are already encoded in HTML.
      result.push(line);
    } else if (activeTextLevel !== undefined) {
      result.push(`${activeTextLevel + 1} CONC ${line}`);
      repairedLines++;
      if (affectedLines.length < 10) affectedLines.push(index + 1);
    } else {
      result.push(line);
      unrepairedLines++;
      if (affectedLines.length < 10) affectedLines.push(index + 1);
    }
  }

  if (repairedLines || unrepairedLines) {
    console.warn(
      `GEDCOM import: ${repairedLines} continuation line(s) repaired, ${unrepairedLines} unrecognized line(s) retained. Examples at line(s): ${affectedLines.join(', ')}`,
    );
  }

  return {
    text: repairedLines ? result.join('\\n') : input,
    repairedLines,
    unrepairedLines,
    affectedLines,
  };
}

/** Compatibility function for callers that only need the repaired text. */
export function repairGedcomTextLines(input: string): string {
  return repairGedcomTextLinesWithReport(input).text;
}
