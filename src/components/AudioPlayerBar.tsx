import React, { useEffect, useState } from 'react';
import { usePlayerInset } from '../hooks/usePlayerInset';
import { SmartImage } from './ui/SmartImage';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music2,
  FileText,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import type { Track, PortfolioConfig } from '../types/music';
import {
  transposeChordToken,
  transposeLyricsWithBrackets,
  transposeNote,
} from '../utils/soundEngine';

interface AudioPlayerBarProps {
  profile: PortfolioConfig;
  currentTrack: Track | null;
  isPlaying: boolean;
  progressSec: number;
  volume: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (vol: number) => void;
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const ICON_BTN =
  'w-11 h-11 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[1.5px] border-[#64748B] inline-flex items-center justify-center transition-colors';

/** True while a text field has focus on a phone: the bar slides away so it can never cover the field (WCAG 2.4.11). */
function useBarHiddenWhileTyping() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select');
    const narrow = () => window.matchMedia('(max-width: 767px)').matches;
    const onIn = (e: FocusEvent) => {
      if (narrow() && isField(e.target)) setHidden(true);
    };
    const onOut = (e: FocusEvent) => {
      if (isField(e.target)) setHidden(false);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return hidden;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  profile,
  currentTrack,
  isPlaying,
  progressSec,
  volume,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
}) => {
  const playerInsetRef = usePlayerInset();
  const hiddenWhileTyping = useBarHiddenWhileTyping();
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [semitoneShift, setSemitoneShift] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(0.45);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  // No track yet: the bar is not rendered at all (nothing to play, nothing to cover).
  if (!currentTrack) return null;

  const transposedKey = transposeNote(currentTrack.key, semitoneShift);
  const transposedProgression = transposeChordToken(currentTrack.chordProgression, semitoneShift);
  const transposedLyrics = transposeLyricsWithBrackets(currentTrack.lyrics, semitoneShift);
  const playLabel = isPlaying ? 'Pause' : 'Play';

  // Collapsed mini player pill
  if (isCollapsed) {
    return (
      <div
        role="region"
        aria-label="Audio player (minimised)"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-2.5 pr-3 rounded-2xl bg-white border border-[#2563EB] shadow-lg"
      >
        <div className="max-w-[9.375rem] truncate">
          <p className="text-sm font-bold text-[#0F172A] truncate">{currentTrack.title}</p>
          <p className="text-xs text-[#64748B] font-mono font-semibold">
            Key {transposedKey} • {currentTrack.bpm} BPM
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playLabel}
          className="w-11 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setIsCollapsed(false)} aria-label="Expand audio player" className={ICON_BTN}>
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const seek = (cls: string) => (
    <input
      type="range"
      min={0}
      max={Math.max(1, currentTrack.durationSeconds)}
      value={progressSec}
      onChange={(e) => onSeek(Number(e.target.value))}
      aria-label="Seek"
      aria-valuetext={`${formatTime(progressSec)} of ${currentTrack.duration}`}
      style={{ '--fill': `${(progressSec / Math.max(1, currentTrack.durationSeconds)) * 100}%` } as React.CSSProperties}
      className={`${cls} range`}
    />
  );

  return (
    <>
      {/* Live lyrics and chord drawer (sits directly above the bar) */}
      {showLyricsDrawer && (
        <div
          role="region"
          aria-label="Lyrics and chords"
          style={{ bottom: 'var(--player-h, 5rem)' }}
          className="fixed left-0 right-0 z-40 max-h-[60vh] overflow-y-auto bg-white border-t border-[#2563EB] shadow-xl"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#0F172A]">{currentTrack.title}</h3>
                <p className="text-sm text-[#64748B]">
                  {currentTrack.album && `${currentTrack.album} • `}
                  {profile.artistName} • {currentTrack.bpm} BPM
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#64748B]">
                  Original key: <strong className="text-[#0F172A]">{currentTrack.key}</strong>
                </span>
                <button type="button" onClick={() => setSemitoneShift((s) => s - 1)} aria-label="-1, transpose down one semitone" className={`${ICON_BTN} text-sm font-bold`}>
                  -1
                </button>
                <span className="text-base font-bold text-[#2563EB] min-w-[5rem] text-center" aria-live="polite">
                  Key: {transposedKey}
                  {semitoneShift !== 0 && ` (${semitoneShift > 0 ? `+${semitoneShift}` : semitoneShift})`}
                </span>
                <button type="button" onClick={() => setSemitoneShift((s) => s + 1)} aria-label="+1, transpose up one semitone" className={`${ICON_BTN} text-sm font-bold`}>
                  +1
                </button>
                {semitoneShift !== 0 && (
                  <button type="button" onClick={() => setSemitoneShift(0)} className="text-sm text-[#2563EB] hover:underline font-semibold">
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => setShowLyricsDrawer(false)} aria-label="Close lyrics and chords" className={ICON_BTN}>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B] mb-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" aria-hidden="true" /> Chord progression ({transposedKey})
                  </div>
                  <p className="font-mono text-base font-bold text-[#0F172A] bg-white p-3 rounded-lg border border-[#E2E8F0]">
                    {transposedProgression || 'No chords yet'}
                  </p>
                </div>

                {currentTrack.arrangementNotes && (
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#64748B] mb-2">Arrangement note</p>
                    <p className="text-sm text-[#0F172A] leading-relaxed">{currentTrack.arrangementNotes}</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#0F172A] max-h-[320px] overflow-y-auto">
                {transposedLyrics || 'No lyrics yet.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The bar. Phone: one 44 px row plus a thin seek strip (about 72 px). Desktop: full controls. */}
      <div
        ref={playerInsetRef}
        role="region"
        aria-label="Audio player"
        inert={hiddenWhileTyping}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2E8F0] shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
          hiddenWhileTyping ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        {/* PHONE */}
        <div className="sm:hidden">
          <div className="px-3">{seek('w-full h-6 block')}</div>
          <div className="flex items-center gap-2 px-3 pb-[3px]">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0F172A] truncate">{currentTrack.title}</p>
              <p className="text-xs text-[#64748B] truncate">
                {formatTime(progressSec)} / {currentTrack.duration} • Key {transposedKey}
              </p>
            </div>
            <button type="button" onClick={onPrev} aria-label="Previous track" className="w-11 h-11 inline-flex items-center justify-center text-[#0F172A]">
              <SkipBack className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playLabel}
              className="w-11 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={onNext} aria-label="Next track" className="w-11 h-11 inline-flex items-center justify-center text-[#0F172A]">
              <SkipForward className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowLyricsDrawer(!showLyricsDrawer)}
              aria-expanded={showLyricsDrawer}
              aria-label="Lyrics and chords"
              className={ICON_BTN}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* DESKTOP / TABLET */}
        <div className="hidden sm:flex min-h-[4.5rem] py-2 px-4 lg:px-8 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 sm:min-w-[11.25rem] sm:max-w-[17.5rem]">
            <SmartImage
              src={currentTrack.coverUrl || profile.portraitUrl}
              alt=""
              width={48}
              height={48}
              sizes="48px"
              wrapperClassName="w-12 h-12 rounded-xl shrink-0"
              className="w-12 h-12 rounded-xl object-cover object-top border border-[#E2E8F0]"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F172A] truncate">{currentTrack.title}</p>
              <p className="text-sm text-[#64748B] truncate">
                {profile.artistName}
                {currentTrack.album && ` • ${currentTrack.album}`}
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button type="button" onClick={onPrev} aria-label="Previous track" className="w-11 h-11 inline-flex items-center justify-center text-[#0F172A] hover:text-[#2563EB]">
                <SkipBack className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={playLabel}
                className="w-11 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />}
              </button>
              <button type="button" onClick={onNext} aria-label="Next track" className="w-11 h-11 inline-flex items-center justify-center text-[#0F172A] hover:text-[#2563EB]">
                <SkipForward className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-sm font-mono text-[#64748B] w-10 text-right">{formatTime(progressSec)}</span>
              {seek('flex-1 min-w-0 h-6')}
              <span className="text-sm font-mono text-[#64748B] w-10">{currentTrack.duration}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowLyricsDrawer(!showLyricsDrawer)}
              aria-expanded={showLyricsDrawer}
              className={`${ICON_BTN} w-auto px-4 gap-2 text-sm font-semibold text-[#2563EB] border-[#2563EB]`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Lyrics &amp; Chords</span>
              <span className="md:hidden sr-only">Lyrics and chords</span>
              {showLyricsDrawer ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronUp className="w-4 h-4" aria-hidden="true" />}
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                className="target-auto text-[#0F172A] hover:text-[#2563EB] w-11 h-11 flex items-center justify-center"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-[#BE123C]" aria-hidden="true" /> : <Volume2 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => {
                  setIsMuted(false);
                  onVolumeChange(Number(e.target.value));
                }}
                style={{ '--fill': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
                className="w-20 h-6 range"
              />
            </div>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFF6FF] border border-[#E2E8F0] text-sm font-bold text-[#2563EB]">
              <Music2 className="w-4 h-4" aria-hidden="true" /> Key {transposedKey} • {currentTrack.bpm} BPM
            </span>

            <button
              type="button"
              onClick={() => {
                setShowLyricsDrawer(false);
                setIsCollapsed(true);
              }}
              aria-label="Minimise audio player"
              className={ICON_BTN}
            >
              <Minimize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
