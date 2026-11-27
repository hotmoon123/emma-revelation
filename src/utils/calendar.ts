import type { BookingEvent } from '../types/music';

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const pad = (n: number) => String(n).padStart(2, '0');

/** Builds an .ics calendar reminder for an itinerary entry (all-day when no time is set). */
export function buildEventIcs(evt: BookingEvent, artistName: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(evt.date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = /^(\d{2}):(\d{2})$/.exec(evt.time ?? '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  let start: string;
  let end: string;
  let dtLines: string[];
  if (t) {
    start = `${y}${pad(mo)}${pad(d)}T${t[1]}${t[2]}00`;
    const endDate = new Date(y, mo - 1, d, Number(t[1]) + 2, Number(t[2]));
    end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
    dtLines = [`DTSTART:${start}`, `DTEND:${end}`];
  } else {
    const next = new Date(y, mo - 1, d + 1);
    dtLines = [
      `DTSTART;VALUE=DATE:${y}${pad(mo)}${pad(d)}`,
      `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`,
    ];
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(artistName)}//Itinerary//EN`,
    'BEGIN:VEVENT',
    `UID:${evt.id}@portfolio`,
    `DTSTAMP:${stamp}`,
    ...dtLines,
    `SUMMARY:${esc(`${evt.eventName} — ${artistName}`)}`,
    `LOCATION:${esc([evt.venue, evt.city].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(`Host: ${evt.organizer}${evt.notes ? `\n${evt.notes}` : ''}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(evt: BookingEvent, artistName: string): boolean {
  const ics = buildEventIcs(evt, artistName);
  if (!ics) return false;
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${evt.eventName.replace(/[^\w-]+/g, '-').slice(0, 40) || 'event'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** A "add to Google Calendar" link for an event (all-day when no time is set). null when the date is not usable. */
export function googleCalendarUrl(evt: BookingEvent, artistName: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(evt.date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = /^(\d{2}):(\d{2})$/.exec(evt.time ?? '');
  const fmt = (dt: Date) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  let dates: string;
  if (t) {
    const start = new Date(y, mo - 1, d, Number(t[1]), Number(t[2]));
    const end = new Date(y, mo - 1, d, Number(t[1]) + 2, Number(t[2]));
    const f = (dt: Date) => `${fmt(dt)}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    dates = `${f(start)}/${f(end)}`;
  } else {
    dates = `${fmt(new Date(y, mo - 1, d))}/${fmt(new Date(y, mo - 1, d + 1))}`;
  }
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${evt.eventName} — ${artistName}`,
    dates,
    location: [evt.venue, evt.city].filter(Boolean).join(', '),
    details: [evt.organizer && `Host: ${evt.organizer}`, evt.notes].filter(Boolean).join('\n'),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
