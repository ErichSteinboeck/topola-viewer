import {describe, expect, it} from '@jest/globals';
import {ancestorNameLines} from './ancestor_fan_labels';

describe('ancestorNameLines', () => {
  it('keeps full names when they fit', () => {
    expect(ancestorNameLines('Franz', 'Wagner', 25, false)).toEqual(['Franz Wagner']);
  });
  it('abbreviates given names before shortening family names', () => {
    expect(ancestorNameLines('Franz Joseph', 'Halmenschlager', 22, false))
      .toEqual(['F. J. Halmenschlager']);
  });
  it('breaks long names into two lines in spacious sectors', () => {
    expect(ancestorNameLines('Reinhold', 'Halmenschlager', 18, true))
      .toEqual(['Reinhold', 'Halmenschlager']);
  });
  it('uses surname and initials when a given name is very long', () => {
    expect(ancestorNameLines('Theresia Margaretha Caroline', 'Falk', 16, true))
      .toEqual(['T. M. C. Falk']);
  });
});
