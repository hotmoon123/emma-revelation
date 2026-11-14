import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Music2,
  ListMusic,
  CalendarCheck,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  FileText,
  Printer,
  Clock,
  Sliders,
  Download,
  Upload,
} from 'lucide-react';
import type {
  PortfolioConfig,
  Track,
  BookingEvent,
  Setlist,
  ProductionStage,
  MusicalKey,
} from '../types/music';
import { useDialog } from '../hooks/useDialog';
import { parsePortfolioBackup, type PortfolioBackup } from '../utils/validation';
import { buildPublishedContent } from '../utils/publish';
import {
  transposeChordToken,
  transposeLyricsWithBrackets,
  transposeNote,
} from '../utils/soundEngine';

interface ManagementDashboardProps {
  profile: PortfolioConfig;
  tracks: Track[];
  bookings: BookingEvent[];
  setlists: Setlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onUpdateProfile: (profile: PortfolioConfig) => void;
  onPlayTrack: (track: Track) => void;
  onUpdateTrackStage: (trackId: string, stage: ProductionStage) => void;
  onAddTrack: (track: Omit<Track, 'id' | 'streams'>) => void;
  onDeleteTrack: (trackId: string) => void;
  onAddBooking: (booking: Omit<BookingEvent, 'id'>) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingEvent['status']) => void;
  onToggleBookingPublic: (bookingId: string) => void;
  onDeleteBooking: (bookingId: string) => void;
  onAddSetlist: (setlist: Omit<Setlist, 'id'>) => void;
  onDeleteSetlist: (id: string) => void;
  onResetDemoData: () => void;
  onImportBackup: (backup: PortfolioBackup) => void;
  onNotify: (kind: 'success' | 'info' | 'error', message: string) => void;
}

