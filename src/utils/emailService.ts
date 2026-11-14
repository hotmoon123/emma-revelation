/**
 * Booking delivery. Credentials come ONLY from environment variables
 * (see .env.example) — nothing is hardcoded, and nothing is simulated:
 * if EmailJS is not configured the result says so honestly.
 */
import emailjs from '@emailjs/browser';
import type { PortfolioConfig } from '../types/music';
import type { BookingDraft } from './validation';

export type DeliveryStatus = 'sent' | 'not-configured' | 'failed';

export interface DeliveryResult {
  status: DeliveryStatus;
  message: string;
}

const env = import.meta.env;
const SERVICE_ID = (env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? '';
const TEMPLATE_ID = (env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? '';
const PUBLIC_KEY = (env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? '';

export const isEmailConfigured = (): boolean => Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

export function buildMailtoUrl(profile: PortfolioConfig, b: BookingDraft): string | null {
  if (!profile.emailAddress) return null;
  const body = [
    `Event: ${b.eventName}`,
    `Host: ${b.organizer}`,
    `Category: ${b.eventType}`,
    `Date: ${b.date}${b.time ? ` ${b.time}` : ''}`,
    `Venue: ${b.venue}${b.city ? `, ${b.city}` : ''}`,
    `Honorarium (GHS): ${b.feeGHS || 'Not stated'}`,
    `Phone / WhatsApp: ${b.contactPhone}`,
    `Email: ${b.contactEmail || 'Not provided'}`,
    '',
    b.notes || '',
  ].join('\n');
  return `mailto:${encodeURIComponent(profile.emailAddress)}?subject=${encodeURIComponent(
    `Booking inquiry: ${b.eventName}`
  )}&body=${encodeURIComponent(body)}`;
}

export async function sendBookingInquiry(profile: PortfolioConfig, b: BookingDraft): Promise<DeliveryResult> {
  if (!isEmailConfigured()) {
    return {
      status: 'not-configured',
      message: 'Email sending is not set up on this site, so nobody has received your request yet. Please send it from your mail app.',
    };
  }
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: profile.emailAddress,
        artist_name: profile.artistName,
        event_name: b.eventName,
        organizer_name: b.organizer,
        event_category: b.eventType,
        event_date: `${b.date}${b.time ? ` ${b.time}` : ''}`,
        venue_city: `${b.venue}${b.city ? `, ${b.city}` : ''}`,
        honorarium_ghs: b.feeGHS ? `GHS ${b.feeGHS.toLocaleString()}` : 'Not stated',
        contact_phone: b.contactPhone,
        contact_email: b.contactEmail || 'Not provided',
        notes: b.notes || '—',
      },
      { publicKey: PUBLIC_KEY }
    );
    return { status: 'sent', message: 'Your request was sent.' };
  } catch {
    return { status: 'failed', message: 'We could not send this. Your answers are still here. Please try again.' };
  }
}
