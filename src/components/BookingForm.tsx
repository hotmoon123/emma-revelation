import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, Mail, Send } from 'lucide-react';
import type { PortfolioConfig } from '../types/music';
import {
  sanitizeBookingDraft,
  todayISO,
  validateBookingDraft,
  type BookingDraft,
  type FieldErrors,
} from '../utils/validation';
import { buildMailtoUrl, type DeliveryResult } from '../utils/emailService';

interface BookingFormProps {
  profile: PortfolioConfig;
  /** Persists the inquiry and attempts delivery; resolves with an honest result. */
  onSubmit: (draft: BookingDraft) => Promise<DeliveryResult>;
}

const COOLDOWN_MS = 10_000;

const emptyDraft = (profile: PortfolioConfig): BookingDraft => ({
  eventName: '',
  organizer: '',
  contactPhone: '',
  contactEmail: '',
  venue: '',
  city: '',
  date: '',
  time: '',
  eventType: profile.eventCategories[0] ?? '',
  feeGHS: 0,
  notes: '',
});

/** Field look lives in index.css (.control): 48 px, 16 px text, 3:1 border. */
const inputBase = 'control';


interface FieldCtx {
  errors: FieldErrors<BookingDraft>;
  uid: string;
}

/** Module-level on purpose: a component declared inside another remounts every render and steals input focus. */
function Field({
  ctx,
  name,
  label,
  required,
  optional,
  hint,
  children,
}: {
  ctx: FieldCtx;
  name: keyof BookingDraft;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: boolean; className: string }) => React.ReactNode;
}) {
  const id = `${ctx.uid}-${name}`;
  const err = ctx.errors[name];
  const describedBy = [err ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[#0F172A] mb-2">
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
        {optional && <span className="font-normal text-[#64748B]"> (optional)</span>}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(err),
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
        className: inputBase,
      })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-[#64748B]">
          {hint}
        </p>
      )}
      {err && (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-semibold text-[#BE123C] flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{err}</span>
        </p>
      )}
    </div>
  );
}

