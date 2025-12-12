/**
 * Background Music Service
 * Provides royalty-free music tracks and custom upload support
 */

export interface MusicTrack {
    id: string;
    name: string;
    url: string;
    duration: number;
    mood: 'calm' | 'uplifting' | 'dramatic' | 'peaceful';
}

// Royalty-free music tracks (using placeholder URLs - replace with actual tracks)
export const MUSIC_LIBRARY: MusicTrack[] = [
    {
        id: 'calm-ambient',
        name: 'Ambiente Tranquilo',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_d1718ab41b.mp3', // Pixabay royalty-free
        duration: 120,
        mood: 'calm'
    },
    {
        id: 'uplifting-piano',
        name: 'Piano Inspirador',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        duration: 150,
        mood: 'uplifting'
    },
    {
        id: 'dramatic-strings',
        name: 'Cuerdas Dramáticas',
        url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3',
        duration: 180,
        mood: 'dramatic'
    },
    {
        id: 'peaceful-meditation',
        name: 'Meditación Pacífica',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c56a65d29c.mp3',
        duration: 200,
        mood: 'peaceful'
    }
];

/**
 * Load and decode audio file
 */
export async function loadMusicTrack(url: string, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.error('Failed to load music track:', error);
        throw new Error('Could not load music track');
    }
}

/**
 * Load custom audio file from user upload
 */
export async function loadCustomAudio(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.error('Failed to load custom audio:', error);
        throw new Error('Invalid audio file format');
    }
}

/**
 * Get track by ID
 */
export function getTrackById(id: string): MusicTrack | undefined {
    return MUSIC_LIBRARY.find(track => track.id === id);
}

/**
 * Create auto-ducking envelope for music during speech
 * Returns gain values over time
 */
export function createDuckingEnvelope(
    musicDuration: number,
    speechStart: number,
    speechEnd: number,
    normalVolume: number = 0.3,
    duckedVolume: number = 0.1
): Array<{ time: number; gain: number }> {
    const fadeTime = 0.5; // 500ms fade

    return [
        { time: 0, gain: normalVolume },
        { time: Math.max(0, speechStart - fadeTime), gain: normalVolume },
        { time: speechStart, gain: duckedVolume },
        { time: speechEnd, gain: duckedVolume },
        { time: speechEnd + fadeTime, gain: normalVolume },
        { time: musicDuration, gain: normalVolume }
    ];
}
