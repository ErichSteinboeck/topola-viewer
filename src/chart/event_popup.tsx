import {MouseEvent, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {SafeNoteHtml} from '../sidepanel/details/safe-note-html';

export interface EventPopupData {
  heading: string;
  rows: Array<{label: string; value: string}>;
  notes?: string[];
  x: number;
  y: number;
}

/** Shared popup renderer; event-specific content is prepared by each chart. */
export function EventPopup({
  data,
  onMouseEnter,
  onMouseLeave,
}: {
  data: EventPopupData;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const popupElement = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({left: data.x + 14, top: data.y + 14});

  useLayoutEffect(() => {
    const element = popupElement.current;
    if (!element) return;
    const {width, height} = element.getBoundingClientRect();
    const margin = 8;
    const offset = 14;
    const rightSpace = window.innerWidth - data.x;
    const bottomSpace = window.innerHeight - data.y;
    const left =
      rightSpace >= width + offset + margin
        ? data.x + offset
        : data.x >= width + offset + margin
          ? data.x - width - offset
          : Math.max(margin, window.innerWidth - width - margin);
    const top =
      bottomSpace >= height + offset + margin
        ? data.y + offset
        : data.y >= height + offset + margin
          ? data.y - height - offset
          : Math.max(margin, window.innerHeight - height - margin);
    setPosition({
      left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
    });
  }, [data]);

  return createPortal(
    <div
      ref={popupElement}
      className="ancestor-fan-popup"
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
      }}
    >
      <strong>{data.heading}</strong>
      {data.rows.map((row, index) => (
        <div className="ancestor-fan-popup-row" key={index}>
          {row.label && <b>{row.label}:</b>} {row.value}
        </div>
      ))}
      {!!data.notes?.length && (
        <div className="fan-popup-notes">
          {data.notes.map((note, index) => (
            <SafeNoteHtml key={index} text={note.slice(0, 1500)} />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
