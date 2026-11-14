import type {
  PortfolioConfig,
  Track,
  BookingEvent,
  Setlist,
} from '../types/music';

/**
 * UN-HARDCODED CONTENT STORE
 * All tracks, events, setlists, biography, and stage rider items start empty
 * so you can supply your exact content via code or via the built-in Studio CMS.
 */
export const INITIAL_PORTFOLIO_CONFIG: PortfolioConfig = {
  artistName: 'Emma Revelation',
  roleBadge: 'Musician • Vocalist • Keyboardist • Musical Director',
  heroTagline: '', // Ready to be filled with your custom hero statement
  biography: '',   // Ready to be filled with your official biography
  highlights: [],  // Ready to be filled with your ministry/MD highlights
  tiktokHandle: 'EmmaRevelation_Official',
  tiktokUrl: 'https://www.tiktok.com/@EmmaRevelation_Official',
  emailHandle: '@emmarevelation_official1',
  emailAddress: 'emmarevelation_official1@gmail.com',
  location: '',
  portraitUrl: '/emma-portrait.jpg',
  avatarUrl: '/emma-logo.jpg',
  stageRider: [],  // Ready for your Vocal, Keyboard Rig, and Band Rider items
  genres: [
    'Prophetic Worship',
    'Highlife Gospel',
    'Contemporary Gospel',
    'Afro-Gospel Praise',
    'Instrumental / Keys',
  ],
  eventCategories: [
    'Church Ministration',
    'Concert',
    'Musical Director Clinic',
    'Campus Crusade',
    'Festival',
    'Private / Corporate',
  ],
};

// Empty arrays — no hardcoded fake tracks, events, or setlists
export const INITIAL_TRACKS: Track[] = [];

export const INITIAL_BOOKINGS: BookingEvent[] = [];

export const INITIAL_SETLISTS: Setlist[] = [];
