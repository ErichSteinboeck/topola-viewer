import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'fs';
import {parse as parseGedcom} from 'parse-gedcom';
import {gedcomEntriesToJson} from 'topola';
import {
  buildAncestorFan,
  fanSectorPath,
  fanVisibleBounds,
} from './ancestor_fan_data';

describe('buildAncestorFan', () => {
  const chart = gedcomEntriesToJson(
    parseGedcom(readFileSync('public/examples/wienfluss-huber.ged', 'utf8')),
  );

  it('places mother and father in distinct slots from the Huber sample', () => {
    const tree = buildAncestorFan(chart, 'I500003', 3);
    expect(tree).toHaveLength(15);
    expect(tree[0].id).toBe('I500003');
    expect(tree[1].id).toBe('I500001');
    expect(tree[2].id).toBe('I500002');
    expect(tree.slice(3).every((node) => !node.id)).toBe(true);
    expect(tree[3].generation).toBe(2);
    expect(tree[7].generation).toBe(3);
  });

  it('keeps empty positions for unknown ancestors', () => {
    const tree = buildAncestorFan(chart, 'I500001', 2);
    expect(tree).toHaveLength(7);
    expect(tree.slice(1).every((node) => node.person === undefined)).toBe(true);
  });
});

describe('fanVisibleBounds', () => {
  it('ignores outer generations with no known ancestors', () => {
    const chart = gedcomEntriesToJson(
      parseGedcom(readFileSync('public/examples/wienfluss-huber.ged', 'utf8')),
    );
    const boundsForThree = fanVisibleBounds(
      buildAncestorFan(chart, 'I500003', 3),
      78,
      105,
      -120,
      240,
    );
    const boundsForNine = fanVisibleBounds(
      buildAncestorFan(chart, 'I500003', 9),
      78,
      105,
      -120,
      240,
    );
    expect(boundsForNine).toEqual(boundsForThree);
  });
});

describe('fanSectorPath', () => {
  it('constructs a closed SVG ring segment', () => {
    const path = fanSectorPath(80, 180, 0, 45);
    expect(path.startsWith('M ')).toBe(true);
    expect(path).toContain('A 180 180');
    expect(path).toContain('A 80 80');
    expect(path.endsWith(' Z')).toBe(true);
  });
});
