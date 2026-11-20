import {select} from 'd3-selection';
import {zoom as d3Zoom, ZoomBehavior, zoomIdentity} from 'd3-zoom';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {IndiInfo, JsonGedcomData, JsonIndi} from 'topola';
import {GedcomData} from '../util/gedcom_util';
import {associatedEventLines} from './hover_helpers';
import {ChartColors, ClickAction, Ids} from '../sidepanel/config/config';
import {formatDateOrRange} from '../util/date_util';
import {buildAncestorFan, fanSectorPath} from './ancestor_fan_data';

interface Props {
  data: JsonGedcomData;
  gedcom?: GedcomData;
  selection: IndiInfo;
  selectedPersonId?: string;
  colors?: ChartColors;
  hideIds?: Ids;
  clickAction?: ClickAction;
  onSelection: (info: IndiInfo) => void;
  onDetailSelection: (info: IndiInfo) => void;
  onFirstRender?: () => void;
}

const START_RADIUS = 78;
const RING_SIZE = 105;
const MAX_GENERATIONS = 7;
const FAN_ANGLE = 240;
const FAN_START = -FAN_ANGLE / 2;

function personName(person: JsonIndi): string {
  return (
    [person.firstName, person.lastName].filter(Boolean).join(' ') || person.id
  );
}

function personFill(
  person: JsonIndi | undefined,
  generation: number,
  colors?: ChartColors,
): string {
  if (!person) return '#f1f1f1';
  if (colors === ChartColors.NO_COLOR) return '#f9f7f2';
  if (colors === ChartColors.COLOR_BY_SEX) {
    return person.sex === 'F'
      ? '#f4dce1'
      : person.sex === 'M'
        ? '#dbe8f4'
        : '#ece7da';
  }
  const palette = [
    '#f5e8ca',
    '#f8e0bb',
    '#e6eacf',
    '#dbe8ef',
    '#f2dfe5',
    '#eadff2',
    '#e8ede0',
    '#e1e8f4',
  ];
  return palette[generation % palette.length];
}

/** A 270-degree ancestor fan, open at the bottom. Each sector is one ancestor *position*,
 * so pedigree collapse remains visible and unknown parents retain their slots. */
