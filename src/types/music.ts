export type ProductionStage = 'Idea & Demo' | 'Recording' | 'Mixing' | 'Mastering' | 'Released';

export type MusicalKey = 'C' | 'C#' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'F#' | 'G' | 'Ab' | 'A' | 'Bb' | 'B';

export interface StageRiderItem {
  id: string;
  category: string;
  details: string;
}

export interface PortfolioConfig {
  artistName: string;
  roleBadge: string;
  heroTagline: string;
  biography: string;
  highlights: string[];
  tiktokHandle: string;
  tiktokUrl: string;
  emailHandle: string;
  emailAddress: string;
  location: string;
  portraitUrl: string;
  avatarUrl: string;
  stageRider: StageRiderItem[];
  genres: string[];
  eventCategories: string[];
}

export interface Track {
  id: string;
  title: string;
  subtitle?: string;
  album: string;
  genre: string;
  key: MusicalKey;
  bpm: number;
  duration: string;
  durationSeconds: number;
  stage: ProductionStage;
  releaseDate: string;
  streams: number;
  featured: boolean;
  isrc?: string;
  producer?: string;
  lyrics: string;
  chordProgression: string;
  arrangementNotes: string;
  audioUrl?: string;
  coverUrl?: string;
  coverGradient: string;
}

export interface BookingEvent {
  id: string;
  eventName: string;
  organizer: string;
  contactPhone: string;
  contactEmail: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  eventType: string;
  status: 'Inquiry' | 'Negotiating' | 'Confirmed' | 'Completed' | 'Declined';
  feeGHS: number;
  depositPaid: boolean;
  isPublic: boolean;
  notes: string;
}

export interface Setlist {
  id: string;
  title: string;
  eventDate: string;
  venue: string;
  trackIds: string[];
  bandNotes: string;
}
