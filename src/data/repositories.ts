import type { BookingEvent, PortfolioConfig, Setlist, Track } from '../types/music';
import { readStored, removeStored, writeStored } from '../utils/storage';
import {
  isBookingArray,
  isPortfolioConfig,
  isSetlistArray,
  isTrackArray,
} from '../utils/validation';
import {
  INITIAL_BOOKINGS,
  INITIAL_PORTFOLIO_CONFIG,
  INITIAL_SETLISTS,
  INITIAL_TRACKS,
} from './initialData';

/**
 * DATA-ACCESS LAYER (see docs/ARCHITECTURE.md, ADR-008)
 *
 * UI code talks to a PortfolioRepository, never to localStorage directly.
 * Today the only implementation is browser storage. When a real backend exists
 * (docs/openapi.yaml), add an HttpPortfolioRepository with the same interface
 * and swap it in one place (`portfolioRepository` below). No component changes.
 */
export interface PortfolioSnapshot {
  profile: PortfolioConfig;
  tracks: Track[];
  bookings: BookingEvent[];
  setlists: Setlist[];
}

export interface PortfolioRepository {
  load(): PortfolioSnapshot;
  /** Resolves to false when the store refused the write (blocked or full). */
  save(snapshot: PortfolioSnapshot): boolean;
  clear(): void;
}

/** Existing keys are kept so no owner data is lost. Bump SCHEMA_VERSION when a shape changes. */
export const STORAGE_KEYS = {
  PROFILE: 'emma_rev_profile_v5',
  TRACKS: 'emma_rev_tracks_v4_dynamic',
  BOOKINGS: 'emma_rev_bookings_v4_dynamic',
  SETLISTS: 'emma_rev_setlists_v4_dynamic',
  SCHEMA: 'emma_rev_schema_version',
} as const;

export const SCHEMA_VERSION = 1;

type Migration = (storage: Storage) => void;
/** migrations[n] upgrades data from version n to n+1. Empty today: v0 (unversioned) data is already valid v1. */
export const MIGRATIONS: Migration[] = [() => undefined];

export function runMigrations(storage: Storage): void {
  const stored = Number(storage.getItem(STORAGE_KEYS.SCHEMA) ?? 0);
  let version = Number.isFinite(stored) && stored >= 0 ? stored : 0;
  while (version < SCHEMA_VERSION) {
    MIGRATIONS[version]?.(storage);
    version += 1;
  }
  storage.setItem(STORAGE_KEYS.SCHEMA, String(version));
}

export class LocalStoragePortfolioRepository implements PortfolioRepository {
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = safeLocalStorage()) {
    this.storage = storage;
    try {
      if (this.storage) runMigrations(this.storage);
    } catch {
      /* storage blocked: fall back to defaults */
    }
  }

  load(): PortfolioSnapshot {
    return {
      profile: readStored(STORAGE_KEYS.PROFILE, INITIAL_PORTFOLIO_CONFIG, isPortfolioConfig),
      tracks: readStored(STORAGE_KEYS.TRACKS, INITIAL_TRACKS, isTrackArray),
      bookings: readStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS, isBookingArray),
      setlists: readStored(STORAGE_KEYS.SETLISTS, INITIAL_SETLISTS, isSetlistArray),
    };
  }

  save(s: PortfolioSnapshot): boolean {
    return [
      writeStored(STORAGE_KEYS.PROFILE, s.profile),
      writeStored(STORAGE_KEYS.TRACKS, s.tracks),
      writeStored(STORAGE_KEYS.BOOKINGS, s.bookings),
      writeStored(STORAGE_KEYS.SETLISTS, s.setlists),
    ].every(Boolean);
  }

  clear(): void {
    [STORAGE_KEYS.PROFILE, STORAGE_KEYS.TRACKS, STORAGE_KEYS.BOOKINGS, STORAGE_KEYS.SETLISTS].forEach(removeStored);
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The single swap point for a future HTTP/database-backed implementation. */
export const portfolioRepository: PortfolioRepository = new LocalStoragePortfolioRepository();
