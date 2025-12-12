export const generateGoogleTTS = async (text: string): Promise<string> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);
        if (!apiKey) throw new Error("Missing API Key for Google TTS");

        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        const requestBody = {
            input: { text: text },
            voice: {
                languageCode: "es-US",
                name: "es-US-Neural2-B" // Deep Male Voice (Excellent for Stoic/Christian)
            },
            audioConfig: {
                audioEncoding: "MP3",
                pitch: -2.0, // Deeper
                speakingRate: 0.90 // Slower for gravitas
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("Google TTS Error:", err);
            throw new Error(`Google TTS Failed: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Return as Data URL
        return `data:audio/mp3;base64,${data.audioContent}`;

    } catch (e) {
        console.warn("⚠️ Google TTS Failed (Using Browser Fallback):", e);
        throw e; // Let App.tsx handle fallback
    }
};
