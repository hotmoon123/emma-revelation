import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../types/music';
import { soundEngine } from '../utils/soundEngine';
import { withBase } from '../utils/basePath';

/**
 * The shared audio player. A track with an `audioUrl` plays that real file; a track without one
 * plays the built-in worship-pad synthesiser (so the site is never silent while the owner has no files yet).
 */
export function usePlayer(tracks: Track[], onProblem?: (message: string) => void) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(tracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSec, setProgressSec] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [padEnabled, setPadEnabled] = useState(false);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const problemRef = useRef(onProblem);
  problemRef.current = onProblem;

  // keep the current track valid when the list changes
  useEffect(() => {
    if (!currentTrack && tracks.length > 0) setCurrentTrack(tracks[0]);
    else if (currentTrack && !tracks.some((t) => t.id === currentTrack.id)) {
      setCurrentTrack(tracks[0] || null);
      setIsPlaying(false);
    }
  }, [tracks, currentTrack]);

  const audioUrl = withBase(currentTrack?.audioUrl?.trim() || '');

  // playback: real file, or the synth
  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    if (!currentTrack) return;

    if (audioUrl) {
      if (!padEnabled) soundEngine.stop();
      let el = audioRef.current;
      if (!el) {
        el = new Audio();
        el.preload = 'none';
        audioRef.current = el;
      }
      if (el.getAttribute('data-src') !== audioUrl) {
        el.setAttribute('data-src', audioUrl);
        el.src = audioUrl;
      }
      el.volume = volume;
      const onTime = () => setProgressSec(Math.floor(el!.currentTime));
      const onEnd = () => {
        setIsPlaying(false);
        setProgressSec(0);
      };
      const onErr = () => {
        setIsPlaying(false);
        problemRef.current?.(`The audio file for "${currentTrack.title}" could not be played. Check the link in Studio.`);
      };
      el.addEventListener('timeupdate', onTime);
      el.addEventListener('ended', onEnd);
      el.addEventListener('error', onErr);
      if (isPlaying) {
        void el.play().catch(() => {
          if (!el!.error) return; // blocked by the browser until a tap: the next tap plays
          onErr();
        });
      } else {
        el.pause();
      }
      return () => {
        el!.removeEventListener('timeupdate', onTime);
        el!.removeEventListener('ended', onEnd);
        el!.removeEventListener('error', onErr);
      };
    }

    // no file: synth + a one-second clock
    audioRef.current?.pause();
    if (isPlaying) {
      soundEngine.start(currentTrack.key, currentTrack.bpm);
      timerRef.current = window.setInterval(() => {
        setProgressSec((prev) => (prev + 1 >= currentTrack.durationSeconds ? 0 : prev + 1));
      }, 1000);
    } else if (!padEnabled) {
      soundEngine.stop();
    }
    return clearTimer;
    // volume is applied by handleVolumeChange; it must not restart playback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack, padEnabled, audioUrl]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      soundEngine.stop();
    },
    []
  );

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    soundEngine.setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const handleSeek = useCallback(
    (sec: number) => {
      setProgressSec(sec);
      if (audioUrl && audioRef.current) audioRef.current.currentTime = sec;
    },
    [audioUrl]
  );

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) setIsPlaying(!isPlaying);
    else {
      setCurrentTrack(track);
      setProgressSec(0);
      setIsPlaying(true);
    }
  };
  const togglePlay = () => {
    if (currentTrack) setIsPlaying((p) => !p);
  };
  const step = (dir: 1 | -1) => {
    if (tracks.length === 0 || !currentTrack) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    setCurrentTrack(tracks[(idx + dir + tracks.length) % tracks.length]);
    setProgressSec(0);
  };
  const togglePad = () => {
    const next = !padEnabled;
    setPadEnabled(next);
    if (next) soundEngine.start(currentTrack?.key || 'C', currentTrack?.bpm || 72);
    else if (!isPlaying) soundEngine.stop();
  };
  const resetPlayer = (first: Track | null) => {
    setCurrentTrack(first);
    setIsPlaying(false);
    setProgressSec(0);
  };

  return {
    currentTrack, setCurrentTrack, isPlaying, progressSec, volume, padEnabled,
    playTrack, togglePlay, next: () => step(1), prev: () => step(-1), togglePad,
    handleVolumeChange, handleSeek, resetPlayer,
  };
}
