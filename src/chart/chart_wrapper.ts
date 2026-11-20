import {max, min} from 'd3-array';
import {interpolateNumber} from 'd3-interpolate';
import {BaseType, select, Selection} from 'd3-selection';
import 'd3-transition';
import {
  D3ZoomEvent,
  zoom,
  ZoomBehavior,
  ZoomedElementBaseType,
  zoomTransform,
} from 'd3-zoom';
import {IntlShape} from 'react-intl';
import {ChartHandle, ChartInfo, createChart} from 'topola';
import {ClickAction} from '../sidepanel/config/config';
import {formatDateOrRange} from '../util/date_util';
import {associatedEventLines, placeKey} from './hover_helpers';
import {
  chartColors,
  ChartProps,
  getChartType,
  getRendererType,
} from './chart_types';

/** How much to zoom when using the +/- buttons. */
const ZOOM_FACTOR = 1.3;

/**
 * Called when the view is dragged with the mouse.
 *
 * @param size the size of the chart
 */
function zoomed(
  size: [number, number],
  event: D3ZoomEvent<ZoomedElementBaseType, unknown>,
) {
  const parent = select('#svgContainer').node() as Element;

  const scale = event.transform.k;
  const offsetX = max([0, (parent.clientWidth - size[0] * scale) / 2]);
  const offsetY = max([0, (parent.clientHeight - size[1] * scale) / 2]);
  select('#chartSvg')
    .attr('width', size[0] * scale)
    .attr('height', size[1] * scale)
    .attr('transform', `translate(${offsetX}, ${offsetY})`);
  select('#chart').attr('transform', `scale(${scale})`);

  parent.scrollLeft = -event.transform.x;
  parent.scrollTop = -event.transform.y;
}

/** Called when the scrollbars are used. */
function scrolled() {
  const parent = select('#svgContainer').node() as Element;
  const x = parent.scrollLeft + parent.clientWidth / 2;
  const y = parent.scrollTop + parent.clientHeight / 2;
  const scale = zoomTransform(parent).k;
  select(parent).call(zoom().translateTo, x / scale, y / scale);
}

/** Returns the element's usable width and height by subtracting the assumed scrollbar size. */
function getScrollbarAwareSize(
  element: Element,
  scrollbarSize = 20,
): [number, number] {
  const htmlElement = element as HTMLElement;
  return [
    htmlElement.clientWidth - scrollbarSize,
    htmlElement.clientHeight - scrollbarSize,
  ];
}

/**
 * Calculates the allowed zoom scale range.
 * Sets the minimum scale so the chart cannot zoom out beyond full visibility,
 * and fixes the maximum scale at 2.
 */
function calculateScaleExtent(
  parent: Element,
  scale: number,
  chartInfo: ChartInfo,
): [number, number] {
  const [availWidth, availHeight] = getScrollbarAwareSize(parent);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const zoomOutFactor = min([
    1,
    scale,
    availWidth / chartInfo.size[0],
    availHeight / chartInfo.size[1],
  ])!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return [max([0.1, zoomOutFactor])!, 2];
}

export class ChartWrapper {
  private chart?: ChartHandle;
  /** Animation is in progress. */
  private animating = false;
  /** Rendering is required after the current animation finishes. */
  private rerenderRequired = false;
  /** The d3 zoom behavior object. */
  private zoomBehavior?: ZoomBehavior<Element, unknown>;
  /** Props that will be used for rerendering. */
  private rerenderProps?: ChartProps;
  private rerenderResetPosition?: boolean;
  private currentProps?: ChartProps;

  /** Highlight a person without recentering or redrawing the chart. */
  private highlightPerson(id?: string) {
    select('#chart')
      .selectAll<SVGGElement, unknown>('g.indi')
      .classed('selected-individual', function () {
        const record = select(this).datum() as {indi?: {id?: string}};
        return !!id && record?.indi?.id === id;
      });
  }

  /** Add date information and transient same-place highlighting to SVG labels. */
  private attachEventTooltips(props: ChartProps, intl: IntlShape) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const source = props.originalData ?? props.data;
    const indiById = new Map(source.indis.map((indi) => [indi.id, indi]));
    const famById = new Map(source.fams.map((fam) => [fam.id, fam]));

