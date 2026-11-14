import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  BookOpen,
  Copy,
  Check,
  Mail,
  AtSign,
  Volume2,
  Music2,
  X,
  ArrowRight,
} from 'lucide-react';
import type { Track, BookingEvent, PortfolioConfig } from '../types/music';
import {
  transposeChordToken,
  transposeLyricsWithBrackets,
  transposeNote,
} from '../utils/soundEngine';
import { BookingForm } from './BookingForm';
import { useDialog } from '../hooks/useDialog';
import { downloadIcs } from '../utils/calendar';
import type { DeliveryResult } from '../utils/emailService';
import type { BookingDraft } from '../utils/validation';
import { Equalizer, SoundWaves, Staff, Vinyl } from './music/MusicMotion';
import { beatSeconds, playResolve, playTapNote, swingDelay } from '../utils/music';
import { formatEventDate, hasAboutContent, safeHttpsUrl, upcomingPublicEvents } from '../utils/content';

const ThreeSoundstage = lazy(() => import('./ThreeSoundstage').then((m) => ({ default: m.ThreeSoundstage })));

interface PublicWebsiteProps {
  profile: PortfolioConfig;
  tracks: Track[];
  bookings: BookingEvent[];
  currentTrack: Track | null;
  isPlaying: boolean;
  padEnabled: boolean;
  onTogglePad: () => void;
  onPlayTrack: (track: Track) => void;
  onSubmitBooking: (booking: BookingDraft) => Promise<DeliveryResult>;
  onNotify: (kind: 'success' | 'info' | 'error', message: string) => void;
}

/** Button looks (docs/ui/EMMA_UI_RESEARCH_AND_DESIGN.md section 8). One primary per view. */
const MOTION_KEY = 'emma_rev_motion_v1';
const TAP_KEY = 'emma_rev_tapnotes_v1';
const BTN_SECONDARY =
  'h-11 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors';