type DashboardTab = 'profile' | 'studio' | 'setlists' | 'bookings';

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({
  profile,
  tracks,
  bookings,
  setlists,
  currentTrack,
  isPlaying,
  onUpdateProfile,
  onPlayTrack,
  onUpdateTrackStage,
  onAddTrack,
  onDeleteTrack,
  onAddBooking,
  onUpdateBookingStatus,
  onToggleBookingPublic,
  onDeleteBooking,
  onAddSetlist,
  onDeleteSetlist,
  onResetDemoData,
  onImportBackup,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>(
    setlists[0]?.id || ''
  );
  const [transposeOffset, setTransposeOffset] = useState<number>(0);

  // New Stage Rider Item State
  const [riderCategory, setRiderCategory] = useState('');
  const [riderDetails, setRiderDetails] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  // New Track Modal State (No hardcoded dummy song values)
  const [showNewTrackModal, setShowNewTrackModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [newTrack, setNewTrack] = useState<Omit<Track, 'id' | 'streams'>>({
    title: '',
    subtitle: '',
    album: '',
    genre: profile.genres[0] || 'Prophetic Worship',
    key: 'C',
    bpm: 72,
    duration: '0:00',
    durationSeconds: 240,
    stage: 'Released',
    releaseDate: '',
    featured: true,
    chordProgression: '',
    lyrics: '',
    arrangementNotes: '',
    coverGradient: 'from-blue-700 to-slate-900',
  });

  // New Event Modal State
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const trackDialogRef = useDialog<HTMLDivElement>(showNewTrackModal, () => setShowNewTrackModal(false));
  const eventDialogRef = useDialog<HTMLDivElement>(showNewEventModal, () => setShowNewEventModal(false));
  const [newEvent, setNewEvent] = useState<Omit<BookingEvent, 'id'>>({
    eventName: '',
    organizer: '',
    contactPhone: '',
    contactEmail: '',
    venue: '',
    city: '',
    date: '',
    time: '',
    eventType: profile.eventCategories[0] || 'Church Ministration',
    status: 'Confirmed',
    feeGHS: 0,
    depositPaid: true,
    isPublic: true,
    notes: '',
  });

  // New Setlist State
  const [newSetlistTitle, setNewSetlistTitle] = useState('');
  const [newSetlistVenue, setNewSetlistVenue] = useState('');
  const [newSetlistDate, setNewSetlistDate] = useState('');
  const [newSetlistNotes, setNewSetlistNotes] = useState('');
  const [selectedSetlistTrackIds, setSelectedSetlistTrackIds] = useState<string[]>([]);

  const isFirstUse =
    tracks.length === 0 && bookings.length === 0 && !profile.biography && !profile.heroTagline && profile.highlights.length === 0;

  const activeSetlist =
    setlists.find((s) => s.id === selectedSetlistId) || setlists[0];

  const handleAddRiderItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderCategory || !riderDetails) return;
    onUpdateProfile({
      ...profile,
      stageRider: [
        ...profile.stageRider,
        { id: `sr-${Date.now()}`, category: riderCategory, details: riderDetails },
      ],
    });
    setRiderCategory('');
    setRiderDetails('');
  };

  const handleRemoveRiderItem = (id: string) => {
    onUpdateProfile({
      ...profile,
      stageRider: profile.stageRider.filter((r) => r.id !== id),
    });
  };

  const handleAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlight.trim()) return;
    onUpdateProfile({
      ...profile,
      highlights: [...profile.highlights, newHighlight.trim()],
    });
    setNewHighlight('');
  };

  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrack.title) return;
    onAddTrack(newTrack);
    setShowNewTrackModal(false);
    setNewTrack({
      ...newTrack,
      title: '',
      subtitle: '',
      album: '',
      chordProgression: '',
      lyrics: '',
      arrangementNotes: '',
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.eventName || !newEvent.date) return;
    onAddBooking(newEvent);
    setShowNewEventModal(false);
    setNewEvent({
      ...newEvent,
      eventName: '',
      organizer: '',
      venue: '',
      city: '',
      date: '',
      time: '',
      notes: '',
    });
  };

  const handleCreateSetlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistTitle || selectedSetlistTrackIds.length === 0) return;
    onAddSetlist({
      title: newSetlistTitle,
      eventDate: newSetlistDate,
      venue: newSetlistVenue,
      trackIds: selectedSetlistTrackIds,
      bandNotes: newSetlistNotes,
    });
    setNewSetlistTitle('');
    setNewSetlistVenue('');
    setNewSetlistDate('');
    setNewSetlistNotes('');
  };

  const handleExportJSON = () => {
    const payload = {
      profile,
      tracks,
      bookings,
      setlists,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emma-revelation-portfolio-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPublished = () => {
    const payload = buildPublishedContent({ profile, tracks, bookings, setlists });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'content.json downloaded. Replace public/content.json with it, then deploy.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      onNotify('error', 'Please choose a .json backup exported from this app.');
      return;
    }
    const result = parsePortfolioBackup(await file.text());
    if (!result.ok) {
      onNotify('error', result.error);
      return;
    }
    if (!window.confirm('Import this backup? It will replace the profile, tracks, setlists and bookings currently stored in this browser.')) return;
    onImportBackup(result.data);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear ALL profile, track, setlist and booking data from this browser? Export a backup first if you may need it.')) {
      onResetDemoData();
    }
  };

  const stages: ProductionStage[] = [
    'Idea & Demo',
    'Recording',
    'Mixing',
    'Mastering',
    'Released',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative z-10"
    >
      {/* Studio header: one primary action; the rest are secondary */}
      <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A]">Studio</h1>
          <p className="text-base text-[#64748B] mt-1 max-w-3xl">
            Update {profile.artistName}&apos;s profile, music and events. Changes are saved in this browser. Visitors see them only
            after you use <strong className="text-[#0F172A]">Export for publishing</strong> and replace{' '}
            <code className="font-mono text-sm">public/content.json</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNewTrackModal(true)}
            className="h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add track
          </button>
          <button
            type="button"
            onClick={() => setShowNewEventModal(true)}
            className="h-12 px-5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] font-semibold text-base flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add event
          </button>
          <button
            type="button"
            onClick={handleExportPublished}
            className="h-12 px-5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] font-semibold text-base flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" aria-hidden="true" /> Export for publishing
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="h-12 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[1.5px] border-[#64748B] font-semibold text-sm flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-[#2563EB]" aria-hidden="true" /> Backup (all data)
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="h-12 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[1.5px] border-[#64748B] font-semibold text-sm flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4 text-[#2563EB]" aria-hidden="true" /> Restore backup
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="h-12 px-4 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#BE123C] border-[1.5px] border-[#BE123C] font-semibold text-sm flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Clear all data
          </button>
        </div>

        {isFirstUse && (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-5">
            <h2 className="text-lg font-serif font-bold text-[#0F172A]">How this works</h2>
            <ol className="mt-2 space-y-1.5 text-base text-[#0F172A] list-decimal ml-5">
              <li>Fill in <strong>1. Profile</strong>: tagline, biography and stage rider (the About section appears once it has text).</li>
              <li>Add your songs in <strong>2. Tracks</strong> and your dates in <strong>4. Events</strong>. Mark a date <em>Shown on Site</em> to make it public.</li>
              <li>Press <strong>Export for publishing</strong>, replace <code className="font-mono text-sm">public/content.json</code> with the file, and deploy.</li>
            </ol>
            <p className="text-sm text-[#64748B] mt-3">
              Studio is not a password-protected area: anyone who opens it only changes their own browser&apos;s copy.
            </p>
          </div>
        )}
      </div>

      {/* Sub-navigation: selected = soft fill + accent border (never a second solid-blue button) */}
      <div role="group" aria-label="Studio sections" className="flex items-center gap-2.5 overflow-x-auto pb-2">
        {[
          { id: 'profile', label: '1. Profile & stage rider', icon: UserCheck },
          { id: 'studio', label: `2. Tracks (${tracks.length})`, icon: Sliders },
          { id: 'setlists', label: `3. Setlists (${setlists.length})`, icon: ListMusic },
          { id: 'bookings', label: `4. Events & inquiries (${bookings.length})`, icon: CalendarCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              aria-pressed={active}
              className={`h-12 px-5 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-[1.5px] transition-colors ${
                active
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB] shadow-[inset_0_0_0_1px_#2563EB]'
                  : 'bg-white text-[#0F172A] border-[#64748B] hover:bg-[#EFF6FF]'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFILE, BIOGRAPHY & STAGE RIDER EDITOR */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-[#0F172A]">
              Artist Identity, Contact & Biography
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f1">
                  Artist Name
                </label>
                <input id="dash-f1"
                  type="text"
                  value={profile.artistName}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, artistName: e.target.value })
                  }
                  className="w-full h-12 px-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f2">
                  Role Badge
                </label>
                <input id="dash-f2"
                  type="text"
                  value={profile.roleBadge}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, roleBadge: e.target.value })
                  }
                  className="w-full h-12 px-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f3">
                  TikTok Handle
                </label>
                <input id="dash-f3"
                  type="text"
                  value={profile.tiktokHandle}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, tiktokHandle: e.target.value })
                  }
                  className="w-full h-12 px-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f4">
                  Email Display Handle
                </label>
                <input id="dash-f4"
                  type="text"
                  value={profile.emailHandle}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, emailHandle: e.target.value })
                  }
                  className="w-full h-12 px-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f5">
                Hero Statement / Tagline
              </label>
              <textarea id="dash-f5"
                rows={2}
                placeholder="Enter your hero tagline..."
                value={profile.heroTagline}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, heroTagline: e.target.value })
                }
                className="w-full p-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="dash-f6">
                Full Artist & Musical Director Biography
              </label>
              <textarea id="dash-f6"
                rows={5}
                placeholder="Paste or type your official biography here..."
                value={profile.biography}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, biography: e.target.value })
                }
                className="w-full p-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base text-[#0F172A]"
              />
            </div>

            {/* Key Highlights */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
              <label htmlFor="dash-highlight" className="block text-sm font-semibold text-[#0F172A]">
                Key Bullet Highlights ({profile.highlights.length})
              </label>
              <form onSubmit={handleAddHighlight} className="flex gap-2">
                <input
                  id="dash-highlight"
                  type="text"
                  placeholder="Add a ministry or Musical Director highlight..."
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
                >
                  + Add
                </button>
              </form>
              <div className="space-y-2">
                {profile.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-sm"
                  >
                    <span>{h}</span>
                    <button
                      onClick={() =>
                        onUpdateProfile({
                          ...profile,
                          highlights: profile.highlights.filter((_, idx) => idx !== i),
                        })
                      }
                      aria-label={`Remove highlight: ${h}`}
                      className="text-[#BE123C] font-semibold hover:underline ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Technical Stage Rider Builder */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-[#0F172A]">
              Technical Stage Rider Builder
            </h2>
            <p className="text-sm text-[#64748B]">
              Add your Vocal/Monitoring, Keyboard Rig, and Band requirements.
            </p>

            <form onSubmit={handleAddRiderItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f7">
                  Rider Category *
                </label>
                <input id="dash-f7"
                  type="text"
                  required
                  placeholder="e.g. Keyboard Rig / Vocal Monitoring / Full Band"
                  value={riderCategory}
                  onChange={(e) => setRiderCategory(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f8">
                  Technical Specifications *
                </label>
                <textarea id="dash-f8"
                  rows={3}
                  required
                  placeholder="Enter equipment, IEM channels, DI boxes, or stage needs..."
                  value={riderDetails}
                  onChange={(e) => setRiderDetails(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition"
              >
                + Add Stage Rider Card
              </button>
            </form>

            <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
              {profile.stageRider.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-4">
                  No stage rider items added yet.
                </p>
              ) : (
                profile.stageRider.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{item.category}</p>
                      <p className="text-sm text-[#64748B] mt-1">{item.details}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveRiderItem(item.id)}
                      aria-label={`Remove ${item.category}`}
                      className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#BE123C] hover:bg-[#FFF1F2]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDIO PRODUCTION PIPELINE & TRACK MANAGER */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                Tracks, Chord Sheets & Studio Pipeline
              </h2>
              <p className="text-sm text-[#64748B]">
                Add songs, keys, BPMs, chord progressions, and lyrics.
              </p>
            </div>
            <button
              onClick={() => setShowNewTrackModal(true)}
              className="h-12 px-5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] font-semibold text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add track
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stages.map((stage) => {
              const stageTracks = tracks.filter((t) => t.stage === stage);
              return (
                <div
                  key={stage}
                  className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-4 flex flex-col justify-between min-h-[320px]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E2E8F0]">
                      <span className="text-sm font-bold text-[#0F172A]">
                        {stage}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#E2E8F0] text-xs font-bold">
                        {stageTracks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {stageTracks.map((track) => (
                        <div
                          key={track.id}
                          className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs text-[#2563EB] font-mono font-bold">
                            <span>Key {track.key}</span>
                            <span>{track.bpm} BPM</span>
                          </div>
                          <p className="text-sm font-bold text-[#0F172A]">
                            {track.title}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {track.genre}
                          </p>

                          <div className="pt-2 flex items-center justify-between gap-1">
                            <button
                              onClick={() => onPlayTrack(track)}
                              className="px-3 rounded-lg bg-white hover:bg-[#EFF6FF] border-[1.5px] border-[#2563EB] text-[#2563EB] text-xs font-semibold flex items-center gap-1"
                            >
                              {currentTrack?.id === track.id && isPlaying ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Play
                            </button>

                            <select
                            aria-label={`Stage for ${track.title}`}
                              value={track.stage}
                              onChange={(e) =>
                                onUpdateTrackStage(
                                  track.id,
                                  e.target.value as ProductionStage
                                )
                              }
                              className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[10px] text-[#0F172A]"
                            >
                              {stages.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => onDeleteTrack(track.id)}
                              className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#BE123C] hover:bg-[#FFF1F2]"
                              aria-label={`Delete ${track.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SETLIST & REAL-TIME CHORD TRANSPOSER */}
      {activeTab === 'setlists' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <h2 className="text-base font-serif font-bold text-[#0F172A] flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#2563EB]" /> Saved MD Setlists ({setlists.length})
              </h2>
              {setlists.length === 0 ? (
                <p className="text-sm text-[#64748B]">
                  No setlists created yet. Use the form below to build a worship setlist from your tracks.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {setlists.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSetlistId(s.id);
                        setTransposeOffset(0);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        activeSetlist?.id === s.id
                          ? 'bg-[#EFF6FF] border-[#2563EB]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{s.title}</p>
                        <p className="text-sm text-[#64748B]">
                          {s.eventDate} • {s.trackIds.length} songs
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSetlist(s.id);
                        }}
                        aria-label={`Delete setlist ${s.title}`}
                        className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#BE123C] hover:bg-[#FFF1F2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleCreateSetlist}
              className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2563EB]" /> Build New Worship Setlist
              </h3>
              <div>
                <label className="block text-sm text-[#64748B] font-semibold mb-1" htmlFor="dash-f9">
                  Setlist Name *
                </label>
                <input id="dash-f9"
                  type="text"
                  required
                  placeholder="Enter setlist title..."
                  value={newSetlistTitle}
                  onChange={(e) => setNewSetlistTitle(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#64748B] font-semibold mb-1" htmlFor="dash-f10">
                    Date
                  </label>
                  <input id="dash-f10"
                    type="date"
                    value={newSetlistDate}
                    onChange={(e) => setNewSetlistDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748B] font-semibold mb-1" htmlFor="dash-f11">
                    Venue
                  </label>
                  <input id="dash-f11"
                    type="text"
                    placeholder="Enter venue..."
                    value={newSetlistVenue}
                    onChange={(e) => setNewSetlistVenue(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#64748B] font-semibold mb-1" htmlFor="dash-f12">
                  MD Notes
                </label>
                <input id="dash-f12"
                  type="text"
                  placeholder="Enter transition or band cues..."
                  value={newSetlistNotes}
                  onChange={(e) => setNewSetlistNotes(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>
              <div>
                <p className="block text-sm text-[#64748B] font-semibold mb-1.5">
                  Select Songs ({tracks.length} available)
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {tracks.map((t) => {
                    const checked = selectedSetlistTrackIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 text-sm text-[#0F172A] p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setSelectedSetlistTrackIds(
                                selectedSetlistTrackIds.filter((id) => id !== t.id)
                              );
                            } else {
                              setSelectedSetlistTrackIds([
                                ...selectedSetlistTrackIds,
                                t.id,
                              ]);
                            }
                          }}
                        />
                        <span className="truncate">{t.title}</span>
                        <span className="ml-auto text-[10px] font-mono text-[#2563EB] font-bold">
                          Key {t.key}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={tracks.length === 0}
                className="w-full h-10 rounded-xl bg-[#2563EB] disabled:opacity-50 text-white font-semibold text-sm transition"
              >
                Save Worship Setlist
              </button>
            </form>
          </div>

          <div className="lg:col-span-8">
            {activeSetlist ? (
              <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-sm font-bold uppercase tracking-wider text-[#2563EB]">
                      Live Band & MD Master Sheet
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-[#0F172A] mt-0.5">
                      {activeSetlist.title}
                    </h2>
                    <p className="text-sm text-[#64748B] mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                      {activeSetlist.eventDate} • {activeSetlist.venue}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                    <button
                      onClick={() => setTransposeOffset((t) => t - 1)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#2563EB] text-[#0F172A] hover:text-white border border-[#E2E8F0] text-sm font-bold transition"
                    >
                      -1 Semitone
                    </button>
                    <span className="px-3 text-sm font-bold text-[#2563EB]">
                      Transpose: {transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}
                    </span>
                    <button
                      onClick={() => setTransposeOffset((t) => t + 1)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#2563EB] text-[#0F172A] hover:text-white border border-[#E2E8F0] text-sm font-bold transition"
                    >
                      +1 Semitone
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#E2E8F0]"
                      title="Print Band Sheet"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  {activeSetlist.trackIds.map((trackId, idx) => {
                    const track = tracks.find((t) => t.id === trackId);
                    if (!track) return null;
                    const effectiveKey = transposeNote(track.key, transposeOffset);
                    return (
                      <div
                        key={`${trackId}-${idx}`}
                        className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-[#0F172A]">
                            {idx + 1}. {track.title}
                          </h3>
                          <span className="px-3 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-sm font-mono font-bold">
                            Stage Key: {effectiveKey}
                          </span>
                        </div>
                        <p className="font-mono text-sm font-bold text-[#0F172A]">
                          {transposeChordToken(track.chordProgression, transposeOffset)}
                        </p>
                        <pre className="p-4 rounded-xl bg-white border border-[#E2E8F0] font-mono text-sm whitespace-pre-wrap">
                          {transposeLyricsWithBrackets(track.lyrics, transposeOffset)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-dashed border-[#CBD5E1] p-12 text-center space-y-3">
                <Music2 className="w-8 h-8 text-[#2563EB] mx-auto" />
                <h3 className="text-lg font-serif font-bold text-[#0F172A]">
                  No Active Setlist Selected
                </h3>
                <p className="text-sm text-[#64748B]">
                  Add tracks first, then create a setlist on the left to transpose chord sheets in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BOOKINGS & ITINERARY CRM */}
      {activeTab === 'bookings' && (
        <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                Ministry Itinerary & Booking CRM
              </h2>
              <p className="text-sm text-[#64748B]">
                Add confirmed tour dates or manage incoming inquiries from the public booking form.
              </p>
            </div>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="h-12 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border-[1.5px] border-[#2563EB] text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add event
            </button>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-[#64748B] py-8 text-center">
              No events or booking inquiries recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs uppercase tracking-wider text-[#64748B]">
                    <th className="py-3 px-4">Event & Organizer</th>
                    <th className="py-3 px-4">Date & Venue</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Public Visibility</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-4 px-4">
                        <p className="font-bold text-[#0F172A]">{b.eventName}</p>
                        <p className="text-sm text-[#64748B]">{b.organizer}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-[#0F172A]">
                        <p className="font-semibold text-[#2563EB]">{b.date}</p>
                        <p>
                          {b.venue}
                          {b.city ? `, ${b.city}` : ''}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <select
                            aria-label={`Status of ${b.eventName}`}
                          value={b.status}
                          onChange={(e) =>
                            onUpdateBookingStatus(
                              b.id,
                              e.target.value as BookingEvent['status']
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-sm font-semibold"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Inquiry">Inquiry</option>
                          <option value="Negotiating">Negotiating</option>
                          <option value="Completed">Completed</option>
                          <option value="Declined">Declined or cancelled</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => onToggleBookingPublic(b.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                            b.isPublic
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                          }`}
                        >
                          {b.isPublic ? 'Shown on Site' : 'Hidden'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => onDeleteBooking(b.id)}
                          aria-label={`Delete ${b.eventName}`}
                          className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#BE123C] hover:bg-[#FFF1F2]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD NEW TRACK */}
      {showNewTrackModal && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={trackDialogRef} role="dialog" aria-modal="true" aria-label="Add track and chord sheet" className="max-w-lg w-full rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-[#0F172A] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" /> Add Track & Chord Sheet
              </h2>
              <button
                onClick={() => setShowNewTrackModal(false)}
                className="text-sm text-[#64748B] hover:text-[#0F172A] font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateTrack} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f13">
                    Song Title *
                  </label>
                  <input id="dash-f13"
                    type="text"
                    required
                    placeholder="Enter song title..."
                    value={newTrack.title}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, title: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f14">
                    Album / Single Name
                  </label>
                  <input id="dash-f14"
                    type="text"
                    placeholder="Enter album or single..."
                    value={newTrack.album}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, album: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f15">
                    Key
                  </label>
                  <select id="dash-f15"
                    value={newTrack.key}
                    onChange={(e) =>
                      setNewTrack({
                        ...newTrack,
                        key: e.target.value as MusicalKey,
                      })
                    }
                    className="w-full h-12 px-2 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  >
                    {['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(
                      (k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f16">
                    BPM
                  </label>
                  <input id="dash-f16"
                    type="number"
                    value={newTrack.bpm}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, bpm: Number(e.target.value) })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f17">
                    Duration
                  </label>
                  <input id="dash-f17"
                    type="text"
                    placeholder="4:30"
                    value={newTrack.duration}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, duration: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f18">
                    Genre
                  </label>
                  <select id="dash-f18"
                    value={newTrack.genre}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, genre: e.target.value })
                    }
                    className="w-full h-12 px-2 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  >
                    {profile.genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f19">
                  Studio Chord Progression
                </label>
                <input id="dash-f19"
                  type="text"
                  placeholder="e.g. Fmaj7 - C/E - Dm7 - Bbmaj9"
                  value={newTrack.chordProgression}
                  onChange={(e) =>
                    setNewTrack({
                      ...newTrack,
                      chordProgression: e.target.value,
                    })
                  }
                  className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base font-mono"
                />
              </div>

              <div>
                <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f20">
                  MD Arrangement Notes
                </label>
                <input id="dash-f20"
                  type="text"
                  placeholder="Enter band cues or arrangement notes..."
                  value={newTrack.arrangementNotes}
                  onChange={(e) =>
                    setNewTrack({
                      ...newTrack,
                      arrangementNotes: e.target.value,
                    })
                  }
                  className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-[#0F172A] font-semibold mb-1" htmlFor="dash-f21">
                  Lyrics (Use [Chord] brackets for automatic transposition)
                </label>
                <textarea id="dash-f21"
                  rows={4}
                  placeholder="Enter song lyrics..."
                  value={newTrack.lyrics}
                  onChange={(e) =>
                    setNewTrack({ ...newTrack, lyrics: e.target.value })
                  }
                  className="w-full p-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <FileText className="w-4 h-4" /> Save Song to Catalog
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW EVENT / TOUR DATE */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={eventDialogRef} role="dialog" aria-modal="true" aria-label="Add itinerary date" className="max-w-lg w-full rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-[#0F172A]">
                Add Ministry Itinerary / Tour Date
              </h2>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="text-sm text-[#64748B] font-bold"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f22">
                  Event Title *
                </label>
                <input id="dash-f22"
                  type="text"
                  required
                  value={newEvent.eventName}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, eventName: e.target.value })
                  }
                  className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f23">
                    Host / Organizer
                  </label>
                  <input id="dash-f23"
                    type="text"
                    value={newEvent.organizer}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, organizer: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f24">
                    Date *
                  </label>
                  <input id="dash-f24"
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, date: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f25">
                    Venue
                  </label>
                  <input id="dash-f25"
                    type="text"
                    value={newEvent.venue}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, venue: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1" htmlFor="dash-f26">
                    City
                  </label>
                  <input id="dash-f26"
                    type="text"
                    value={newEvent.city}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, city: e.target.value })
                    }
                    className="w-full h-12 px-3 rounded-xl bg-white border-[1.5px] border-[#64748B] text-base"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#2563EB] text-white font-semibold text-sm"
              >
                Save Event to Itinerary
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
