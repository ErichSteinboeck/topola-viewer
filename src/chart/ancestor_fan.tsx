import {select} from 'd3-selection';
import {zoom as d3Zoom, ZoomBehavior, zoomIdentity} from 'd3-zoom';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {IndiInfo, JsonGedcomData, JsonIndi} from 'topola';
import {ChartColors, ClickAction, Ids} from '../sidepanel/config/config';
import {formatDateOrRange} from '../util/date_util';
import {GedcomData} from '../util/gedcom_util';
import {
  buildAncestorFan,
  fanSectorPath,
  fanVisibleBounds,
} from './ancestor_fan_data';
import {ancestorNameLines} from './ancestor_fan_labels';
import {associatedEventLines, placesMatch} from './hover_helpers';

interface Props {
  data: JsonGedcomData;
  gedcom?: GedcomData;
  highlightMatchingPlaces?: boolean;
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
const MAX_GENERATIONS = 12;
const FAN_ANGLE = 240;
const FAN_START = -FAN_ANGLE / 2;
interface FanPopup {
  heading: string;
  rows: Array<{label: string; value: string}>;
  x: number;
  y: number;
}

/** Compact dates on the wheel; the native tooltip retains full dates. */
function shortMonthDate(value: string, locale: string): string {
  if (!value) return value;
  for (let month = 0; month < 12; month++) {
    const date = new Date(2020, month, 15);
    const full = new Intl.DateTimeFormat(locale, {month: 'long'}).format(date);
    const short = new Intl.DateTimeFormat(locale, {month: 'short'}).format(
      date,
    );
    if (full !== short) {
      value = value.replace(new RegExp(`\\b${full}\\b`, 'gu'), short);
    }
  }
  return value;
}

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
  if (!person) return '#fff';
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

/** An open ancestor fan, with a 120-degree gap at the bottom. Each sector is one ancestor *position*,
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
  const [hoveredPlace, setHoveredPlace] = useState<string>();
  const [popup, setPopup] = useState<FanPopup>();
  const clearHover = () => {
    setHoveredPlace(undefined);
    setPopup(undefined);
  };
  const movePopup = (event: React.MouseEvent<SVGElement>) => {
    // Move without remeasuring or repainting the chart's sectors.
    setPopup((current) =>
      current ? {...current, x: event.clientX, y: event.clientY} : current,
    );
  };
  const personPopup = (
    person: JsonIndi,
    event: React.MouseEvent<SVGElement>,
  ) => {
    const rows = [
      {
        label: intl.formatMessage({id: 'fan.birth', defaultMessage: 'Birth'}),
        value: [formatDateOrRange(person.birth, intl), person.birth?.place]
          .filter(Boolean)
          .join(' · '),
      },
      ...associatedEventLines(props.gedcom, person.id, 'birth', intl).map(
        (value) => ({label: '', value}),
      ),
      {
        label: intl.formatMessage({id: 'fan.death', defaultMessage: 'Death'}),
        value: [formatDateOrRange(person.death, intl), person.death?.place]
          .filter(Boolean)
          .join(' · '),
      },
      ...associatedEventLines(props.gedcom, person.id, 'death', intl).map(
        (value) => ({label: '', value}),
      ),
    ].filter((row) => !!row.value);
    setPopup({
      heading: personName(person),
      rows,
      x: event.clientX,
      y: event.clientY,
    });
  };
  useEffect(
    () => setHoveredPlace(undefined),
    [props.selection.id, generations],
  );
  const familyById = useMemo(
    () => new Map(props.data.fams.map((fam) => [fam.id, fam])),
    [props.data.fams],
  );
  const ancestors = useMemo(
    () => buildAncestorFan(props.data, props.selection.id, generations),
    [props.data, props.selection.id, generations],
  );
  const {width, height, centerX, centerY} = useMemo(
    () =>
      fanVisibleBounds(
        ancestors,
        START_RADIUS,
        RING_SIZE,
        FAN_START,
        FAN_ANGLE,
      ),
    [ancestors],
  );
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
          `translate(${x} ${y}) scale(${k}) translate(${centerX} ${centerY})`,
        );
      });
    zoomBehavior.current = behavior;
    select(svg).call(behavior);
    // Refit when the generation count or selected root changes.
    select(svg).call(behavior.transform, zoomIdentity);
    return () => {
      select(svg).on('.zoom', null);
      zoomBehavior.current = null;
    };
  }, [centerX, centerY]);

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
    if (generation === 0 || !person) return null;
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
      person.id === (props.selectedPersonId || props.selection.id);
    const maxChars = generation >= 7 ? 13 : generation >= 5 ? 18 : 28;
    const nameLines = ancestorNameLines(
      person.firstName,
      person.lastName,
      maxChars,
      generation <= 3,
    );
    if (props.hideIds === Ids.SHOW) nameLines.push(person.id);
    // Tangential labels: turned 90 degrees relative to the first prototype.
    // Turn outer lower sectors upright rather than displaying upside-down text.
    const rotation =
      generation >= 5 ? middle - 90 + (middle < 0 ? 180 : 0) : middle;
    const born = person?.birth?.date?.year;
    const died = person?.death?.date?.year;
    // Each outer life year gets its own hover target (birth versus death).
    const fullBirth = person
      ? shortMonthDate(formatDateOrRange(person.birth, intl), intl.locale)
      : '';
    const fullDeath = person
      ? shortMonthDate(formatDateOrRange(person.death, intl), intl.locale)
      : '';
    const birthPlace = person?.birth?.place || '';
    const short = (value: string, limit: number) =>
      value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
    const deathPlace = person?.death?.place || '';
    type DetailLine = {
      value: string;
      kind: 'birth' | 'death';
      date: string;
      place: string;
    };
    const compactLine = (
      kind: 'birth' | 'death',
      date: string,
      place: string,
      year?: number,
    ): DetailLine | undefined => {
      const prefix = kind === 'birth' ? '*' : '†';
      const shownDate = generation <= 3 ? date : year ? String(year) : '';
      if (!shownDate && !place) return undefined;
      // Inner rings show a complete event on one line; outer rings retain
      // short years so their text remains legible in narrow sectors.
      const placeLimit =
        generation <= 2
          ? 23
          : generation === 3
            ? 17
            : generation === 4
              ? 16
              : generation === 5
                ? 13
                : generation === 6
                  ? 11
                  : 9;
      const shownPlace = place ? short(place, placeLimit) : '';
      return {
        kind,
        date: shownDate ? `${prefix} ${shownDate}` : '',
        place: shownPlace,
        value: [shownDate ? `${prefix} ${shownDate}` : '', shownPlace]
          .filter(Boolean)
          .join(' · '),
      };
    };
    const lines = [
      compactLine('birth', fullBirth, birthPlace, born),
      compactLine('death', fullDeath, deathPlace, died),
    ].filter((line): line is DetailLine => !!line);
    const spacing = generation <= 3 ? 15 : 13;
    const fontSize = generation > 6 ? 9 : generation > 4 ? 10 : 12;
    const totalLines = nameLines.length + lines.length;
    const startY = -((totalLines - 1) * spacing) / 2;
    const matchingPlace =
      !!hoveredPlace &&
      props.highlightMatchingPlaces !== false &&
      [birthPlace, deathPlace].some(
        (place) => !!place && placesMatch(place, hoveredPlace),
      );
    return (
      <g
        key={`${generation}-${index}`}
        className={[
          'fan-ancestor',
          isSelected ? 'fan-selected' : '',
          matchingPlace ? 'fan-related-place' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => handleClick(event, person)}
        onMouseEnter={(event) => personPopup(person, event)}
        onMouseMove={movePopup}
        onMouseLeave={clearHover}
        style={{cursor: 'pointer'}}
      >
        <path
          d={fanSectorPath(inner, outer, start, end)}
          fill={personFill(person, generation, props.colors)}
          stroke={isSelected ? '#718699' : '#a7a7a7'}
          strokeWidth={isSelected ? 2 : 0.85}
        />
        <g
          transform={`translate(${x} ${y}) rotate(${rotation})`}
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {nameLines.map((part, i) => (
            <text
              key={i}
              y={startY + i * spacing}
              fontSize={fontSize}
              fontWeight={isSelected ? 700 : 600}
            >
              {part}
            </text>
          ))}
          {lines.map((line, lineIndex) => {
            const fullPlace = line.kind === 'birth' ? birthPlace : deathPlace;
            const isPlaceMatch =
              !!line.place &&
              !!hoveredPlace &&
              props.highlightMatchingPlaces !== false &&
              placesMatch(fullPlace, hoveredPlace);
            return (
              <text
                key={line.kind}
                y={startY + (nameLines.length + lineIndex) * spacing}
                fontSize={generation <= 3 ? 10.5 : 9.5}
                fontWeight="normal"
              >
                <tspan>{line.date}</tspan>
                {!!line.place && (
                  <tspan
                    className={isPlaceMatch ? 'fan-place-match' : undefined}
                    onMouseEnter={() => {
                      if (props.highlightMatchingPlaces !== false) {
                        setHoveredPlace(fullPlace);
                      }
                    }}
                    onMouseLeave={() => setHoveredPlace(undefined)}
                    style={{cursor: 'crosshair'}}
                  >
                    {line.date ? ' · ' : ''}
                    {line.place}
                  </tspan>
                )}
              </text>
            );
          })}
        </g>
      </g>
    );
  };

  // Marriage markers are derived directly from known children. This avoids
  // searching thousands of empty ancestor positions at high depth.
  const marriageMarkers = ancestors
    .filter((node) => node.person && node.generation < generations)
    .flatMap((childNode) => {
      const child = childNode.person;
      const family = child?.famc ? familyById.get(child.famc) : undefined;
      const marriage = family?.marriage;
      if (!marriage) return [];
      const parentGeneration = childNode.generation + 1;
      const count = 2 ** parentGeneration;
      const boundary =
        FAN_START + ((2 * childNode.index + 1) * FAN_ANGLE) / count;
      const angle = ((boundary - 90) * Math.PI) / 180;
      const r = START_RADIUS + (parentGeneration - 0.5) * RING_SIZE;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      const text = [formatDateOrRange(marriage, intl), marriage.place]
        .filter(Boolean)
        .join(' · ');
      return [
        {
          key: `${parentGeneration}-${childNode.index}`,
          x,
          y,
          text,
        },
      ];
    });

  const root = ancestors[0].person;
  const rootNameLines = root
    ? ancestorNameLines(root.firstName, root.lastName, 21, true)
    : [];
  return (
    <div id="svgContainer" className="ancestor-fan-container">
      <div className="ancestor-fan-controls">
        <label htmlFor="fanGenerations">
          {intl.formatMessage({
            id: 'fan.generations',
            defaultMessage: 'Ancestor generations',
          })}
        </label>
        <input
          id="fanGenerations"
          type="number"
          min={1}
          max={MAX_GENERATIONS}
          step={1}
          value={generations}
          aria-label={intl.formatMessage({
            id: 'fan.generations',
            defaultMessage: 'Ancestor generations',
          })}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isInteger(value) && value >= 1) {
              setGenerations(Math.min(MAX_GENERATIONS, value));
            }
          }}
        />
        <button onClick={resetZoom}>
          {intl.formatMessage({id: 'fan.reset_zoom', defaultMessage: 'Fit'})}
        </button>
      </div>
      <div className="zoom ancestor-fan-zoom">
        <button
          className="zoom-in"
          aria-label="Zoom in"
          onClick={() => changeZoom(1.3)}
        >
          +
        </button>
        <button
          className="zoom-out"
          aria-label="Zoom out"
          onClick={() => changeZoom(1 / 1.3)}
        >
          −
        </button>
      </div>
      <svg
        ref={svgRef}
        id="chartSvg"
        className="ancestor-fan-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        data-center-x={centerX}
        data-center-y={centerY}
        role="img"
        aria-label={intl.formatMessage({
          id: 'fan.title',
          defaultMessage: 'Circular ancestor fan chart',
        })}
        style={{width: '100%', height: '100%', maxWidth: 'none'}}
        onMouseLeave={clearHover}
        onPointerCancel={clearHover}
        onPointerDown={clearHover}
      >
        <g id="chart" transform={`translate(${centerX} ${centerY})`}>
          {ancestors
            .filter((node) => node.person && node.generation > 0)
            .map(sector)}
          {marriageMarkers.map((marker) => (
            <g
              key={marker.key}
              className="fan-marriage"
              transform={`translate(${marker.x} ${marker.y})`}
              onMouseEnter={(event) => {
                setHoveredPlace(undefined);
                setPopup({
                  heading: intl.formatMessage({
                    id: 'fan.marriage',
                    defaultMessage: 'Marriage',
                  }),
                  rows: [{label: '', value: marker.text}],
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onMouseMove={movePopup}
              onMouseLeave={() => setPopup(undefined)}
            >
              <circle
                r={8}
                fill="white"
                fillOpacity={0.92}
                stroke="#805f39"
                strokeWidth={1.2}
              />
              <path d="M -4 0 L 0 -4 L 4 0 L 0 4 Z" fill="#bb7930" />
            </g>
          ))}
          <g
            className="fan-root"
            onClick={root ? (e) => handleClick(e, root) : undefined}
            onMouseEnter={
              root ? (event) => personPopup(root, event) : undefined
            }
            onMouseMove={movePopup}
            onMouseLeave={clearHover}
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
                  y={rootNameLines.length > 1 ? -20 : -8}
                  fontWeight="bold"
                  fontSize="13"
                  pointerEvents="none"
                >
                  {rootNameLines.map((namePart, i) => (
                    <tspan key={i} x="0" dy={i === 0 ? 0 : 14}>
                      {namePart}
                    </tspan>
                  ))}
                </text>
                <text
                  textAnchor="middle"
                  y={rootNameLines.length > 1 ? 21 : 14}
                  fontSize="11"
                  pointerEvents="none"
                >
                  {formatDateOrRange(root.birth, intl)}
                </text>
              </>
            )}
          </g>
        </g>
      </svg>
      {popup && (
        <div
          className="ancestor-fan-popup"
          role="tooltip"
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(popup.x + 14, window.innerWidth - 350)),
            top: Math.max(8, Math.min(popup.y + 14, window.innerHeight - 220)),
            pointerEvents: 'none',
          }}
        >
          <strong>{popup.heading}</strong>
          {popup.rows.map((row, index) => (
            <div className="ancestor-fan-popup-row" key={index}>
              {row.label && <b>{row.label}:</b>} {row.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