export function BookingForm({ profile, onSubmit }: BookingFormProps) {
  const uid = useId();
  const [draft, setDraft] = useState<BookingDraft>(() => emptyDraft(profile));
  const [errors, setErrors] = useState<FieldErrors<BookingDraft>>({});
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [lastDraft, setLastDraft] = useState<BookingDraft | null>(null);
  const [trap, setTrap] = useState('');
  const lastSubmit = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the result message so screen-reader and keyboard users hear what happened.
  useEffect(() => {
    if (phase === 'done') {
      resultRef.current?.focus();
      resultRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [phase]);

  const set = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const fieldId = (k: keyof BookingDraft) => `${uid}-${k}`;

  const ctx: FieldCtx = { errors, uid };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === 'submitting') return; // prevents duplicate requests
    if (trap) return; // honeypot: silently ignore bots

    const found = validateBookingDraft(draft, todayISO());
    setErrors(found);
    const firstInvalid = (Object.keys(found) as (keyof BookingDraft)[])[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const wait = COOLDOWN_MS - (Date.now() - lastSubmit.current);
    if (wait > 0) {
      setResult({ status: 'failed', message: `Please wait ${Math.ceil(wait / 1000)} seconds before sending another request.` });
      return;
    }

    setPhase('submitting');
    setResult(null);
    const clean = sanitizeBookingDraft(draft);
    const outcome = await onSubmit(clean);
    lastSubmit.current = Date.now();
    setResult(outcome);
    if (outcome.status === 'failed') {
      setPhase('idle'); // keep the user's input so they can retry
      return;
    }
    setLastDraft(clean);
    setDraft(emptyDraft(profile));
    setPhase('done');
  };

  const mailto = lastDraft ? buildMailtoUrl(profile, lastDraft) : null;
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div>
      {phase === 'done' && result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className={`mb-8 p-5 rounded-xl border-2 flex items-start gap-3 text-[#0F172A] focus:outline-none ${
            result.status === 'sent' ? 'bg-[#ECFDF5] border-[#047857]' : 'bg-[#EFF6FF] border-[#2563EB]'
          }`}
        >
          {result.status === 'sent' ? (
            <CheckCircle2 className="w-6 h-6 text-[#047857] shrink-0" aria-hidden="true" />
          ) : (
            <Info className="w-6 h-6 text-[#2563EB] shrink-0" aria-hidden="true" />
          )}
          <div className="space-y-3">
            <p className="text-base">
              <strong>{result.status === 'sent' ? 'Request sent.' : 'Not sent yet.'}</strong> {result.message}
            </p>
            {result.status === 'sent' && profile.replyNote?.trim() && (
              <p className="text-base text-[#0F172A]">{profile.replyNote.trim()}</p>
            )}
            {result.status === 'not-configured' && mailto && (
              <a
                href={mailto}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base"
              >
                <Mail className="w-4 h-4" aria-hidden="true" /> Email this request
              </a>
            )}
            <div>
              <button
                type="button"
                onClick={() => {
                  setPhase('idle');
                  setResult(null);
                }}
                className="text-sm font-semibold text-[#2563EB] underline underline-offset-2"
              >
                Send another request
              </button>
            </div>
          </div>
        </div>
      )}

      {phase !== 'done' && (
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="@container space-y-8" aria-label={`Book ${profile.artistName}`}>
          <p className="text-sm text-[#64748B]">
            <span aria-hidden="true">*</span> required. Other fields are optional.
          </p>

          {errorCount > 0 && (
            <div role="alert" className="p-4 rounded-xl bg-[#FFF1F2] border-2 border-[#BE123C] text-sm text-[#BE123C]">
              <p className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                {errorCount === 1 ? 'Fix 1 thing to send' : `Fix ${errorCount} things to send`}
              </p>
              <ul className="mt-2 ml-7 list-disc space-y-1">
                {(Object.keys(errors) as (keyof BookingDraft)[])
                  .filter((k) => errors[k])
                  .map((k) => (
                    <li key={k}>
                      <a
                        href={`#${fieldId(k)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(fieldId(k))?.focus();
                        }}
                        className="underline underline-offset-2 font-medium"
                      >
                        {errors[k]}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Honeypot — hidden from people and assistive tech */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              Leave this field empty
              <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
            </label>
          </div>

          <fieldset className="p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wider text-[#2563EB]">1. Event details</legend>
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
              <Field ctx={ctx} name="eventName" label="Event / program title" required>
                {(p) => <input {...p} type="text" maxLength={120} autoComplete="off" value={draft.eventName} onChange={(e) => set('eventName', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="organizer" label="Host church / organization" required>
                {(p) => <input {...p} type="text" maxLength={120} autoComplete="organization" value={draft.organizer} onChange={(e) => set('organizer', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="eventType" label="Event category" optional>
                {(p) => (
                  <select {...p} value={draft.eventType} onChange={(e) => set('eventType', e.target.value)}>
                    {profile.eventCategories.length === 0 && <option value="">General</option>}
                    {profile.eventCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </fieldset>

          <fieldset className="p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wider text-[#2563EB]">2. Schedule, place & budget</legend>
            <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
              <Field ctx={ctx} name="date" label="Event date" required hint="Tap the box to choose a date.">
                {(p) => <input {...p} type="date" min={todayISO()} value={draft.date} onChange={(e) => set('date', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="time" label="Start time" optional>
                {(p) => <input {...p} type="time" value={draft.time} onChange={(e) => set('time', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="feeGHS" label="Honorarium (GHS)" optional hint="Leave empty to discuss.">
                {(p) => (
                  <input {...p} type="number" inputMode="numeric" min={0} step={50} value={draft.feeGHS || ''} placeholder="0" onChange={(e) => set('feeGHS', Number(e.target.value))} />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
              <Field ctx={ctx} name="venue" label="Venue" required>
                {(p) => <input {...p} type="text" maxLength={120} autoComplete="off" value={draft.venue} onChange={(e) => set('venue', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="city" label="City / town" optional>
                {(p) => <input {...p} type="text" maxLength={120} autoComplete="address-level2" value={draft.city} onChange={(e) => set('city', e.target.value)} />}
              </Field>
            </div>
          </fieldset>

          <fieldset className="p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wider text-[#2563EB]">3. Ministry details & contact</legend>
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
              <Field ctx={ctx} name="contactPhone" label="Phone / WhatsApp" required hint="Used only to reply to your request.">
                {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} value={draft.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />}
              </Field>
              <Field ctx={ctx} name="contactEmail" label="Contact email" optional>
                {(p) => <input {...p} type="email" inputMode="email" autoComplete="email" maxLength={160} value={draft.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />}
              </Field>
            </div>
            <Field ctx={ctx} name="notes" label="Ministry details & technical requirements" optional hint={`${draft.notes.length}/2000`}>
              {(p) => (
                <textarea
                  {...p}
                  rows={4}
                  maxLength={2000}
                  value={draft.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className={`${p.className} py-3 min-h-28`}
                />
              )}
            </Field>
          </fieldset>

          {result?.status === 'failed' && (
            <div role="alert" className="p-4 rounded-xl bg-[#FFF1F2] border-2 border-[#BE123C] text-sm text-[#BE123C] flex gap-2 font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{result.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 pt-2">
            {profile.replyNote?.trim() && <p className="text-sm text-[#64748B] sm:text-right">{profile.replyNote.trim()}</p>}
            <button
              type="submit"
              disabled={phase === 'submitting'}
              aria-busy={phase === 'submitting'}
              className="h-12 px-8 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#E2E8F0] disabled:text-[#64748B] disabled:cursor-wait text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              {phase === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" /> Submit
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
