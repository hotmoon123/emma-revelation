import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Menu, X, Mail, AtSign, WifiOff, Calendar } from 'lucide-react';
import type { PortfolioConfig, Track, BookingEvent } from './types/music';
import { PublicWebsite } from './components/PublicWebsite';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastHost, useToasts } from './components/ui/ToastHost';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePlayer } from './hooks/usePlayer';
import { portfolioRepository } from './data/repositories';
import type { BookingDraft } from './utils/validation';
import { sendBookingInquiry, type DeliveryResult } from './utils/emailService';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { useDialog } from './hooks/useDialog';
import { hasAboutContent, tiktokProfileUrl } from './utils/content';
import { usableMedia } from './utils/media';
import { isOwnerBrowser, loadPublishedContent } from './utils/publish';
import { Playhead } from './components/music/MusicMotion';
import { SmartImage } from './components/ui/SmartImage';
import { PublicSkeleton } from './components/PublicSkeleton';

/**
 * THE VISITOR SITE (entry: index.html -> main.tsx).
 * It contains no Studio code and no link to Studio: the owner's tools live in their own page and bundle (/studio/).
 * Hiding them is a convenience, not security: there is no backend, and nothing private is published (see publish.ts).
 */
const initialSnapshot = portfolioRepository.load();

