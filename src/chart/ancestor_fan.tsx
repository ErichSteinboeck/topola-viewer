import {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {IndiInfo, JsonGedcomData, JsonIndi} from 'topola';
import {ChartColors, ClickAction, Ids} from '../sidepanel/config/config';
import {formatDateOrRange} from '../util/date_util';
import {buildAncestorFan, fanSectorPath} from './ancestor_fan_data';

interface Props {
  data: JsonGedcomData;
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

/** A 360-degree ancestor wheel. Each sector is one ancestor *position*,
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
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string>();
  const ancestors = useMemo(
    () => buildAncestorFan(props.data, props.selection.id, generations),
    [props.data, props.selection.id, generations],
  );
  const radius = START_RADIUS + generations * RING_SIZE;
  const size = 2 * (radius + 48);
  const center = size / 2;
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
    const start = (index * 360) / count;
    const end = ((index + 1) * 360) / count;
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
    // Text remains radial. Reverse it on the left half so it is never upside down.
    const rotation = middle >= 180 ? middle - 270 : middle - 90;
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
            fontSize={generation > 5 ? 10 : generation > 3 ? 12 : 15}
            fontWeight={emphasized ? 700 : 500}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${rotation} ${x} ${y})`}
            pointerEvents="none"
          >
            {shortName}
          </text>
        )}
        {person && (
          <title>
            {[
              labels(person),
              person.birth
                ? `${intl.formatMessage({id: 'fan.birth', defaultMessage: 'Birth'})}: ${formatDateOrRange(person.birth, intl)}`
                : '',
              person.death
                ? `${intl.formatMessage({id: 'fan.death', defaultMessage: 'Death'})}: ${formatDateOrRange(person.death, intl)}`
                : '',
              `${intl.formatMessage({id: 'fan.generation', defaultMessage: 'Generation'})} ${generation}`,
            ]
              .filter(Boolean)
              .join('\n')}
          </title>
        )}
      </g>
    );
  };

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
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((n) => Math.min(n * 1.25, 4))}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((n) => Math.max(n / 1.25, 0.3))}
        >
          −
        </button>
        <button onClick={() => setZoom(1)}>
          {intl.formatMessage({id: 'fan.reset_zoom', defaultMessage: 'Fit'})}
        </button>
      </div>
      <svg
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
        style={{
          width: `${zoom * 100}%`,
          height: 'auto',
          maxWidth: 'none',
        }}
      >
        <g id="chart" transform={`translate(${center} ${center})`}>
          {ancestors.slice(1).map(sector)}
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
                <title>{labels(root)}</title>
              </>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