const LINK_TERTIARY =
  'inline-flex items-center gap-1.5 text-base font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline underline-offset-4 min-h-[44px]';

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  profile,
  tracks,
  bookings,
  currentTrack,
  isPlaying,
  padEnabled,
  onTogglePad,
  onPlayTrack,
  onSubmitBooking,
  onNotify,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongForChords, setSelectedSongForChords] = useState<Track | null>(null);
  const [chordTranspose, setChordTranspose] = useState(0);
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  // Background animation: a visitor can pause it (WCAG 2.2.2). The choice is remembered on this device.
  const [motionPaused, setMotionPaused] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MOTION_KEY) === 'off';
    } catch {
      return false;
    }
  });
  const [, setSceneAvailable] = useState(false);

  // Optional "tap notes": a soft note in the current track's key when a button or link is pressed.
  // Off until the visitor turns it on (sound never starts by surprise); the choice is remembered.
  const [tapNotes, setTapNotes] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TAP_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const tapCount = useRef(0);
  const tapKey = currentTrack?.key || 'C';
  useEffect(() => {
    if (!tapNotes) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest('button, a[href], [role="button"]') : null;
      if (!el || el.closest('[data-no-tap]') || (el as HTMLButtonElement).disabled) return;
      playTapNote(tapKey, tapCount.current++);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [tapNotes, tapKey]);
  const toggleTapNotes = () => {
    setTapNotes((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TAP_KEY, next ? 'on' : 'off');
      } catch {
        // storage blocked: lasts for this visit only
      }
      return next;
    });
  };
  const beat = beatSeconds(currentTrack?.bpm);
  const osReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toggleMotion = () => {
    setMotionPaused((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MOTION_KEY, next ? 'off' : 'on');
      } catch {
        // storage blocked: the choice lasts for this visit only
      }
      return next;
    });
  };

  const firstName = profile.artistName.split(' ')[0];
  const releasedTracks = tracks.filter((t) => t.stage === 'Released' || t.featured);
  const visibleTracks = releasedTracks.length > 0 ? releasedTracks : tracks;

  const q = searchQuery.trim().toLowerCase();
  const filteredTracks = visibleTracks.filter((t) => {
    const matchesGenre = selectedGenre === 'All' || t.genre === selectedGenre;
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.lyrics.toLowerCase().includes(q);
    return matchesGenre && matchesSearch;
  });

  const publicEvents = upcomingPublicEvents(bookings);
  const showAbout = hasAboutContent(profile);
  const portraitAlt = `Portrait of ${profile.artistName}`;

  const handleCopyChords = (trackId: string, chords: string) => {
    try {
      void navigator.clipboard.writeText(chords);
    } catch {
      // clipboard blocked: the text stays selectable on the card
    }
    setCopiedTrackId(trackId);
    setTimeout(() => {
      setCopiedTrackId((prev) => (prev === trackId ? null : prev));
    }, 2000);
  };

  const closeSong = () => setSelectedSongForChords(null);
  const dialogRef = useDialog<HTMLDivElement>(selectedSongForChords !== null, closeSong);

  const handleRsvp = (evt: BookingEvent) => {
    if (downloadIcs(evt, profile.artistName)) {
      setRsvpEventId(evt.id);
      onNotify('success', 'Reminder downloaded. Open the .ics file to add it to your calendar.');
      if (tapNotes) playResolve(tapKey);
    } else {
      onNotify('error', 'This event has no valid date yet, so a reminder could not be created.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ ['--beat' as string]: `${beat.toFixed(3)}s` } as React.CSSProperties}
      data-motion={motionPaused ? 'paused' : 'on'}
      className="bg-white text-[#0F172A] relative z-10"
    >
      <p role="status" className="sr-only">
        {isPlaying && currentTrack ? `Now playing ${currentTrack.title}` : ''}
      </p>

      {/* 1. HERO: who is Emma, what next. Two buttons only: Book (primary), Listen (secondary). */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-white border-b border-[#E2E8F0] pt-12 pb-28 lg:py-24">
        <div className="absolute inset-0 w-full h-full z-0 opacity-60 pointer-events-none" aria-hidden="true">
          <Suspense fallback={null}>
            <ThreeSoundstage
              isPlaying={isPlaying}
              bpm={currentTrack?.bpm || 72}
              musicalKey={currentTrack?.key || 'C'}
              paused={motionPaused}
              onAvailable={setSceneAvailable}
            />
          </Suspense>
        </div>

        <SoundWaves playing={isPlaying} />

        {!osReducedMotion && (
          <button
            type="button"
            onClick={toggleMotion}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 h-11 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-[#0F172A] hover:bg-[#EFF6FF] text-sm font-semibold inline-flex items-center gap-2"
          >
            {motionPaused ? <Play className="w-4 h-4" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
            {motionPaused ? 'Play animation' : 'Pause animation'}
          </button>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              {profile.roleBadge && (
                <p className="inline-flex px-4 py-1.5 rounded-full bg-[#EFF6FF] border border-[#E2E8F0] text-[#2563EB] text-sm font-bold tracking-wide uppercase">
                  {profile.roleBadge}
                </p>
              )}

              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#0F172A] tracking-tight leading-[1.1]">
                {profile.artistName}
              </h1>

              {profile.heroTagline && (
                <p className="text-lg text-[#64748B] max-w-2xl leading-relaxed">{profile.heroTagline}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 pt-2">
                <a
                  href="#booking"
                  className="h-12 px-8 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Book {firstName}
                </a>
                {currentTrack && (
                  <button
                    type="button"
                    onClick={() => onPlayTrack(currentTrack)}
                    className="h-12 px-8 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
                    {isPlaying ? 'Pause' : 'Listen'}
                    {isPlaying && <Equalizer playing />}
                  </button>
                )}
              </div>
            </div>

            {profile.portraitUrl && (
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative max-w-md w-full">
                  <Vinyl playing={isPlaying} />
                  <div className="relative z-10 rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] shadow-md">
                  <img
                    src={profile.portraitUrl}
                    alt={portraitAlt}
                    width={864}
                    height={1080}
                    fetchPriority="high"
                    className="w-full h-72 sm:h-96 lg:h-[460px] object-cover object-top bg-white"
                  />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. ABOUT: only exists when the owner has supplied something to say */}
      {showAbout && (
        <section id="epk" aria-labelledby="about-title" className="bg-[#F8FAFC] border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-12 space-y-8">
              <div className="space-y-4 max-w-3xl">
                <h2 id="about-title" className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A]">
                  About {profile.artistName}
                </h2>
                {profile.location && (
                  <p className="inline-flex items-center gap-2 text-base text-[#64748B]">
                    <MapPin className="w-4 h-4 text-[#2563EB]" aria-hidden="true" /> {profile.location}
                  </p>
                )}
                {profile.biography && (
                  <p className="text-base sm:text-lg text-[#0F172A] leading-relaxed whitespace-pre-wrap max-w-prose">
                    {profile.biography}
                  </p>
                )}
                {profile.highlights.length > 0 && (
                  <ul className="space-y-3 text-base text-[#0F172A] pt-2">
                    {profile.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {profile.stageRider.length > 0 && (
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#0F172A] mb-4">Stage rider</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {profile.stageRider.map((rider) => (
                      <div key={rider.id} className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <dt className="text-base font-semibold text-[#0F172A]">{rider.category}</dt>
                        <dd className="text-sm text-[#64748B] mt-1.5 leading-relaxed">{rider.details}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. MUSIC: 3-column card grid, or an honest status with a path forward */}
      <section id="discography" aria-labelledby="music-title" className="bg-white py-16 lg:py-20 border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex items-center gap-5">
              <h2 id="music-title" className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A]">
                Music
              </h2>
              <Staff className="hidden sm:block shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {visibleTracks.length > 0 && (
                <>
                  <label htmlFor="track-search" className="sr-only">
                    Search tracks or lyrics
                  </label>
                  <input
                    id="track-search"
                    type="search"
                    placeholder="Search tracks or lyrics"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="control flex-1 md:flex-none md:w-72"
                  />
                </>
              )}
              <button
                type="button"
                onClick={onTogglePad}
                aria-pressed={padEnabled}
                className={LINK_TERTIARY}
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                {padEnabled ? `Worship Pad on (${currentTrack?.key || 'C'})` : 'Worship Pad'}
              </button>
              <button
                type="button"
                onClick={toggleTapNotes}
                aria-pressed={tapNotes}
                data-no-tap
                className={LINK_TERTIARY}
              >
                <Music2 className="w-4 h-4" aria-hidden="true" />
                {tapNotes ? `Tap notes on (${tapKey})` : 'Tap notes'}
              </button>
            </div>
          </div>

          {visibleTracks.length > 0 && profile.genres.length > 0 && (
            <div role="group" aria-label="Filter by genre" className="flex flex-wrap items-center gap-3 mb-8">
              {['All', ...profile.genres].map((genre) => {
                const selected = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    aria-pressed={selected}
                    className={`h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border-[1.5px] transition-colors ${
                      selected
                        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB] shadow-[inset_0_0_0_1px_#2563EB]'
                        : 'bg-white text-[#0F172A] border-[#64748B] hover:bg-[#EFF6FF]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    {genre}
                  </button>
                );
              })}
            </div>
          )}

          {visibleTracks.length === 0 ? (
            <div className="rounded-2xl p-8 sm:p-10 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] max-w-2xl">
              <h3 className="text-xl font-serif font-bold text-[#0F172A]">Tracks coming soon</h3>
              <p className="text-base text-[#64748B] mt-2">Planning an event?</p>
              <a href="#booking" className={`${LINK_TERTIARY} mt-2`}>
                Book {firstName} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div role="status" className="rounded-2xl p-8 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] max-w-2xl">
              <h3 className="text-xl font-serif font-bold text-[#0F172A]">
                No tracks match{q ? ` "${searchQuery.trim()}"` : ' this filter'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('All');
                }}
                className={`${LINK_TERTIARY} mt-2`}
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isCopied = copiedTrackId === track.id;
                return (
                  <motion.article
                    key={track.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: swingDelay(index) }}
                    className={`relative rounded-2xl p-6 bg-white border transition-shadow flex flex-col justify-between ${
                      isCurrent
                        ? 'border-[#2563EB] shadow-md ring-1 ring-[#2563EB]/20'
                        : 'border-[#E2E8F0] shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isCurrent && isPlaying && <span className="mu-ring" aria-hidden="true" />}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={track.coverUrl || profile.portraitUrl}
                            alt=""
                            width={48}
                            height={48}
                            loading="lazy"
                            className="w-12 h-12 rounded-xl object-cover object-top border border-[#E2E8F0] shrink-0"
                          />
                          <span className="text-sm font-bold uppercase tracking-wider text-[#2563EB]">
                            {track.genre}
                          </span>
                          {isCurrent && <Equalizer playing={isPlaying} />}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#E2E8F0] text-sm font-bold font-mono">
                            Key {track.key}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] text-sm font-semibold font-mono">
                            {track.bpm} BPM
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-serif font-bold text-[#0F172A]">{track.title}</h3>
                      {track.subtitle && <p className="text-sm text-[#64748B] mt-0.5">{track.subtitle}</p>}
                      <p className="text-sm text-[#64748B] mt-1">
                        {track.album && (
                          <>
                            Album: <span className="text-[#0F172A] font-medium">{track.album}</span> •{' '}
                          </>
                        )}
                        {track.duration}
                      </p>

                      {track.chordProgression && (
                        <div className="mt-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-[#64748B]">Chord progression</span>
                            <button
                              type="button"
                              onClick={() => handleCopyChords(track.id, track.chordProgression)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors"
                              aria-label={`Copy chords for ${track.title}`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-4 h-4 text-[#047857]" aria-hidden="true" />
                                  <span className="text-[#047857]" role="status">
                                    Copied
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" aria-hidden="true" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-base font-mono font-bold text-[#0F172A] leading-relaxed break-words">
                            {track.chordProgression}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
                      <button type="button" onClick={() => onPlayTrack(track)} className={`${BTN_SECONDARY} flex-1`}>
                        {isCurrent && isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" aria-hidden="true" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" aria-hidden="true" /> Play
                          </>
                        )}
                        <span className="sr-only"> {track.title}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSongForChords(track);
                          setChordTranspose(0);
                        }}
                        className={`${BTN_SECONDARY} flex-1`}
                      >
                        <BookOpen className="w-4 h-4" aria-hidden="true" />
                        Lyrics &amp; Chords
                        <span className="sr-only"> for {track.title}</span>
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* Song chord and lyric sheet (modal dialog) */}
          <AnimatePresence>
            {selectedSongForChords && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-[#0F172A]/50 flex items-center justify-center p-4"
              >
                <motion.div
                  ref={dialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="sheet-title"
                  initial={{ scale: 0.96, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.96, y: 12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="max-w-3xl w-full rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 max-h-[85vh] overflow-y-auto shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={selectedSongForChords.coverUrl || profile.portraitUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-xl object-cover object-top border border-[#E2E8F0] shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 id="sheet-title" className="text-2xl font-serif font-bold text-[#0F172A]">
                          {selectedSongForChords.title}
                        </h3>
                        <p className="text-sm text-[#64748B]">
                          {selectedSongForChords.album && `${selectedSongForChords.album} • `}
                          {selectedSongForChords.bpm} BPM
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeSong}
                      aria-label="Close chord sheet"
                      className="shrink-0 w-11 h-11 rounded-xl border-[1.5px] border-[#64748B] text-[#0F172A] hover:bg-[#EFF6FF] inline-flex items-center justify-center"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-[#0F172A]">Transpose</span>
                    <button
                      type="button"
                      onClick={() => setChordTranspose((c) => c - 1)}
                      aria-label="-1, down one semitone"
                      className="w-11 h-11 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[1.5px] border-[#64748B] text-sm font-bold"
                    >
                      -1
                    </button>
                    <span className="text-base font-bold text-[#2563EB] min-w-[5rem] text-center" aria-live="polite">
                      Key: {transposeNote(selectedSongForChords.key, chordTranspose)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChordTranspose((c) => c + 1)}
                      aria-label="+1, up one semitone"
                      className="w-11 h-11 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[1.5px] border-[#64748B] text-sm font-bold"
                    >
                      +1
                    </button>
                    {chordTranspose !== 0 && (
                      <button type="button" onClick={() => setChordTranspose(0)} className={LINK_TERTIARY}>
                        Reset
                      </button>
                    )}
                  </div>

                  {(selectedSongForChords.chordProgression || selectedSongForChords.arrangementNotes) && (
                    <div className="mt-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      {selectedSongForChords.chordProgression && (
                        <>
                          <p className="text-sm text-[#64748B] font-semibold mb-1">Chord progression</p>
                          <p className="font-mono text-base text-[#0F172A] font-bold">
                            {transposeChordToken(selectedSongForChords.chordProgression, chordTranspose)}
                          </p>
                        </>
                      )}
                      {selectedSongForChords.arrangementNotes && (
                        <p className="text-base text-[#64748B] mt-2">
                          <strong className="text-[#0F172A]">Arrangement note:</strong>{' '}
                          {selectedSongForChords.arrangementNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedSongForChords.lyrics && (
                    <div className="mt-4 p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#0F172A]">
                      {transposeLyricsWithBrackets(selectedSongForChords.lyrics, chordTranspose)}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => onPlayTrack(selectedSongForChords)} className={BTN_SECONDARY}>
                      <Play className="w-4 h-4" aria-hidden="true" /> Play in the key of {selectedSongForChords.key}
                    </button>
                    <button type="button" onClick={closeSong} className={BTN_SECONDARY}>
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 4. EVENTS */}
      <section id="events" aria-labelledby="events-title" className="bg-[#F8FAFC] py-16 lg:py-20 border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 id="events-title" className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A]">
              Events
            </h2>
            {publicEvents.length > 0 && (
              <a href="#booking" className={LINK_TERTIARY}>
                Book {firstName} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </div>

          {publicEvents.length === 0 ? (
            <div className="rounded-2xl p-8 sm:p-10 bg-white border border-dashed border-[#CBD5E1] max-w-2xl">
              <h3 className="text-xl font-serif font-bold text-[#0F172A]">No dates announced yet</h3>
              <p className="text-base text-[#64748B] mt-2">Planning an event?</p>
              <a href="#booking" className={`${LINK_TERTIARY} mt-2`}>
                Book {firstName} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {publicEvents.map((evt) => (
                <article
                  key={evt.id}
                  className="rounded-2xl p-6 sm:p-8 bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md flex flex-col justify-between gap-5 transition-shadow"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#E2E8F0]">
                        {evt.eventType}
                      </span>
                      {evt.status === 'Confirmed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {evt.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#0F172A]">{evt.eventName}</h3>
                    {evt.organizer && (
                      <p className="text-sm text-[#64748B] mt-1">
                        Host: <strong className="text-[#0F172A]">{evt.organizer}</strong>
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-[#0F172A]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" aria-hidden="true" />
                        <span>
                          {formatEventDate(evt.date)} {evt.time && `• ${evt.time}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" aria-hidden="true" />
                        <span>
                          {evt.venue}
                          {evt.city ? `, ${evt.city}` : ''}
                        </span>
                      </div>
                    </div>
                    {evt.notes && <p className="text-base text-[#64748B] mt-3 leading-relaxed">{evt.notes}</p>}
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => handleRsvp(evt)}
                      aria-label={`RSVP / Reminder for ${evt.eventName}`}
                      className={`${BTN_SECONDARY} h-12 w-full sm:w-auto sm:px-6`}
                    >
                      {rsvpEventId === evt.id ? (
                        <>
                          <Check className="w-4 h-4" aria-hidden="true" /> Reminder saved
                        </>
                      ) : (
                        'RSVP / Reminder'
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. BOOK: spacious #F8FAFC container, contact shown prominently, one primary button */}
      <section id="booking" aria-labelledby="booking-title" className="bg-white py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm p-6 sm:p-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-[#E2E8F0]">
              <div>
                <h2 id="booking-title" className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A]">
                  Book {profile.artistName}
                </h2>
                <p className="text-base text-[#64748B] mt-2 max-w-xl">
                  Tell {firstName} about your event. The five fields marked * are all that is needed to reply.
                </p>
              </div>

              {(profile.tiktokHandle || profile.emailHandle) && (
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-sm space-y-1.5 shrink-0">
                  <p className="font-semibold text-[#0F172A]">Or contact directly</p>
                  {profile.tiktokHandle && (
                    <p className="text-[#0F172A] flex">
                      {safeHttpsUrl(profile.tiktokUrl) ? (
                        <a
                          href={safeHttpsUrl(profile.tiktokUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-[#2563EB] hover:underline underline-offset-4"
                        >
                          <AtSign className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                          <strong>TikTok:</strong> {profile.tiktokHandle}
                        </a>
                      ) : (
                        <>
                          <strong>TikTok:</strong> {profile.tiktokHandle}
                        </>
                      )}
                    </p>
                  )}
                  {profile.emailHandle && (
                    <p className="text-[#0F172A] flex">
                      {profile.emailAddress ? (
                        <a
                          href={`mailto:${profile.emailAddress}`}
                          className="inline-flex items-center gap-1.5 hover:text-[#2563EB] hover:underline underline-offset-4"
                        >
                          <Mail className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                          <strong>Email:</strong> {profile.emailHandle}
                        </a>
                      ) : (
                        <>
                          <strong>Email:</strong> {profile.emailHandle}
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <BookingForm profile={profile} onSubmit={onSubmitBooking} />
          </div>
        </div>
      </section>
    </motion.div>
  );
};
