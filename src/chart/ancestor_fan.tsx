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
  const [generationInput, setGenerationInput] = useState('5');
  const changeGenerations = (value: number) => {
    const next = Math.max(1, Math.min(MAX_GENERATIONS, value));
    setGenerations(next);
    setGenerationInput(String(next));
  };
  const commitGenerations = () => {
    const next = Number(generationInput);
    changeGenerations(Number.isInteger(next) && next >= 1 ? next : generations);
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const [hoveredPlace, setHoveredPlace] = useState<string>();
  const [popup, setPopup] = useState<EventPopupData>();
  // Touch devices do not have a stable hover state; use DETAILS instead.
  const touchDevice =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replaceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupHoveredRef = useRef(false);
  const popupRef = useRef<EventPopupData | undefined>(undefined);
  const cancelDismiss = () => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = null;
  };
  const cancelReplace = () => {
    if (replaceRef.current) clearTimeout(replaceRef.current);
    replaceRef.current = null;
  };
  const displayPopup = (data: EventPopupData) => {
    cancelDismiss();
    cancelReplace();
    // Give the pointer time to cross neighboring sectors on the way into
    // a scrollable popup. A popup being read is not replaced underneath it.
    if (popupHoveredRef.current) return;
    if (!popupRef.current || popupRef.current.heading === data.heading) {
      popupRef.current = data;
      setPopup(data);
    } else {
      replaceRef.current = setTimeout(() => {
        if (!popupHoveredRef.current) {
          popupRef.current = data;
          setPopup(data);
        }
        replaceRef.current = null;
      }, 450);
    }
  };
  const dismissPopupSoon = () => {
    cancelDismiss();
    cancelReplace();
    dismissRef.current = setTimeout(() => {
      if (!popupHoveredRef.current) {
        popupRef.current = undefined;
        setPopup(undefined);
      }
    }, 750);
  };
  const clearHover = () => {
    setHoveredPlace(undefined);
    dismissPopupSoon();
  };
  const personPopup = (
    person: JsonIndi,
    event: React.MouseEvent<SVGElement>,
    kind: 'birth' | 'death',
  ) => {
    if (touchDevice) return;
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
    displayPopup({
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
    const focusOnClick = !touchDevice && props.clickAction === ClickAction.FOCUS;
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
    const isCurved = generation <= 5;
    // Keep the same font size within a generation, including long names.
    // Wrap names rather than compressing individual glyphs.
    const fontSize =
      generation <= 2 ? 12 : generation <= 4 ? 11 : generation === 5 ? 9.5 : 8;
    const dateFontSize =
      generation <= 2 ? 9 : generation <= 4 ? 8.5 : generation === 5 ? 7.5 : 6.8;
    const arcWidth = (textRadius * (end - start) * Math.PI) / 180;
    const textWidth = isCurved ? Math.max(12, arcWidth - 8) : RING_SIZE - 12;
    const charLimit = Math.max(4, Math.floor(textWidth / (fontSize * 0.55)));
    const nameLines = ancestorNameLines(
      person.firstName,
      person.lastName,
      Math.min(isCurved ? 16 : 23, charLimit),
      isCurved,
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
        kind: 'birth' as const,
        type: 'date' as const,
        text: dateLabel('*', birthDate, born),
      },
      {
        kind: 'birth' as const,
        type: 'place' as const,
        text: clip(birthPlace, eventFontLimit),
        fullPlace: birthPlace,
      },
      {
        kind: 'death' as const,
        type: 'date' as const,
        text: dateLabel('†', deathDate, died),
      },
      {
        kind: 'death' as const,
        type: 'place' as const,
        text: clip(deathPlace, eventFontLimit),
        fullPlace: deathPlace,
      },
    ].filter((line) => !!line.text);
    const showId = props.hideIds === Ids.SHOW;
    // Straight outer sectors have one name and one combined birth/death line.
    // Preserve the complete values in DETAILS and the desktop event popup.
    const compactYear = (year: number | undefined, date: string) =>
      year ? String(year) : date.match(/\d{4}/)?.[0] || '';
    const compactEvent = (symbol: string, year: string, place: string) =>
      [year ? symbol + year : '', place].filter(Boolean).join(' ');
    const compactBirth = compactEvent(
      '*',
      compactYear(born, birthDate),
      birthPlace,
    );
    const compactDeath = compactEvent(
      '†',
      compactYear(died, deathDate),
      deathPlace,
    );
    const compactLimit = Math.max(
      6,
      Math.floor(textWidth / (dateFontSize * 0.54)),
    );
    const halfLimit = Math.max(3, Math.floor((compactLimit - 3) / 2));
    const compactBirthText = compactBirth
      ? clip(compactBirth, compactDeath ? halfLimit : compactLimit)
      : '';
    const compactDeathText = compactDeath
      ? clip(compactDeath, compactBirth ? halfLimit : compactLimit)
      : '';
    const compactDetails = [compactBirthText, compactDeathText]
      .filter(Boolean)
      .join(' – ');
    const allLines = [
      ...nameLines.map((text) => ({text, kind: 'name' as const})),
      ...(isCurved
        ? details.map((line) => ({
            ...line,
            kind: line.kind as 'birth' | 'death',
          }))
        : compactDetails
          ? [{text: compactDetails, kind: 'combined' as const}]
          : []),
      ...(showId ? [{text: person.id, kind: 'id' as const}] : []),
    ];
    const spacing = isCurved ? 11 : 12;
    const startY = -((allLines.length - 1) * spacing) / 2;
    // Inner sectors follow circular arcs; the outer sectors keep radial, straight labels.
    const radialRotation = middle - 90 + (middle < 0 ? 180 : 0);
    // Normalize all straight labels to an upright reading direction.
    const rotation = ((radialRotation + 90 + 360) % 180) - 90;
    const curvedPath = (radius: number) => {
      const point = (a: number) => {
        const radians = ((a - 90) * Math.PI) / 180;
        return [
          +(radius * Math.cos(radians)).toFixed(3),
          +(radius * Math.sin(radians)).toFixed(3),
        ];
      };
      const [startX, startY] = point(start);
      const [endX, endY] = point(end);
      // On the lower sectors the earlier direction reversal made the
      // glyphs upside-down. Keep the SVG arc's forward direction everywhere;
      // the five curved rings share the same upright baseline.
      const clockwise = true;
      const x1 = clockwise ? startX : endX;
      const y1 = clockwise ? startY : endY;
      const x2 = clockwise ? endX : startX;
      const y2 = clockwise ? endY : startY;
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
                // Shift the curved stack 6px toward the fan center: SVG text
                // sits above its arc baseline and otherwise looks too far out.
                textRadius - 6 + ((allLines.length - 1) / 2 - row) * spacing,
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
                'type' in line && line.type === 'place';
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
                  {line.kind === 'combined' ? (
                    <>
                      {compactBirthText && (
                        <tspan
                          onMouseEnter={(event) =>
                            personPopup(person, event, 'birth')
                          }
                        >
                          {compactBirthText}
                        </tspan>
                      )}
                      {compactBirthText && compactDeathText && (
                        <tspan>{' – '}</tspan>
                      )}
                      {compactDeathText && (
                        <tspan
                          onMouseEnter={(event) =>
                            personPopup(person, event, 'death')
                          }
                        >
                          {compactDeathText}
                        </tspan>
                      )}
                    </>
                  ) : (
                    line.text
                  )}
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
      const husband = family?.husb ? personById.get(family.husb) : undefined;
      const wife = family?.wife ? personById.get(family.wife) : undefined;
      const partnerNames = [husband, wife].map((person) =>
        person ? personName(person) : '?',
      );
      // The marker sits on the radial border between the two parents.
      // Inner labels are tangential, outer labels follow the radius.
      const radialRotation = boundary - 90 + (boundary < 0 ? 180 : 0);
      const markerRotation =
        parentGeneration <= 5
          ? boundary
          : ((radialRotation + 90 + 360) % 180) - 90;
      return [
        {
          key: `${parentGeneration}-${childNode.index}`,
          x,
          y,
          text,
          partnerNames: partnerNames.join(' & '),
          familyId: family?.id,
          boundary,
          markerRotation,
          husbandFill: personFill(husband, parentGeneration, props.colors),
          wifeFill: personFill(wife, parentGeneration, props.colors),
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
        <div className="ancestor-fan-generation-stepper">
          <button
            type="button"
            aria-label="Eine Generation weniger"
            disabled={generations <= 1}
            onClick={() => changeGenerations(generations - 1)}
          >
            −
          </button>
          <input
            id="fanGenerations"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={generationInput}
            aria-label={intl.formatMessage({
              id: 'fan.generations',
              defaultMessage: 'Ancestor generations',
            })}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^[0-9]{0,2}$/.test(value)) return;
              setGenerationInput(value);
              const n = Number(value);
              if (value && n >= 1 && n <= MAX_GENERATIONS) {
                setGenerations(n);
              }
            }}
            onBlur={commitGenerations}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitGenerations();
                e.currentTarget.blur();
              }
            }}
          />
          <button
            type="button"
            aria-label="Eine Generation mehr"
            disabled={generations >= MAX_GENERATIONS}
            onClick={() => changeGenerations(generations + 1)}
          >
            +
          </button>
        </div>
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
                if (touchDevice) return;
                setHoveredPlace(undefined);
                displayPopup({
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
              onMouseLeave={dismissPopupSoon}
            >
              {/* Match the adjacent parental sectors on each side of the
                  radial boundary; keep both colors when coloring by sex. */}
              <g transform={`rotate(${marker.boundary})`} pointerEvents="none">
                <path d="M 0 -12 A 12 12 0 0 0 0 12 Z" fill={marker.husbandFill} />
                <path d="M 0 -12 A 12 12 0 0 1 0 12 Z" fill={marker.wifeFill} />
              </g>
              <circle
                r={12}
                fill="none"
                stroke="#a7a7a7"
                strokeWidth={0.85}
                pointerEvents="none"
              />
              {/* Orient the marriage rings like the parent labels: tangential
                  in the inner five generations, radial in the outer rings. */}
              <g
                transform={`rotate(${marker.markerRotation})`}
                fill="none"
                stroke="#111"
                strokeWidth={1.3}
                pointerEvents="none"
                aria-label="Heirat"
              >
                <circle cx={-3.2} cy={0} r={3.8} />
                <circle cx={3.2} cy={0} r={3.8} />
              </g>
            </g>
          ))}
          <g
            className="fan-root"
            onClick={root ? (e) => handleClick(e, root) : undefined}
            onMouseEnter={
              root ? (event) => personPopup(root, event, 'birth') : undefined
            }
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
      {!touchDevice && popup && (
        <EventPopup
          data={popup}
          onMouseEnter={() => {
            popupHoveredRef.current = true;
            cancelDismiss();
            cancelReplace();
          }}
          onMouseLeave={() => {
            popupHoveredRef.current = false;
            dismissPopupSoon();
          }}
        />
      )}
    </div>
  );
}
