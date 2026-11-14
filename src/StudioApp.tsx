import { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowLeft, Info, ShieldAlert } from 'lucide-react';
import type { PortfolioConfig, Track, BookingEvent, Setlist, ProductionStage } from './types/music';
import { INITIAL_PORTFOLIO_CONFIG, INITIAL_TRACKS, INITIAL_BOOKINGS, INITIAL_SETLISTS } from './data/initialData';
import { ManagementDashboard } from './components/ManagementDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastHost, useToasts } from './components/ui/ToastHost';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { portfolioRepository } from './data/repositories';
import { usePlayer } from './hooks/usePlayer';
import type { PortfolioBackup } from './utils/validation';
import { markOwnerBrowser } from './utils/publish';

/**
 * THE OWNER STUDIO (entry: studio/index.html -> studio-main.tsx), a separate page and bundle from the visitor site.
 * It edits THIS browser's copy of the content. It is not a password-protected area: with no backend there is
 * nothing to protect. What keeps visitors out of the way is that the public site never links here.
 */
const initialSnapshot = portfolioRepository.load();

export function StudioApp() {
  const [profile, setProfile] = useState<PortfolioConfig>(() => initialSnapshot.profile);
  const [tracks, setTracks] = useState<Track[]>(() => initialSnapshot.tracks);
  const [bookings, setBookings] = useState<BookingEvent[]>(() => initialSnapshot.bookings);
  const [setlists, setSetlists] = useState<Setlist[]>(() => initialSnapshot.setlists);
  const { toasts, notify, dismiss } = useToasts();
  const storageWarned = useRef(false);
  const player = usePlayer(tracks, (m) => notify('error', m));

  // This browser now holds the owner's copy: the public page here shows it instead of the published file.
  useEffect(() => markOwnerBrowser(), []);

  useEffect(() => {
    const saved = portfolioRepository.save({ profile, tracks, bookings, setlists });
    if (!saved && !storageWarned.current) {
      storageWarned.current = true;
      notify('error', 'Your browser is blocking storage, so changes will be lost on refresh. Export a JSON backup.');
    }
  }, [profile, tracks, bookings, setlists, notify]);

  const undoable = <T extends { id: string }>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    label: (x: T) => string
  ) => {
    const removed = list.find((x) => x.id === id);
    if (!removed) return;
    setList((prev) => prev.filter((x) => x.id !== id));
    notify('info', `Removed ${label(removed)}.`, {
      label: 'Undo',
      run: () => setList((prev) => (prev.some((x) => x.id === removed.id) ? prev : [removed, ...prev])),
    });
  };

  const handlers = {
    onUpdateTrackStage: (trackId: string, stage: ProductionStage) =>
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, stage } : t))),
    onAddTrack: (data: Omit<Track, 'id' | 'streams'>) => {
      const created: Track = { ...data, id: `tr-${Date.now()}`, streams: 0 };
      setTracks((prev) => [created, ...prev]);
      player.setCurrentTrack(created);
    },
    onDeleteTrack: (id: string) => undoable(tracks, setTracks, id, (t) => `"${t.title}"`),
    onAddBooking: (data: Omit<BookingEvent, 'id'>) => setBookings((prev) => [{ ...data, id: `bk-${Date.now()}` }, ...prev]),
    onUpdateBookingStatus: (id: string, status: BookingEvent['status']) =>
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? // A declined or cancelled event must never stay on the public site.
              { ...b, status, isPublic: status === 'Declined' ? false : b.isPublic }
            : b
        )
      ),
    onToggleBookingPublic: (id: string) => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, isPublic: !b.isPublic } : b))),
    onDeleteBooking: (id: string) => undoable(bookings, setBookings, id, (b) => `"${b.eventName}"`),
    onAddSetlist: (data: Omit<Setlist, 'id'>) => setSetlists((prev) => [{ ...data, id: `set-${Date.now()}` }, ...prev]),
    onDeleteSetlist: (id: string) => undoable(setlists, setSetlists, id, (x) => `setlist "${x.title}"`),
    onImportBackup: (backup: PortfolioBackup) => {
      setProfile(backup.profile);
      setTracks(backup.tracks);
      setBookings(backup.bookings);
      setSetlists(backup.setlists);
      player.resetPlayer(backup.tracks[0] ?? null);
      notify('success', 'Backup imported.');
    },
    onResetDemoData: () => {
      portfolioRepository.clear();
      setProfile(INITIAL_PORTFOLIO_CONFIG);
      setTracks(INITIAL_TRACKS);
      setBookings(INITIAL_BOOKINGS);
      setSetlists(INITIAL_SETLISTS);
      player.resetPlayer(null);
      notify('info', 'All stored content was cleared.');
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-white text-[#0F172A] selection:bg-[#2563EB] selection:text-white">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#2563EB] text-[#2563EB] text-sm font-bold uppercase tracking-widest shrink-0">
                Owner only
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[#0F172A] truncate">{profile.artistName} Studio</span>
            </div>
            <a
              href="/"
              className="h-11 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] text-sm font-semibold inline-flex items-center gap-2 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> View public site
            </a>
          </div>
        </header>

        <div role="region" aria-label="Owner mode" className="bg-[#EFF6FF] border-b border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-2 text-sm font-semibold text-[#0F172A]">
            <Info className="w-5 h-5 text-[#2563EB] shrink-0" aria-hidden="true" />
            <p>
              You are editing this browser&apos;s copy of the content.{' '}
              <span className="font-normal text-[#64748B]">
                There is no password here and no server: visitors see your changes only after you publish.
              </span>
            </p>
          </div>
        </div>

        <main id="main" tabIndex={-1} className="flex-1 pb-32 focus:outline-none">
          <ErrorBoundary label="The content manager">
            <ManagementDashboard
              profile={profile}
              tracks={tracks}
              bookings={bookings}
              setlists={setlists}
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              onUpdateProfile={setProfile}
              onPlayTrack={player.playTrack}
              onNotify={notify}
              {...handlers}
            />
          </ErrorBoundary>
          <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 text-sm text-[#64748B] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            Private details (phone numbers, fees, inquiries, setlists) are never written to the file you publish.
          </p>
        </main>

        <AudioPlayerBar
          profile={profile}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
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

export default StudioApp;