export function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);
  const menuRef = useDialog<HTMLDivElement>(mobileMenuOpen, closeMenu);

  const [profile, setProfile] = useState<PortfolioConfig>(() => initialSnapshot.profile);
  const [tracks, setTracks] = useState<Track[]>(() => initialSnapshot.tracks);
  const [bookings, setBookings] = useState<BookingEvent[]>(() => initialSnapshot.bookings);
  const setlistsRef = useRef(initialSnapshot.setlists);

  const firstName = profile.artistName.split(' ')[0];
  const showAbout = hasAboutContent(profile);
  const showMedia = usableMedia(profile.media).length > 0;
  const online = useOnlineStatus();
  const { toasts, notify, dismiss } = useToasts();
  const player = usePlayer(tracks, (m) => notify('error', m));

  // Visitors see a skeleton until content.json answers (it gives up after 5 s). The owner's own browser has local data at once.
  const [contentLoading, setContentLoading] = useState(() => !isOwnerBrowser());

  // Only the owner's browser keeps a local copy (so test inquiries show up in Studio). Visitors store nothing.
  useEffect(() => {
    if (isOwnerBrowser()) portfolioRepository.save({ profile, tracks, bookings, setlists: setlistsRef.current });
  }, [profile, tracks, bookings]);

  // Visitors see the owner's PUBLISHED content (public/content.json). Owner browsers keep their own local copy.
  useEffect(() => {
    if (isOwnerBrowser()) return;
    let cancelled = false;
    void loadPublishedContent().then((published) => {
      if (cancelled) return;
      setContentLoading(false);
      if (!published) return;
      setProfile(published.profile);
      setTracks(published.tracks);
      setBookings(published.bookings);
      setlistsRef.current = published.setlists;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmitBooking = async (inquiry: BookingDraft): Promise<DeliveryResult> => {
    const newBooking: BookingEvent = { ...inquiry, id: `bk-${Date.now()}`, status: 'Inquiry', depositPaid: false, isPublic: false };
    setBookings((prev) => [newBooking, ...prev]);
    const outcome = await sendBookingInquiry(profile, inquiry);
    if (outcome.status === 'failed') setBookings((prev) => prev.filter((b) => b.id !== newBooking.id)); // a retry re-adds it
    return outcome;
  };

  const { currentTrack, isPlaying } = player;

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen flex flex-col bg-white text-[#0F172A] selection:bg-[#2563EB] selection:text-white relative">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      {!online && (
        <div role="status" className="bg-[#0F172A] text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          You are offline. Sending a booking request needs a connection.
        </div>
      )}
      {/* Header: logo, About (only when it has content), Music, Events, one primary button. Nothing else (UX spec section 5). */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={`${profile.artistName}, go to home`}
            className="flex items-center gap-3 cursor-pointer text-left min-w-0"
          >
            <SmartImage
              src={profile.avatarUrl}
              alt=""
              width={44}
              height={44}
              priority
              sizes="44px"
              wrapperClassName="w-11 h-11 shrink-0 rounded-xl"
              className="w-11 h-11 rounded-xl object-cover border border-[#2563EB]"
            />
            <span className="min-w-0">
              <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#0F172A] block leading-none truncate">
                {profile.artistName.toUpperCase()}
              </span>
              <span className="hidden 2xl:block text-xs uppercase tracking-widest text-[#64748B] font-semibold mt-1 truncate max-w-[18rem]">
                {profile.roleBadge}
              </span>
            </span>
          </button>

          {(
            <>
              <nav aria-label="Primary" className="hidden md:flex items-center gap-7 whitespace-nowrap text-sm font-semibold text-[#64748B]">
                {showAbout && (
                  <a href="#epk" className="hover:text-[#2563EB]">
                    About
                  </a>
                )}
                <a href="#discography" className="hover:text-[#2563EB]">
                  Music
                </a>
                <a href="#events" className="hover:text-[#2563EB]">
                  Events
                </a>
                {showMedia && (
                  <a href="#media" className="hover:text-[#2563EB]">
                    Media
                  </a>
                )}
              </nav>

              <a
                href="#booking"
                className="hidden md:inline-flex h-11 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm items-center gap-2 transition-colors"
              >
                Book {firstName}
              </a>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label="Menu"
                className="md:hidden w-11 h-11 rounded-xl bg-white border-[1.5px] border-[#64748B] text-[#0F172A] inline-flex items-center justify-center"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <Playhead />

        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-[#E2E8F0] shadow-lg px-4 pb-5 pt-2"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="w-11 h-11 rounded-xl border-[1.5px] border-[#64748B] text-[#0F172A] inline-flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col">
              {showAbout && (
                <a href="#epk" onClick={closeMenu} className="py-3 text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0]">
                  About
                </a>
              )}
              <a href="#discography" onClick={closeMenu} className="py-3 text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0]">
                Music
              </a>
              <a href="#events" onClick={closeMenu} className="py-3 text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0]">
                Events
              </a>
              {showMedia && (
                <a href="#media" onClick={closeMenu} className="py-3 text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0]">
                  Media
                </a>
              )}
              <a
                href="#booking"
                onClick={closeMenu}
                className="mt-4 h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base inline-flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" aria-hidden="true" /> Book {firstName}
              </a>
            </nav>
          </div>
        )}
      </header>


      {/* Main content: pb-32 keeps the fixed bottom audio player from ever hiding content */}
      <main id="main" tabIndex={-1} className="flex-1 pb-32 relative z-10 focus:outline-none">
        <ErrorBoundary label="The portfolio">
          <AnimatePresence mode="wait">
            {contentLoading ? (
              <PublicSkeleton key="public-skeleton" />
            ) : (
              <PublicWebsite
                key="public-view"
                profile={profile}
                tracks={tracks}
                bookings={bookings}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={player.playTrack}
                onSubmitBooking={handleSubmitBooking}
                padEnabled={player.padEnabled}
                onTogglePad={player.togglePad}
                onNotify={notify}
              />
            )}
          </AnimatePresence>
        </ErrorBoundary>

        {/* Footer: contact, then the quiet Studio entry last */}
        <footer className="border-t border-[#E2E8F0] bg-white py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-[#64748B]">
            <p className="font-serif font-bold text-[#0F172A] text-base">
              © {new Date().getFullYear()} {profile.artistName}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {profile.tiktokHandle && tiktokProfileUrl(profile.tiktokHandle, profile.tiktokUrl) && (
                <a
                  href={tiktokProfileUrl(profile.tiktokHandle, profile.tiktokUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline underline-offset-4"
                >
                  <AtSign className="w-4 h-4" aria-hidden="true" />
                  <span>TikTok: {profile.tiktokHandle}</span>
                </a>
              )}
              {profile.emailHandle && profile.emailAddress && (
                <a
                  href={`mailto:${profile.emailAddress}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline underline-offset-4"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  <span>Email: {profile.emailHandle}</span>
                </a>
              )}
            </div>
          </div>
        </footer>
      </main>

      <AudioPlayerBar
        profile={profile}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progressSec={player.progressSec}
        volume={player.volume}
        onTogglePlay={player.togglePlay}
        onNext={player.next}
        onPrev={player.prev}
        onSeek={player.handleSeek}
        onVolumeChange={player.handleVolumeChange}
      />
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </div>
    </MotionConfig>
  );
}

export default App;
