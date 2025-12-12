export interface ViralQuote {
  text: string;
  title?: string; // Optional title (e.g. "Salmo 23")
  author: string; // Can be a philosopher or "Proverbios", "Salmos", etc.
  theme: string;
  category: 'STOIC' | 'CHRISTIAN' | 'MOTIVATIONAL' | 'GRATITUDE' | 'WISDOM';
}

export interface GeneratedContent {
  id: string;
  quote: ViralQuote;
  mediaType: 'image'; // Enforced image only
  imageUrls: string[];
  audioData: string | null; // Base64 PCM data or MP3 Data URL
  isNativeAudio?: boolean; // If true, play audioData directly, skip Synthesis
  audioOptions?: { pitch: number; rate: number; lang?: string };
  customMedia?: { type: 'image' | 'video'; url: string }; // Custom uploaded media
  fontFamily?: string; // Selected font family for text rendering
  colorTheme?: string; // Selected color theme ID
  visualEffects?: {
    blur: number;
    vignette: number;
    transition: 'fade' | 'slide' | 'zoom';
    transitionDuration: number;
    speechRate: number;
  };
  watermark?: {
    enabled: boolean;
    type: 'text' | 'logo';
    text?: string;
    logoUrl?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
  };
  createdAt: number;
}

export enum AppState {
  IDLE = 'IDLE',
  CHECKING_KEY = 'CHECKING_KEY',
  GENERATING_QUOTE = 'GENERATING_QUOTE',
  GENERATING_MEDIA = 'GENERATING_MEDIA',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

// Augment window for AI Studio helpers
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}