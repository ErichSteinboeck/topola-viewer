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

/**
 * SVG bounds of actual known ancestor sectors. Empty ancestor positions do
 * not affect "Fit", but their original pedigree angles remain unchanged.
 */
export function fanVisibleBounds(
  nodes: FanAncestor[],
  startRadius: number,
  ringSize: number,
  startAngle: number,
  totalAngle: number,
  margin = 40,
) {
  let minX = -startRadius;
  let maxX = startRadius;
  let minY = -startRadius;
  let maxY = startRadius;
  const anglesAtExtrema = [-270, -180, -90, 0, 90, 180, 270];
  for (const node of nodes) {
    if (!node.person || node.generation === 0) continue;
    const count = 2 ** node.generation;
    const from = startAngle + (node.index * totalAngle) / count;
    const to = startAngle + ((node.index + 1) * totalAngle) / count;
    const radius = startRadius + node.generation * ringSize;
    const angles = [
      from,
      to,
      ...anglesAtExtrema.filter((a) => a > from && a < to),
    ];
    for (const degrees of angles) {
      const theta = ((degrees - 90) * Math.PI) / 180;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    width: Math.ceil(maxX - minX + 2 * margin),
    height: Math.ceil(maxY - minY + 2 * margin),
    centerX: margin - minX,
    centerY: margin - minY,
  };
}
