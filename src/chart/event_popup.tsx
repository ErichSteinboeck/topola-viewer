import {MouseEvent} from 'react';
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
  return (
    <div
      className="ancestor-fan-popup"
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(data.x + 14, window.innerWidth - 350)),
        top: Math.max(8, Math.min(data.y + 14, window.innerHeight - 260)),
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
    </div>
  );
}
