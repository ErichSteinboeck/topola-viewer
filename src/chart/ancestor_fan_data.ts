import {JsonGedcomData, JsonIndi} from 'topola';

export interface FanAncestor {
  /** Ring 0 is the selected person, rings 1+ are ancestors. */
  generation: number;
  index: number;
  id?: string;
  person?: JsonIndi;
}

/**
 * Ancestor-only pedigree, ordered father first and mother second.
 * Unknown people retain their sectors. Repeated ancestors deliberately
 * appear in each ancestral position (pedigree collapse).
 */
export function buildAncestorFan(
  data: JsonGedcomData,
  rootId: string,
  generations: number,
): FanAncestor[] {
  const people = new Map(data.indis.map((person) => [person.id, person]));
  const families = new Map(data.fams.map((family) => [family.id, family]));
  const root = people.get(rootId);
  const output: FanAncestor[] = [
    {generation: 0, index: 0, id: root?.id, person: root},
  ];
  let previous: Array<string | undefined> = [root?.id];

  for (let generation = 1; generation <= generations; generation++) {
    const current: Array<string | undefined> = [];
    for (const personId of previous) {
      const person = personId ? people.get(personId) : undefined;
      const family = person?.famc ? families.get(person.famc) : undefined;
      current.push(family?.husb, family?.wife);
    }
    current.forEach((id, index) => {
      output.push({
        generation,
        index,
        id,
        person: id ? people.get(id) : undefined,
      });
    });
    previous = current;
  }
  return output;
}

/** SVG annular sector, angles in degrees with 0 at the top. */
export function fanSectorPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const point = (radius: number, degrees: number) => {
    const angle = ((degrees - 90) * Math.PI) / 180;
    return [
      +(radius * Math.cos(angle)).toFixed(3),
      +(radius * Math.sin(angle)).toFixed(3),
    ];
  };
  const [outerStartX, outerStartY] = point(outerRadius, startAngle);
  const [outerEndX, outerEndY] = point(outerRadius, endAngle);
  const [innerStartX, innerStartY] = point(innerRadius, startAngle);
  const [innerEndX, innerEndY] = point(innerRadius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    'Z',
  ].join(' ');
}