    const addTitle = (element: Element, title: string) => {
      if (!title) return;
      let node = element.querySelector(':scope > title');
      if (!node) {
        node = document.createElementNS(svgNamespace, 'title');
        element.appendChild(node);
      }
      node.textContent = title;
    };

    // A single matching string is shared by birth, death, and marriage
    // locations. D3 replaces these namespaced callbacks on reattachment.
    const highlight = (key: string) => {
      select('#chart')
        .selectAll<SVGTextElement, unknown>('text[data-place-key]')
        .classed('matching-place', function () {
          return !!key && this.getAttribute('data-place-key') === key;
        });
    };
    const attachPlace = (element: Element | undefined, fullPlace?: string) => {
      if (!element) return;
      const key = placeKey(fullPlace);
      const text = select(element);
      if (key && props.highlightMatchingPlaces !== false) {
        text.attr('data-place-key', key)
          .on('mouseenter.place-hover', () => highlight(key))
          .on('mouseleave.place-hover', () => highlight(''));
      } else {
        text.attr('data-place-key', null)
          .on('mouseenter.place-hover', null)
          .on('mouseleave.place-hover', null);
      }
    };
    // Clean up any old markers if the setting was switched off.
    if (props.highlightMatchingPlaces === false) highlight('');

    const eventSummary = (
      label: string,
      event: {place?: string} | undefined,
      date: string,
      extra: string[] = [],
    ) => [
      [label, date, event?.place].filter(Boolean).join(' · '),
      ...extra,
    ].filter(Boolean).join('\n');

    select('#chart')
      .selectAll<SVGGElement, {indi?: {id?: string}}>('g.indi')
      .each(function (record) {
        const id = record?.indi?.id;
        const person = id ? indiById.get(id) : undefined;
        if (!person) return;
        const values = Array.from(
          this.querySelectorAll('text.details:not(.sex)'),
        ).filter((_element, index) => index % 2 === 1);
        let index = 0;
        for (const [label, kind, event] of [
          ['Geburt', 'birth', person.birth],
          ['Tod', 'death', person.death],
        ] as const) {
          const date = formatDateOrRange(event, intl);
          const place = event?.place;
          const summary = eventSummary(
            label,
            event,
            date,
            id ? associatedEventLines(props.gedcom, id, kind, intl) : [],
          );
          if (date) {
            if (values[index]) addTitle(values[index], summary);
            index++;
          }
          if (place) {
            attachPlace(values[index], place);
            index++;
          }
        }
      });

