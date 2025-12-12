/**
 * Browser-native Text-to-Speech usando Web Speech API
 * 100% Gratis, sin límites, sin API key
 * 
 * NOTA: La calidad de voz depende del navegador y sistema operativo
 */

interface TTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

/**
 * Sintetiza texto a audio usando Web Speech API
 * Retorna Base64 PCM data (mock) para sincronización
 * 
 * NOTA: Web Speech API no permite grabar directamente.
 * Esta función estima la duración y retorna un buffer silencioso
 * del mismo tamaño para que VideoPlayer pueda sincronizar.
 * La voz real se reproducirá desde el VideoPlayer.
 */
export const synthesizeSpeech = async (
    text: string,
    options: TTSOptions = {}
): Promise<string> => {
    // Estimar duración basado en palabras y configuración
    const words = text.split(/\s+/).length;

    // Config default tuning per category if not provided
    // This is just for duration estimation, but good to log intent
    const defaultRate = options.rate || 0.85;

    console.log(`🎤 TTS Plan: Voice Selection Active. Pitch: ${options.pitch || 'default'}, Rate: ${defaultRate}`);

    // Duración aproximada: 2.0 palabras por segundo
    // Ajustado por el rate. Si rate < 1 (lento), la duración aumenta.
    const baseWordsPerSecond = 2.0;
    const adjustedWPS = baseWordsPerSecond * defaultRate;
    // Add moderate padding (3s) strictly for safety buffer, 
    // real cut-off is handled by utterance.onend
    const estimatedDuration = Math.max(5, (words / adjustedWPS) + 3);

    console.log(`Estimated TTS duration: ${estimatedDuration.toFixed(2)}s for ${words} words`);

    // Generar PCM silencioso del tamaño estimado
    return generateMockPCM(estimatedDuration);
};

/**
 * Detect the best available Spanish voice (Prioritize MALE)
 */
const getBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const maleKeywords = ['Pablo', 'Alvaro', 'David', 'Miguel', 'Enrique', 'Male', 'Hombre'];

    // 1. Priority: Explicit Male Voice
    const maleVoice = voices.find(v => v.lang.startsWith('es') && maleKeywords.some(k => v.name.includes(k)));
    if (maleVoice) return maleVoice;

    // 2. Priority: Microsoft Natural Voices (Edge)
    const naturalVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Online') || v.name.includes('Natural')));
    if (naturalVoice) return naturalVoice;

    // 3. Priority: Google Voices (Chrome)
    const googleVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    // 4. Output any Spanish voice
    return voices.find(v => v.lang.startsWith('es')) || null;
};

/**
 * Version simplificada que solo habla (sin grabar)
 * Útil para preview
 */
export const speakText = (text: string, options: TTSOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('Web Speech API no soportada'));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Intelligent Voice Selection
        const bestVoice = getBestVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log("🗣️ Selected Voice:", bestVoice.name);
        } else {
            console.warn("⚠️ No specific Spanish voice found, using default.");
            utterance.lang = 'es-ES';
        }

        utterance.rate = options.rate || 0.85; // Slightly slower for gravity
        utterance.pitch = options.pitch || 0.9; // Little deeper default
        utterance.volume = options.volume || 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        window.speechSynthesis.speak(utterance);
    });
};

/**
 * IMPORTANTE: Web Speech API genera audio "al vuelo" durante playback
 * Para obtener un AudioBuffer usable en el canvas, necesitamos un approach diferente:
 * Esta función retorna un "mock" PCM data que el decoder puede procesar
 */
export const generateMockPCM = (durationSeconds: number): string => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSeconds;

    // WAV Header is 44 bytes
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const totalSize = 36 + dataSize; // 44 - 8

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF Chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize, true);
    writeString(view, 8, 'WAVE');

    // fmt Chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data Chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples (silence)
    // ArrayBuffer is explicitly initialized to 0, so no need to loop if we want silence.
    // If we wanted noise, we'd loop from byte 44 onwards.

    // Convert to Base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};