export function AncestorFanChart(props: Props) {
  const intl = useIntl();
  const notified = useRef(false);
  useEffect(() => {
    if (!notified.current) {
      notified.current = true;
      props.onFirstRender?.();
    }
  }, [props.onFirstRender]);
  const [generations, setGenerations] = useState(5);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const [hoveredId, setHoveredId] = useState<string>();
  const familyById = useMemo(
    () => new Map(props.data.fams.map((fam) => [fam.id, fam])),
    [props.data.fams],
  );
  const ancestors = useMemo(
    () => buildAncestorFan(props.data, props.selection.id, generations),
    [props.data, props.selection.id, generations],
  );
  const radius = START_RADIUS + generations * RING_SIZE;
  const size = 2 * (radius + 48);
  const center = size / 2;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const behavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        const chart = svg.querySelector('#chart');
        if (!chart) return;
        const {x, y, k} = event.transform;
        chart.setAttribute(
          'transform',
          `translate(${x} ${y}) scale(${k}) translate(${center} ${center})`,
        );
      });
    zoomBehavior.current = behavior;
    select(svg).call(behavior);
    return () => {
      select(svg).on('.zoom', null);
      zoomBehavior.current = null;
    };
  }, [center]);

  const changeZoom = (factor: number) => {
    if (svgRef.current && zoomBehavior.current) {
      select(svgRef.current).call(zoomBehavior.current.scaleBy, factor);
    }
  };
  const resetZoom = () => {
    if (svgRef.current && zoomBehavior.current) {
      select(svgRef.current).call(zoomBehavior.current.transform, zoomIdentity);
    }
  };

  const describePerson = (person: JsonIndi, generation: number) =>
    [
      labels(person),
      [intl.formatMessage({id: 'fan.birth', defaultMessage: 'Birth'}),
       formatDateOrRange(person.birth, intl), person.birth?.place].filter(Boolean).join(' · '),
      ...associatedEventLines(props.gedcom, person.id, 'birth', intl),
      [intl.formatMessage({id: 'fan.death', defaultMessage: 'Death'}),
       formatDateOrRange(person.death, intl), person.death?.place].filter(Boolean).join(' · '),
      ...associatedEventLines(props.gedcom, person.id, 'death', intl),
      `${intl.formatMessage({id: 'fan.generation', defaultMessage: 'Generation'})} ${generation}`,
    ].filter(Boolean).join('\n');

  const labels = (person: JsonIndi) => {
    const text = personName(person);
    return props.hideIds === Ids.SHOW ? `${text} (${person.id})` : text;
  };

  const handleClick = (
    event: React.MouseEvent<SVGElement>,
    person: JsonIndi,
  ) => {
    const info = {id: person.id, generation: 0};
    const focusOnClick = props.clickAction === ClickAction.FOCUS;
    if (event.shiftKey === focusOnClick) props.onDetailSelection(info);
    else props.onSelection(info);
  };

  const sector = (node: (typeof ancestors)[number]) => {
    const {generation, index, person} = node;
    if (generation === 0) return null;
    const count = 2 ** generation;
    const start = FAN_START + (index * FAN_ANGLE) / count;
    const end = FAN_START + ((index + 1) * FAN_ANGLE) / count;
    const middle = (start + end) / 2;
    const inner = START_RADIUS + (generation - 1) * RING_SIZE;
    const outer = inner + RING_SIZE - 2;
    const angle = ((middle - 90) * Math.PI) / 180;
    const textRadius = inner + RING_SIZE * 0.5;
    const x = textRadius * Math.cos(angle);
    const y = textRadius * Math.sin(angle);
    const isSelected =
      person?.id === (props.selectedPersonId || props.selection.id);
    const emphasized = isSelected || (!!person && person.id === hoveredId);
    const maxChars = generation > 4 ? 14 : 26;
    const name = person ? labels(person) : '';
    const shortName =
      name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
    // Tangential labels: turned 90 degrees relative to the first prototype.
    // Turn outer lower sectors upright rather than displaying upside-down text.
    const rotation = generation >= 5
      ? middle - 90 + (middle < 0 ? 180 : 0)
      : middle;
    const born = person?.birth?.date?.year;
    const died = person?.death?.date?.year;
    const life = [born ?? '?', died ?? '?'].join('–');
    const fullBirth = person ? formatDateOrRange(person.birth, intl) : '';
    const fullDeath = person ? formatDateOrRange(person.death, intl) : '';
    const birthPlace = person?.birth?.place || '';
    const short = (value: string, limit: number) =>
      value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
    const lines = generation <= 3
      ? [
          fullBirth ? `* ${fullBirth}` : '',
          fullDeath ? `† ${fullDeath}` : '',
          birthPlace ? short(birthPlace, 26) : '',
        ].filter(Boolean)
      : [life];
    return (
      <g
        key={`${generation}-${index}`}
        className={person ? 'fan-ancestor' : 'fan-missing'}
        onClick={person ? (event) => handleClick(event, person) : undefined}
        onMouseEnter={() => setHoveredId(person?.id)}
        onMouseLeave={() => setHoveredId(undefined)}
        style={{cursor: person ? 'pointer' : 'default'}}
      >
        <path
          d={fanSectorPath(inner, outer, start, end)}
          fill={personFill(person, generation, props.colors)}
          stroke={emphasized ? '#d18a13' : '#a7a7a7'}
          strokeWidth={emphasized ? 3.5 : 0.85}
        />
        {person && (
          <text
            x={x}
            y={y}
            fontFamily="Arial, sans-serif"
            fontSize={generation > 5 ? 9 : generation > 3 ? 11 : 13}
            fontWeight={emphasized ? 700 : 500}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${rotation} ${x} ${y})`}
            pointerEvents="none"
          >
            <tspan x={x} dy={-lines.length * 6}>
              {shortName}
            </tspan>
            {lines.map((line, lineIndex) => (
              <tspan
                key={lineIndex}
                x={x}
                dy={generation <= 3 ? 13 : 16}
                fontSize={generation <= 3 ? 9 : 10}
                fontWeight="normal"
              >
                {line}
              </tspan>
            ))}
          </text>
        )}
        {person && <title>{describePerson(person, generation)}</title>}
      </g>
    );
  };

  // Marriage belongs to the family in which the two adjacent sectors
  // are parents. The marker sits exactly on the boundary between partners.
  const marriageMarkers = ancestors
    .filter((node) => node.generation > 0 && node.index % 2 === 0)
    .flatMap((node) => {
      const childIndex = node.index / 2;
      const child = ancestors.find(
        (ancestor) =>
          ancestor.generation === node.generation - 1 &&
          ancestor.index === childIndex,
      )?.person;
      const family = child?.famc ? familyById.get(child.famc) : undefined;
      const marriage = family?.marriage;
      if (!marriage) return [];
      const count = 2 ** node.generation;
      const boundary = FAN_START + ((node.index + 1) * FAN_ANGLE) / count;
      const angle = ((boundary - 90) * Math.PI) / 180;
      const r = START_RADIUS + (node.generation - 0.5) * RING_SIZE;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      const text = [
        intl.formatMessage({id: 'fan.marriage', defaultMessage: 'Marriage'}),
        formatDateOrRange(marriage, intl),
        marriage.place,
      ].filter(Boolean).join('\n');
      return [{
        key: `${node.generation}-${node.index}`,
        x, y, text,
      }];
    });

  const root = ancestors[0].person;
  return (
    <div id="svgContainer" className="ancestor-fan-container">
      <div className="ancestor-fan-controls">
        <label htmlFor="fanGenerations">
          {intl.formatMessage({
            id: 'fan.generations',
            defaultMessage: 'Ancestor generations',
          })}
        </label>
        <select
          id="fanGenerations"
          value={generations}
          onChange={(e) => setGenerations(Number(e.target.value))}
        >
          {Array.from(
            {length: MAX_GENERATIONS - 2},
            (_, index) => index + 3,
          ).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button onClick={resetZoom}>
          {intl.formatMessage({id: 'fan.reset_zoom', defaultMessage: 'Fit'})}
        </button>
      </div>
      <div className="zoom ancestor-fan-zoom">
        <button className="zoom-in" aria-label="Zoom in" onClick={() => changeZoom(1.3)}>
          +
        </button>
        <button className="zoom-out" aria-label="Zoom out" onClick={() => changeZoom(1 / 1.3)}>
          −
        </button>
      </div>
      <svg
        ref={svgRef}
        id="chartSvg"
        className="ancestor-fan-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={intl.formatMessage({
          id: 'fan.title',
          defaultMessage: 'Circular ancestor fan chart',
        })}
        style={{width: '100%', height: 'auto', maxWidth: 'none'}}
      >
        <g id="chart" transform={`translate(${center} ${center})`}>
          {ancestors.slice(1).map(sector)}
          {marriageMarkers.map((marker) => (
            <g key={marker.key} className="fan-marriage" transform={`translate(${marker.x} ${marker.y})`}>
              <circle r={8} fill="white" fillOpacity={0.92} stroke="#805f39" strokeWidth={1.2}/>
              <path d="M -4 0 L 0 -4 L 4 0 L 0 4 Z" fill="#bb7930" />
              <title>{marker.text}</title>
            </g>
          ))}
          <g
            className="fan-root"
            onClick={root ? (e) => handleClick(e, root) : undefined}
            style={{cursor: root ? 'pointer' : 'default'}}
          >
            <circle
              r={START_RADIUS - 4}
              fill={personFill(root, 0, props.colors)}
              stroke={root?.id === props.selectedPersonId ? '#d18a13' : '#666'}
              strokeWidth={root?.id === props.selectedPersonId ? 4 : 1.5}
            />
            {root && (
              <>
                <text
                  textAnchor="middle"
                  y="-8"
                  fontWeight="bold"
                  fontSize="14"
                  pointerEvents="none"
                >
                  {personName(root).slice(0, 22)}
                </text>
                <text
                  textAnchor="middle"
                  y="14"
                  fontSize="11"
                  pointerEvents="none"
                >
                  {formatDateOrRange(root.birth, intl)}
                </text>
                <title>{describePerson(root, 0)}</title>
              </>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
