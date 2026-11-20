import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'fs';
import {parse as parseGedcom} from 'parse-gedcom';
import {repairGedcomTextLines} from './gedcom_repair';
import {getData} from './gedcom_util';

describe('repairGedcomTextLines', () => {
  it('leaves a valid GEDCOM unchanged, including explicit CONC and CONT', () => {
    const input =
      '0 @I1@ INDI\r\n1 NOTE Line 1\r\n2 CONC and more\r\n2 CONT second line\r\n0 TRLR';
    expect(repairGedcomTextLines(input)).toBe(input);
  });

  it('repairs an untagged MyHeritage HTML paragraph without adding spaces', () => {
    const input = [
      '0 @I1@ INDI',
      '1 DEAT',
      '2 NOTE <p>First</p>',
      '<p>ANNO https://anno.onb.at/?seite=',
      '3 CONC 11<br />end</p>',
      '0 TRLR',
    ].join('\n');
    const repaired = repairGedcomTextLines(input);
    expect(repaired).toContain('3 CONC <p>ANNO https://anno.onb.at/?seite=');
    const parsed = parseGedcom(repaired);
    const note = parsed[0].tree[0].tree[0];
    expect(getData(note).join('\n')).toBe(
      '<p>First</p><p>ANNO https://anno.onb.at/?seite=11<br />end</p>',
    );
  });

  it('repairs an orphan line after a physical empty line and preserves HTML', () => {
    const input = [
      '0 @I1@ INDI',
      '1 NOTE <p>First</p>',
      '',
      '<p>Second</p>',
      '0 TRLR',
    ].join('\n');
    const output = repairGedcomTextLines(input);
    expect(output).toContain('2 CONC <p>Second</p>');
    expect(output).not.toContain('2 CONT');
  });

  it('repairs text that begins with a year rather than interpreting 1855 as a level', () => {
    const input = '0 @I1@ INDI\n1 NOTE First\n1855 H\n0 TRLR';
    expect(repairGedcomTextLines(input)).toContain('2 CONC 1855 H');
  });

  it('does not fabricate continuations outside text records', () => {
    const input = '0 @I1@ INDI\n1 NAME Karl /Huber/\naccidental line\n0 TRLR';
    expect(repairGedcomTextLines(input)).toBe(input);
  });

  it('does not attach text following the next sibling or person to the prior note', () => {
    const input =
      '0 @I1@ INDI\n1 NOTE first\n1 BIRT\n2 DATE 1900\n2 PLAC Vienna\n0 @I2@ INDI\n1 NAME X /Y/';
    expect(repairGedcomTextLines(input)).toBe(input);
  });

  it('does not add spaces to words or HTML entities broken across lines', () => {
    const input = '0 @I1@ INDI\n1 NOTE <p>Altersschw&au\nml;che</p>\n0 TRLR';
    const note = parseGedcom(repairGedcomTextLines(input))[0].tree[0];
    expect(getData(note)).toEqual(['<p>Altersschw&auml;che</p>']);
  });
});

describe('bundled Huber GEDCOM', () => {
  it('preserves the ANNO paragraph and split URL in the death note', () => {
    const input = readFileSync('public/examples/wienfluss-huber.ged', 'utf8');
    const entries = parseGedcom(repairGedcomTextLines(input));
    const person = entries.find(
      (entry) => entry.tag === 'INDI' && entry.pointer === '@I500001@',
    );
    expect(person).toBeDefined();
    const death = person?.tree.find((entry) => entry.tag === 'DEAT');
    const notes = death?.tree.filter((entry) => entry.tag === 'NOTE') || [];
    const combined = notes.map((note) => getData(note).join('\n')).join('\n');
    expect(combined).toContain('<p>ANNO<br />');
    expect(combined).toContain('seit' + 'e=11<br />25. M&auml;rz 1855');
  });
});