    select('#chart')
      .selectAll<SVGGElement, {data?: {family?: {id?: string}}}>('g.family')
      .each(function (record) {
        const id = record?.data?.family?.id;
        const marriage = id ? famById.get(id)?.marriage : undefined;
        if (!marriage) return;
        const values = Array.from(
          this.querySelectorAll('text.details'),
        ).filter((_element, index) => index % 2 === 1);
        const date = formatDateOrRange(marriage, intl);
        if (date && values[0]) {
          addTitle(values[0], eventSummary('Heirat', marriage, date));
        }
        const placeIndex = date ? 1 : 0;
        if (marriage.place) attachPlace(values[placeIndex], marriage.place);
      });
  }

  zoom(factor: number) {
    const parent = select('#svgContainer') as Selection<
      Element,
      unknown,
      BaseType,
      unknown
    >;
    this.zoomBehavior?.scaleBy(parent, factor);
  }

  /**
   * Renders the chart or performs a transition animation to a new state.
   * If indiInfo is not given, it means that it is the initial render and no
   * animation is performed.
   */
  renderChart(
    props: ChartProps,
    intl: IntlShape,
    args: {initialRender: boolean; resetPosition: boolean} = {
      initialRender: false,
      resetPosition: false,
    },
  ) {
    // Keep event handlers and preferences current even when no SVG redraw is needed.
    this.currentProps = props;
    this.highlightPerson(props.selectedPersonId);
    this.attachEventTooltips(props, intl);
    // Nothing changed — the SVG is already correct. Skip re-render.
    // This prevents repeated full D3 layout passes (500ms+ each) that happen
    // when React re-renders for unrelated state changes.
    if (!args.initialRender && !args.resetPosition) {
      return;
    }

    // Wait for animation to finish if animation is in progress.
    if (!args.initialRender && this.animating) {
      this.rerenderRequired = true;
      this.rerenderProps = props;
      this.rerenderResetPosition = args.resetPosition;
      return;
    }

    // Freeze changing selection after initial rendering.
    if (!args.initialRender && props.freezeAnimation) {
      return;
    }

    if (args.initialRender || !this.chart) {
      (select('#chart').node() as HTMLElement).innerHTML = '';
      this.chart = createChart({
        json: props.data,
        chartType: getChartType(props.chartType),
        renderer: getRendererType(props.chartType),
        svgSelector: '#chart',
        indiCallback: (info) => {
          // ths is called when an individual is selected in the chart
          const handlers = this.currentProps ?? props;
          this.highlightPerson(info.id);
          const shift = !!info.modifiers?.shiftKey;
          const focusOnClick = handlers.clickAction === ClickAction.FOCUS;
          if (shift === focusOnClick) {
            handlers.onDetailSelection(info);
          } else {
            handlers.onSelection(info);
          }
        },
        colors:
          props.colors !== undefined
            ? chartColors.get(props.colors)
            : undefined,
        animate: true,
        updateSvgSize: false,
        locale: intl.locale,
      });
    } else {
      this.chart.setData(props.data);
    }
    const chartInfo = this.chart.render({
      startIndi: props.selection.id,
      baseGeneration: props.selection.generation,
    });
    this.highlightPerson(props.selectedPersonId);
    this.attachEventTooltips(props, intl);
    const svg = select('#chartSvg');
    const parent = select('#svgContainer').node() as Element;
    const scale = zoomTransform(parent).k;
    const extent: [number, number] = calculateScaleExtent(
      parent,
      scale,
      chartInfo,
    );

    this.zoomBehavior = zoom()
      .scaleExtent(extent)
      .translateExtent([[0, 0], chartInfo.size])
      .on('zoom', (event) => zoomed(chartInfo.size, event));

    select(parent).on('scroll', scrolled).call(this.zoomBehavior);

    const scrollTopTween = (scrollTop: number) => {
      return () => {
        const i = interpolateNumber(parent.scrollTop, scrollTop);
        return (t: number) => {
          parent.scrollTop = i(t);
        };
      };
    };
    const scrollLeftTween = (scrollLeft: number) => {
      return () => {
        const i = interpolateNumber(parent.scrollLeft, scrollLeft);
        return (t: number) => {
          parent.scrollLeft = i(t);
        };
      };
    };

    const dx = parent.clientWidth / 2 - chartInfo.origin[0] * scale;
    const dy = parent.clientHeight / 2 - chartInfo.origin[1] * scale;
    const offsetX = max([
      0,
      (parent.clientWidth - chartInfo.size[0] * scale) / 2,
    ]);
    const offsetY = max([
      0,
      (parent.clientHeight - chartInfo.size[1] * scale) / 2,
    ]);
    const svgTransition = svg.transition().delay(200).duration(500);
    const transition = args.initialRender ? svg : svgTransition;
    transition.attr('transform', `translate(${offsetX}, ${offsetY})`);
    transition.attr('width', chartInfo.size[0] * scale);
    transition.attr('height', chartInfo.size[1] * scale);
    if (args.resetPosition) {
      if (args.initialRender) {
        parent.scrollLeft = -dx;
        parent.scrollTop = -dy;
      } else {
        svgTransition
          .tween('scrollLeft', scrollLeftTween(-dx))
          .tween('scrollTop', scrollTopTween(-dy));
      }
    }

    // After the animation is finished, rerender the chart if required.
    this.animating = true;
    chartInfo.animationPromise.then(() => {
      this.attachEventTooltips(this.currentProps ?? props, intl);
      this.animating = false;
      if (this.rerenderRequired) {
        this.rerenderRequired = false;
        // Use `this.rerenderProps` instead of the props in scope because
        // the props may have been updated in the meantime.
        if (this.rerenderProps) {
          this.renderChart(this.rerenderProps, intl, {
            initialRender: false,
            resetPosition: !!this.rerenderResetPosition,
          });
        } else {
          console.error(
            'Rerender required after animation, but rerenderProps was not set.',
          );
        }
      }
    });
  }
}

export {ZOOM_FACTOR};
