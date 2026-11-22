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
import {EventPopup, EventPopupData} from './event_popup';
import {
  associatedEventDetails,
  eventNoteHtml,
  placesMatch,
} from './hover_helpers';

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
  if (colors === ChartColors.NO_COLOR) return '#fff';
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
  const [popup, setPopup] = useState<EventPopupData>();
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelDismiss = () => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = null;
  };
  const dismissPopupSoon = () => {
    cancelDismiss();
    dismissRef.current = setTimeout(() => setPopup(undefined), 250);
  };
  const clearHover = () => {
    setHoveredPlace(undefined);
    dismissPopupSoon();
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
    kind: 'birth' | 'death',
  ) => {
    cancelDismiss();
    const gedcomTags =
      kind === 'birth' ? ['BIRT', 'CHR', 'BAPM'] : ['DEAT', 'BURI', 'CREM'];
    const rows = [
      {
        label: intl.formatMessage({
          id: kind === 'birth' ? 'fan.birth' : 'fan.death',
          defaultMessage: kind === 'birth' ? 'Birth' : 'Death',
        }),
        value: [formatDateOrRange(person[kind], intl), person[kind]?.place]
          .filter(Boolean)
          .join(' · '),
      },
      ...associatedEventDetails(props.gedcom, person.id, kind, intl),
    ].filter((row) => !!row.value);
    setPopup({
      heading: personName(person),
      rows,
      notes: eventNoteHtml(
        props.gedcom,
        props.gedcom?.indis[person.id],
        gedcomTags,
      ),
      x: event.clientX,
      y: event.clientY,
    });
  };
  useEffect(
    () => setHoveredPlace(undefined),
    [props.selection.id, generations],
  );
  const personById = useMemo(
    () => new Map(props.data.indis.map((person) => [person.id, person])),
    [props.data.indis],
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
    if (event.shiftKey === focusOnClick) props.onSelection(info);
    else props.onDetailSelection(info);
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
    const isCurved = generation <= 4;
    // Keep the same font size within a generation, including long names.
    // Wrap names rather than compressing individual glyphs.
    const fontSize = generation <= 2 ? 12 : generation <= 4 ? 11 : 9;
    const dateFontSize = generation <= 2 ? 10.5 : generation <= 4 ? 10 : 9;
    const arcWidth = (textRadius * (end - start) * Math.PI) / 180;
    const textWidth = isCurved ? Math.max(12, arcWidth - 8) : RING_SIZE - 12;
    const charLimit = Math.max(4, Math.floor(textWidth / (fontSize * 0.55)));
    const nameLines = ancestorNameLines(
      person.firstName,
      person.lastName,
      Math.min(16, charLimit),
      true,
    );
    const clip = (value: string, limit: number) =>
      value.length > limit
        ? value.slice(0, Math.max(1, limit - 1)) + '…'
        : value;
    const born = person.birth?.date?.year;
    const died = person.death?.date?.year;
    const birthDate = shortMonthDate(
      formatDateOrRange(person.birth, intl),
      intl.locale,
    );
    const deathDate = shortMonthDate(
      formatDateOrRange(person.death, intl),
      intl.locale,
    );
    const birthPlace = person.birth?.place || '';
    const deathPlace = person.death?.place || '';
    const eventFontLimit = Math.max(
      4,
      Math.floor(textWidth / (dateFontSize * 0.51)),
    );
    const dateLabel = (symbol: string, date: string, year?: number) =>
      date || year
        ? clip(
            symbol + ' ' + (generation >= 5 && year ? String(year) : date),
            eventFontLimit,
          )
        : '';
    const details: Array<{
      kind: 'birth' | 'death';
      type: 'date' | 'place';
      text: string;
      fullPlace?: string;
    }> = [
      {
        kind: 'birth',
        type: 'date',
        text: dateLabel('*', birthDate, born),
      },
      {
        kind: 'birth',
        type: 'place',
        text: clip(birthPlace, eventFontLimit),
        fullPlace: birthPlace,
      },
      {
        kind: 'death',
        type: 'date',
        text: dateLabel('†', deathDate, died),
      },
      {
        kind: 'death',
        type: 'place',
        text: clip(deathPlace, eventFontLimit),
        fullPlace: deathPlace,
      },
    ].filter((line) => !!line.text);
    const showId = props.hideIds === Ids.SHOW;
    const allLines = [
      ...nameLines.map((text) => ({text, kind: 'name' as const})),
      ...details.map((line) => ({
        ...line,
        kind: line.kind as 'birth' | 'death',
      })),
      ...(showId ? [{text: person.id, kind: 'id' as const}] : []),
    ];
    const spacing = 13;
    const startY = -((allLines.length - 1) * spacing) / 2;
    // Inner sectors follow circular arcs; the outer sectors keep radial, straight labels.
    const rotation =
      generation >= 5 ? middle - 90 + (middle < 0 ? 180 : 0) : middle;
    const curvedPath = (radius: number) => {
      const clockwise = Math.abs(middle) <= 90;
      const from = clockwise ? start : end;
      const to = clockwise ? end : start;
      const point = (angle: number) => {
        const radians = ((angle - 90) * Math.PI) / 180;
        return [
          +(radius * Math.cos(radians)).toFixed(3),
          +(radius * Math.sin(radians)).toFixed(3),
        ];
      };
      const [x1, y1] = point(from);
      const [x2, y2] = point(to);
      return `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${clockwise ? 1 : 0} ${x2} ${y2}`;
    };
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
        onMouseEnter={(event) => personPopup(person, event, 'birth')}
        onMouseMove={movePopup}
        onMouseLeave={clearHover}
        style={{cursor: 'pointer'}}
      >
        <path
          d={fanSectorPath(inner, outer, start, end)}
          fill={personFill(person, generation, props.colors)}
          stroke={isSelected ? '#d17900' : '#a7a7a7'}
          strokeWidth={isSelected ? 3 : 0.85}
        />
        {isCurved ? (
          <g className="fan-labels" textAnchor="middle">
            {allLines.map((line, row) => {
              const r = Math.max(
                15,
                textRadius + (row - (allLines.length - 1) / 2) * spacing,
              );
              const id = `fan-arc-${generation}-${index}-${row}`;
              const isPlace = 'type' in line && line.type === 'place';
              const fullPlace = 'fullPlace' in line ? line.fullPlace || '' : '';
              const isPlaceMatch =
                isPlace &&
                !!hoveredPlace &&
                props.highlightMatchingPlaces !== false &&
                placesMatch(fullPlace, hoveredPlace);
              return (
                <g key={id}>
                  <defs>
                    <path id={id} d={curvedPath(r)} />
                  </defs>
                  <text
                    className={
                      line.kind === 'id' ? 'fan-identification' : undefined
                    }
                    fontSize={
                      line.kind === 'id'
                        ? 8
                        : line.kind === 'name'
                          ? fontSize
                          : dateFontSize
                    }
                    fontWeight={line.kind === 'name' ? 600 : 400}
                    onMouseEnter={(event) => {
                      if (line.kind === 'birth' || line.kind === 'death')
                        personPopup(person, event, line.kind);
                      if (isPlace && props.highlightMatchingPlaces !== false)
                        setHoveredPlace(fullPlace);
                    }}
                    onMouseLeave={
                      isPlace ? () => setHoveredPlace(undefined) : undefined
                    }
                  >
                    <textPath
                      href={`#${id}`}
                      startOffset="50%"
                      className={isPlaceMatch ? 'fan-place-match' : undefined}
                    >
                      {line.text}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
        ) : (
          <g
            transform={`translate(${x} ${y}) rotate(${rotation})`}
            className="fan-labels"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {allLines.map((line, row) => {
              const isPlace =
                line.kind !== 'name' &&
                line.kind !== 'id' &&
                line.type === 'place';
              const fullPlace = isPlace ? line.fullPlace || '' : '';
              const isPlaceMatch =
                isPlace &&
                !!hoveredPlace &&
                props.highlightMatchingPlaces !== false &&
                placesMatch(fullPlace, hoveredPlace);
              return (
                <text
                  key={row}
                  y={startY + row * spacing}
                  className={
                    line.kind === 'id'
                      ? 'fan-identification'
                      : isPlaceMatch
                        ? 'fan-place-match'
                        : undefined
                  }
                  fontSize={
                    line.kind === 'id'
                      ? 8
                      : line.kind === 'name'
                        ? fontSize
                        : dateFontSize
                  }
                  fontWeight={line.kind === 'name' ? 600 : 400}
                  onMouseEnter={(event) => {
                    if (line.kind === 'birth' || line.kind === 'death')
                      personPopup(person, event, line.kind);
                    if (isPlace && props.highlightMatchingPlaces !== false)
                      setHoveredPlace(fullPlace);
                  }}
                  onMouseLeave={
                    isPlace ? () => setHoveredPlace(undefined) : undefined
                  }
                >
                  {line.text}
                </text>
              );
            })}
          </g>
        )}
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
      const partnerNames = [
        family?.husb ? personById.get(family.husb) : undefined,
        family?.wife ? personById.get(family.wife) : undefined,
      ].map((person) => (person ? personName(person) : '?'));
      return [
        {
          key: `${parentGeneration}-${childNode.index}`,
          x,
          y,
          text,
          partnerNames: partnerNames.join(' & '),
          familyId: family?.id,
        },
      ];
    });

  const root = ancestors[0].person;
  const hasAncestors = ancestors.some(
    (node) => node.generation > 0 && node.person,
  );
  const rootNameLines = root
    ? ancestorNameLines(root.firstName, root.lastName, 21, true)
    : [];
  const rootEvents = root
    ? [
        {symbol: '*', event: root.birth},
        {symbol: '†', event: root.death},
      ].flatMap(({symbol, event}) => {
        const date = shortMonthDate(
          formatDateOrRange(event, intl),
          intl.locale,
        );
        const place = event?.place || '';
        if (!date && !place) return [];
        // Keep the centre legible while retaining the date and both places.
        const shortPlace = place.length > 22 ? place.slice(0, 21) + '…' : place;
        return [
          ...(date ? [symbol + ' ' + date] : []),
          ...(shortPlace ? [shortPlace] : []),
        ];
      })
    : [];
  const rootLabelLines = [
    ...rootNameLines,
    ...rootEvents,
    ...(root && props.hideIds === Ids.SHOW ? [root.id] : []),
  ];
  const rootLineSpacing = rootLabelLines.length > 6 ? 12 : 14;
  const rootStartY = -((rootLabelLines.length - 1) * rootLineSpacing) / 2;
  return (
    <div id="svgContainer" className="ancestor-fan-container">
      <div className="ancestor-fan-controls">
        <label htmlFor="fanGenerations">
          {intl.formatMessage({
            id: 'fan.generations_short',
            defaultMessage: 'Generations',
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
                cancelDismiss();
                setPopup({
                  heading: marker.partnerNames,
                  notes: marker.familyId
                    ? eventNoteHtml(
                        props.gedcom,
                        props.gedcom?.fams[marker.familyId],
                        ['MARR', 'MARB', 'MARC', 'MARL', 'MARS'],
                      )
                    : [],
                  rows: [
                    {
                      label: intl.formatMessage({
                        id: 'fan.marriage',
                        defaultMessage: 'Marriage',
                      }),
                      value: marker.text,
                    },
                  ],
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onMouseMove={movePopup}
              onMouseLeave={dismissPopupSoon}
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
              root ? (event) => personPopup(root, event, 'birth') : undefined
            }
            onMouseMove={movePopup}
            onMouseLeave={clearHover}
            style={{cursor: root ? 'pointer' : 'default'}}
          >
            <circle
              r={START_RADIUS - 4}
              fill={personFill(root, 0, props.colors)}
              stroke={
                root?.id === (props.selectedPersonId || props.selection.id)
                  ? '#d17900'
                  : '#666'
              }
              strokeWidth={
                root?.id === (props.selectedPersonId || props.selection.id)
                  ? 4
                  : 1.5
              }
            />
            {root &&
              rootLabelLines.map((label, index) => (
                <text
                  key={index}
                  className={
                    index === rootLabelLines.length - 1 &&
                    props.hideIds === Ids.SHOW
                      ? 'fan-identification'
                      : 'fan-root-label'
                  }
                  textAnchor="middle"
                  y={rootStartY + index * rootLineSpacing}
                  fontSize={
                    index < rootNameLines.length
                      ? 11
                      : index === rootLabelLines.length - 1 &&
                          props.hideIds === Ids.SHOW
                        ? 8
                        : 9.5
                  }
                  fontWeight={index < rootNameLines.length ? 600 : 400}
                  onMouseEnter={
                    index >= rootNameLines.length &&
                    index < rootNameLines.length + rootEvents.length
                      ? (event) =>
                          personPopup(
                            root,
                            event,
                            index <
                              rootNameLines.length +
                                Math.ceil(rootEvents.length / 2)
                              ? 'birth'
                              : 'death',
                          )
                      : undefined
                  }
                >
                  {label}
                </text>
              ))}
          </g>
        </g>
      </svg>
      {!hasAncestors && root && (
        <p className="ancestor-fan-no-ancestors" role="status">
          {intl.formatMessage({
            id: 'fan.no_known_ancestors',
            defaultMessage:
              'No parents or other ancestors are recorded for this person. ' +
              'Choose another person to see their ancestor fan.',
          })}
        </p>
      )}
      {popup && (
        <EventPopup
          data={popup}
          onMouseEnter={cancelDismiss}
          onMouseLeave={() => {
            cancelDismiss();
            setPopup(undefined);
          }}
        />
      )}
    </div>
  );
}
