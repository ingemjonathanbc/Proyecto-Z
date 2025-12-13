import React, { useState, useEffect, useRef } from 'react';
import { AppState, GeneratedContent, ViralQuote } from './types';
import { COLOR_THEMES } from './config/themes';
import { MUSIC_TRACKS } from './config/music';
import { getRandomQuote } from './services/quoteBank';
import { generateFreeAiQuote } from './services/freeAiService';
import { generateCinematicImage, generateProceduralFallback } from './services/imageService';
import { findReferenceForText } from './services/referenceImageService';

import { synthesizeSpeech } from './services/browserTTS';
import { generateGeminiQuote, generateGeminiEnhancedImage } from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import { Loader2, AlertTriangle, Sparkles, BookOpen, Quote, Shuffle, Zap, DollarSign } from 'lucide-react';

// Focused purely on Christian Faith as requested
const CHRISTIAN_TOPICS = [
    // 🔥 Guerra Espiritual (Viral)
    "San Miguel Arcángel",
    "Romper Cadenas",
    "Armadura de Dios",
    "Contra la Envidia",
    "Protección Divina",
    "Salmo 91",
    "Salmo 23",

    // 🕊️ Sanidad Interior & Paz
    "Curar la Ansiedad con Dios",
    "Vencer la Tristeza",
    "Soledad y Fe",
    "Perdonar lo Imperdonable",
    "Paz Mental Bíblica",

    // 💰 Provisión y Milagros
    "Dios Proveerá",
    "Diezmo y Abundancia",
    "Perseverancia Bíblica",
    "Oración de Abundancia",
    "El Tiempo de Dios",
    "Milagros Inesperados",
    "Abrir Caminos",

    // 👑 Identidad y Promesas
    "Hijo de Dios",
    "Propósito de Vida",
    "No Temerás",
    "Confianza en Dios",

    // 🌹 Oraciones a Santos y Virgen
    "Virgen de Guadalupe",
    "San Judas Tadeo",
    "San Benito (Protección)",
    "Virgen María",
    "Santa Rita (Imposibles)",
    "San Francisco de Asís"
];

// 💪 Motivational Topics
const MOTIVATIONAL_TOPICS = [
    "Superar Obstáculos",
    "Mentalidad de Campeón",
    "Disciplina Inquebrantable",
    "Salir de la Zona de Confort",
    "Transformación Personal",
    "Éxito y Persistencia",
    "Vencer el Miedo",
    "Levántate y Conquista",
];

// 🙏 Gratitude Topics  
const GRATITUDE_TOPICS = [
    "Agradecer lo Simple",
    "Bendiciones Diarias",
    "Gratitud en Dificultades",
    "Apreciar el Presente",
    "Dar Gracias Siempre",
    "Abundancia y Gratitud",
];

// 🧠 Wisdom Topics
const WISDOM_TOPICS = [
    "Lecciones de Vida",
    "Sabiduría Ancestral",
    "Filosofía del Éxito",
    "Aprender del Dolor",
    "Proverbios Antiguos",
    "Conocimiento Interior",
];

const FONT_OPTIONS = [
    { value: 'Cinzel', label: '✨ Cinzel (Elegante)' },
    { value: 'Playfair Display', label: '📖 Playfair (Clásico)' },
    { value: 'Merriweather', label: '🖋️ Merriweather (Serif)' },
    { value: 'Inter', label: '🔤 Inter (Moderno)' }
];

const App: React.FC = () => {
    const [state, setState] = useState<AppState>(AppState.IDLE);
    const [history, setHistory] = useState<GeneratedContent[]>([]);
    const [currentContent, setCurrentContent] = useState<GeneratedContent | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [statusText, setStatusText] = useState('');
    const [selectedTopic, setSelectedTopic] = useState<string>("Salmo 91");
    const [usePaidAi, setUsePaidAi] = useState(false);

    // Manual Mode State
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualText, setManualText] = useState("");
    const [manualTitle, setManualTitle] = useState("");
    const [manualAuthor, setManualAuthor] = useState("");
    const [manualCategory, setManualCategory] = useState<'STOIC' | 'CHRISTIAN'>('CHRISTIAN');

    // Manual Media State
    const [manualMediaUrls, setManualMediaUrls] = useState<string[]>([]);
    const [manualMediaType, setManualMediaType] = useState<'images' | 'video'>('images');

    // Visual Customization State
    const [selectedFont, setSelectedFont] = useState('Cinzel');
    const [selectedTheme, setSelectedTheme] = useState('golden-heaven');

    // Visual Effects State
    const [blurIntensity, setBlurIntensity] = useState(3);
    const [vignetteStrength, setVignetteStrength] = useState(50);
    const [transitionType, setTransitionType] = useState<'fade' | 'slide' | 'zoom'>('fade');
    const [transitionDuration, setTransitionDuration] = useState(1.5);
    const [speechRate, setSpeechRate] = useState(0.9); // 0.5x - 2x

    // Music State
    const [enableMusic, setEnableMusic] = useState(false);
    const [selectedMusicTrack, setSelectedMusicTrack] = useState('calm-ambient');
    const [musicVolume, setMusicVolume] = useState(0.3); // 0-1
    const [customMusicFile, setCustomMusicFile] = useState<File | null>(null);

    // Watermark State
    const [enableWatermark, setEnableWatermark] = useState(false);
    const [watermarkType, setWatermarkType] = useState<'text' | 'logo'>('text');
    const [watermarkText, setWatermarkText] = useState('@TuNombre');
    const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
    const [watermarkLogoUrl, setWatermarkLogoUrl] = useState<string>('');

    // Batch Generation State
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchQuantity, setBatchQuantity] = useState(3);
    const [batchResults, setBatchResults] = useState<GeneratedContent[]>([]);

    // Language Support
    const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check if it's a video (only 1 allowed)
        if (files[0].type.startsWith('video')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                setManualMediaUrls([url]);
                setManualMediaType('video');
            };
            reader.readAsDataURL(files[0]);
        } else {
            // Multiple images allowed
            const urls: string[] = [];
            let processed = 0;

            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    urls.push(event.target?.result as string);
                    processed++;

                    if (processed === files.length) {
                        setManualMediaUrls(urls);
                        setManualMediaType('images');
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // Daily Word function removed per user request

    // Fetch Vatican News Content (Gospel or Reading) and auto-generate video
    const fetchVaticanContent = async (type: 'GOSPEL' | 'READING_1' | 'READING_2' | 'PSALM') => {
        try {
            const labels = {
                'GOSPEL': 'Evangelio',
                'READING_1': '1ra Lectura',
                'READING_2': '2da Lectura',
                'PSALM': 'Salmo'
            };
            setStatusText(`Buscando ${labels[type]}...`);
            console.log('🙏 Calling vaticanService...');
            const { getVaticanDailyReadings } = await import('./services/vaticanService');

            const readings = await getVaticanDailyReadings();
            const selected = readings.find(r => r.type === type);

            if (selected) {
                console.log(`✅ ${selected.title} encontrado. Generando video...`);

                // Generate video directly with reading data (bypass React state issues)
                await generateVideoFromData({
                    title: selected.title,
                    text: selected.text,
                    author: selected.reference,
                    category: 'CHRISTIAN'
                });
            } else {
                throw new Error(`No se encontró "${labels[type]}" para hoy.`);
            }

        } catch (error: any) {
            console.error('❌ Error in fetchVaticanContent:', error);
            alert("No se pudo obtener la lectura del Vaticano.");
            setStatusText("");
        }
    };

    // Generate video directly from data without relying on state
    const generateVideoFromData = async (data: { title: string; text: string; author: string; category: 'STOIC' | 'CHRISTIAN' }) => {
        try {
            setErrorMsg('');
            setCurrentContent(null);

            // 1. Prepare Quote from provided data
            setState(AppState.GENERATING_QUOTE);

            // Sanitize text
            let cleanText = data.text;
            cleanText = cleanText.replace(/\(Pausa\)/gi, '');
            cleanText = cleanText.replace(/\(Selah\)/gi, '');
            cleanText = cleanText.replace(/\(Interludio\)/gi, '');
            cleanText = cleanText.trim();

            const quote: ViralQuote = {
                text: cleanText,
                title: data.title || undefined,
                author: data.author || "Anónimo",
                theme: `${data.title || ''} ${data.category} spiritual dramatic lighting`,
                category: data.category
            };

            console.log("📹 Generating video with quote:", quote);

            // 2. Fetch Images
            setState(AppState.GENERATING_MEDIA);

            let imageUrls: string[] = [];
            let customMediaObj = undefined;

            if (manualMediaUrls.length > 0 && manualMediaType === 'images') {
                imageUrls = manualMediaUrls;
            } else if (manualMediaUrls.length > 0 && manualMediaType === 'video') {
                customMediaObj = {
                    type: 'video',
                    url: manualMediaUrls[0]
                };
                imageUrls = [manualMediaUrls[0]]; // Placeholder for video
            } else {
                setStatusText("Creando imágenes cinémáticas...");
                const iconography = await findReferenceForText(`${quote.title || ''} ${quote.text} ${quote.author}`);
                if (iconography) {
                    console.log("✅ Iconography Description:", iconography.substring(0, 150));
                }

                const imagePromises = [
                    generateCinematicImage(`${quote.theme} wide shot, cinematic lighting`, iconography),
                    generateCinematicImage(`${quote.theme} close up, dramatic shadows`, iconography),
                    generateCinematicImage(`${quote.theme} abstract atmosphere, particles`, iconography)
                ];
                imageUrls = await Promise.all(imagePromises);

                if (imageUrls.length === 0) throw new Error("No images generated");
            }

            // 3. Generate Audio
            setState(AppState.GENERATING_AUDIO);
            setStatusText("Generando narración de voz...");

            const spokenText = quote.title
                ? `${quote.title}. ${quote.text}. ${quote.author} `
                : `${quote.text}. ${quote.author} `;

            const isStoic = quote.category === 'STOIC';
            const audioOptions = {
                pitch: isStoic ? 0.8 : 1.0,
                rate: speechRate // Use the state variable speechRate
            };

            let audioData = null;
            let isNativeAudio = false;

            if (usePaidAi) {
                setStatusText("Sintetizando Voz Neural (Google Studio)...");
                try {
                    const { generateGoogleTTS } = await import('./services/googleTtsService');
                    audioData = await generateGoogleTTS(spokenText);
                    isNativeAudio = true;
                } catch (ttsErr) {
                    console.warn("Google TTS failed, falling back to Browser", ttsErr);
                    isNativeAudio = false;
                }
            }

            if (!audioData) {
                setStatusText("Sintetizando voz con navegador...");
                audioData = await synthesizeSpeech(spokenText, audioOptions);
                isNativeAudio = false;
            }

            // 4. Complete
            const newContent: GeneratedContent = {
                id: crypto.randomUUID(),
                quote,
                mediaType: customMediaObj?.type || 'image',
                imageUrls,
                audioData,
                isNativeAudio,
                audioOptions: audioOptions,
                customMedia: customMediaObj,
                fontFamily: selectedFont,
                colorTheme: selectedTheme,
                visualEffects: {
                    blur: blurIntensity,
                    vignette: vignetteStrength,
                    transition: transitionType,
                    transitionDuration: transitionDuration,
                    speechRate: speechRate
                },
                musicTrackId: MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)].id, // Randomize music for every generation per user request
                watermark: {
                    enabled: enableWatermark,
                    type: watermarkType,
                    text: watermarkText,
                    logoUrl: watermarkLogoUrl,
                    position: watermarkPosition,
                    opacity: watermarkOpacity
                },
                createdAt: Date.now()
            };

            setHistory(prev => [newContent, ...prev]);
            setCurrentContent(newContent);
            setState(AppState.COMPLETED);
            setStatusText("");
        } catch (error: any) {
            console.error("Generation Error:", error);
            setState(AppState.ERROR);
            setErrorMsg(error.message || "Error desconocido");
            setStatusText("");
        }
    };

    // Open Daily Word page (fallback)

    // Removed the auto-check on mount to prevent premature dialogs

    const pickRandomTopic = (list: string[]) => {
        const randomIndex = Math.floor(Math.random() * list.length);
        setSelectedTopic(list[randomIndex]);
    };

    const startGeneration = async () => {
        try {
            setErrorMsg('');
            setCurrentContent(null);

            // 1. Get Quote (Auto or Manual)
            setState(AppState.GENERATING_QUOTE);
            let quote: any;

            if (isManualMode) {
                // MANUAL MODE LOGIC
                console.log("✍️ Using User Input");

                // Sanitize manual text more aggressively
                let cleanManualText = manualText;
                // Remove special markers
                cleanManualText = cleanManualText.replace(/\(Pausa\)/gi, '');
                cleanManualText = cleanManualText.replace(/\(Selah\)/gi, '');
                cleanManualText = cleanManualText.replace(/\(Interludio\)/gi, '');
                // Replace only multiple spaces/tabs within a line, but PRESERVE newlines
                // Or just don't mangle it at all, just trim.
                // cleanManualText = cleanManualText.replace(/\s+/g, ' ').trim(); // BAD: Flattens newlines
                cleanManualText = cleanManualText.trim();

                // Clean title too (Title can be flattened safely usually, but let's just trim)
                let cleanTitle = (manualTitle || '').trim();

                quote = {
                    text: cleanManualText,
                    title: cleanTitle || undefined,
                    author: manualAuthor || "Anónimo",
                    theme: `${cleanTitle || ''} ${manualCategory} spiritual dramatic lighting`, // Infer theme from title
                    category: manualCategory
                };
            } else {
                // AUTO MODE LOGIC
                try {
                    if (usePaidAi) {
                        setStatusText(`🤖 Gemini pensando sobre "${selectedTopic}"...`);
                        quote = await generateGeminiQuote(selectedTopic);
                    } else {
                        setStatusText(`IA escribiendo sobre "${selectedTopic}"...`);
                        quote = await generateFreeAiQuote(selectedTopic);
                    }
                    console.log("✅ AI Quote:", quote);
                } catch (e) {
                    console.warn("Using fallback bank", e);
                    setStatusText(`Error en Gemini.Usando banco local para "${selectedTopic}"...`);
                    quote = getRandomQuote(selectedTopic);
                }
            }
            console.log("Quote selected:", quote);

            // 2. Fetch Images OR Use Custom Media
            setState(AppState.GENERATING_MEDIA);

            let imageUrls: string[] = [];
            let customMediaObj = undefined;

            if (isManualMode && manualMediaUrls.length > 0) {
                console.log(`📸 Using Custom Media(${manualMediaUrls.length} file(s))`);
                setStatusText("Procesando tus archivos multimedia...");

                if (manualMediaType === 'video') {
                    // Single video
                    customMediaObj = {
                        type: 'video',
                        url: manualMediaUrls[0]
                    };
                    imageUrls = [manualMediaUrls[0]]; // Placeholder
                } else {
                    // Multiple images - use directly as slideshow
                    imageUrls = manualMediaUrls;
                }
            } else {
                setStatusText("Pintando tríptico cinemático...");
                try {
                    // Get iconography description
                    // OPTIMIZATION: If FreeAiService already provided a detailed theme (Iconography), use it directly to save API quota (Fixes 429 Error)
                    // We detect this if the theme is long (>50 chars) or comes from Verified/Search content.

                    let iconographyDesc = "";

                    if (quote.theme && quote.theme.length > 60 && (quote.theme.includes('icon') || quote.theme.includes('portrait'))) {
                        console.log("✅ Using Pre-generated Theme (Skipping Gemini Extraction):", quote.theme);
                        iconographyDesc = quote.theme;
                    } else {
                        setStatusText("Analizando iconografía tradicional...");
                        const fullText = `${quote.title || ''} ${quote.text} ${quote.author}`;
                        console.log("📝 Analyzing text for entities:", fullText.substring(0, 100) + "...");
                        iconographyDesc = await findReferenceForText(fullText);
                    }

                    if (iconographyDesc) {
                        console.log("✅ Iconography Description:", iconographyDesc.substring(0, 150) + "...");
                    } else {
                        console.log("⚠️ No specific iconography found, using standard prompts");
                        // Fallback to previous heuristic if no desc
                        iconographyDesc = quote.theme || "cinematic religious scene";
                    }

                    setStatusText("Generando imágenes...");

                    // Both IA Pago and IA Gratis use Pollinations with iconography
                    // (Nano Banana removed - not available in free tier)
                    const imagePromises = [
                        generateCinematicImage(`${quote.theme} wide shot, cinematic lighting`, iconographyDesc),
                        generateCinematicImage(`${quote.theme} close up, dramatic shadows`, iconographyDesc),
                        generateCinematicImage(`${quote.theme} abstract atmosphere, particles`, iconographyDesc)
                    ];
                    imageUrls = await Promise.all(imagePromises);

                    if (imageUrls.length === 0) throw new Error("No images generated");

                } catch (imageError) {
                    console.error("Image fetch failed, using fallback", imageError);
                    setStatusText("IA Imagen saturada. Usando arte generativo local...");
                    // Fallback to local procedural generation
                    const fallbackUrl = await generateProceduralFallback(quote.theme);
                    imageUrls = [fallbackUrl];
                }
            }

            // 3. Generate Audio
            setState(AppState.GENERATING_AUDIO);

            let audioData = null;
            let isNativeAudio = false;

            try {
                // Combine title and text for audio reading, but keep separate for UI
                const spokenText = quote.title
                    ? `${quote.title}. ${quote.text}. ${quote.author} `
                    : `${quote.text}. ${quote.author} `;

                const isStoic = quote.category === 'STOIC';
                const audioOptions = {
                    pitch: isStoic ? 0.8 : 1.0,
                    rate: 0.9
                };

                if (usePaidAi) {
                    setStatusText("Sintetizando Voz Neural (Google Studio)...");
                    try {
                        const { generateGoogleTTS } = await import('./services/googleTtsService');
                        audioData = await generateGoogleTTS(spokenText);
                        isNativeAudio = true; // Flag to tell VideoPlayer NOT to use Browser Speech
                    } catch (ttsErr) {
                        console.warn("Google TTS failed, falling back to Browser", ttsErr);
                        isNativeAudio = false;
                        // Fallback proceeds below
                    }
                }

                // Fallback / Free Mode
                if (!audioData) {
                    setStatusText("Sintetizando voz con navegador...");
                    // Logic moved up
                    audioData = await synthesizeSpeech(spokenText, audioOptions);
                    isNativeAudio = false;
                }

                // 4. Assemble
                const newContent: GeneratedContent = {
                    id: crypto.randomUUID(),
                    quote,
                    mediaType: 'image',
                    imageUrls,
                    audioData,
                    isNativeAudio, // Pass this flag to player
                    audioOptions: audioOptions, // Options are now always defined
                    customMedia: customMediaObj, // Pass custom video/images
                    fontFamily: selectedFont, // Pass selected font
                    colorTheme: selectedTheme, // Pass selected theme
                    visualEffects: {
                        blur: blurIntensity,
                        vignette: vignetteStrength,
                        transition: transitionType,
                        transitionDuration: transitionDuration,
                        speechRate: speechRate
                    },
                    musicTrackId: MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)].id, // Randomize music for every generation per user request
                    watermark: {
                        enabled: enableWatermark,
                        type: watermarkType,
                        text: watermarkText,
                        logoUrl: watermarkLogoUrl,
                        position: watermarkPosition,
                        opacity: watermarkOpacity
                    },
                    createdAt: Date.now()
                };

                // Handle batch mode - create 3 variations
                if (isBatchMode) {
                    const variations: GeneratedContent[] = [];
                    const fontVariations = ['Cinzel', 'Playfair Display', 'Merriweather'];
                    const themeVariations = ['golden-heaven', 'mystic-blue', 'royal-purple'];

                    for (let i = 0; i < 3; i++) {
                        variations.push({
                            ...newContent,
                            id: `${newContent.id}-var${i}`,
                            fontFamily: fontVariations[i],
                            colorTheme: themeVariations[i]
                        });
                    }

                    setBatchResults(variations);
                    setCurrentContent(variations[0]); // Show first variation
                } else {
                    setCurrentContent(newContent);
                    setBatchResults([]);
                }

                setHistory(prev => [newContent, ...prev]);
                setState(AppState.COMPLETED);

            } catch (audioErr) {
                console.error(audioErr);
                throw new Error("Error generando audio.");
            }
        } catch (err: any) {
            console.error(err);
            let msg = "Ocurrió un error inesperado.";
            if (err instanceof Error) {
                msg = err.message;
            }
            setErrorMsg(msg);
            setState(AppState.ERROR);
        }
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center py-12 px-4 selection:bg-stone-700 font-sans">

            {/* Header */}
            <header className="mb-8 text-center">
                <h1 className="text-5xl md:text-6xl font-serif-display font-bold tracking-tighter text-stone-100 mb-2 bg-gradient-to-b from-white to-stone-400 bg-clip-text text-transparent">
                    FeBot
                </h1>
                <p className="text-stone-500 max-w-md mx-auto text-sm">
                    Generador de Video Viral Cristiano. Fe, Esperanza y Oración.
                </p>

                {/* Mode Toggle */}
                {/* Mode Toggle */}
                <div className="flex flex-col gap-3 items-center mt-6">
                    {/* Tier Toggle */}
                    <div className="bg-stone-900 p-1 rounded-full flex gap-1 border border-stone-800">
                        <button
                            onClick={() => setUsePaidAi(false)}
                            className={`px - 4 py - 2 rounded - full text - xs font - bold transition - all flex items - center gap - 2 ${!usePaidAi ? 'bg-stone-700 text-white shadow-md' : 'text-stone-500 hover:text-stone-300'} `}
                        >
                            <span>IA Gratis</span>
                        </button>
                        <button
                            onClick={() => setUsePaidAi(true)}
                            className={`px - 4 py - 2 rounded - full text - xs font - bold transition - all flex items - center gap - 2 ${usePaidAi ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-300'} `}
                        >
                            <Sparkles size={12} />
                            <span>IA Pago (Gemini)</span>
                        </button>
                    </div>

                    {/* Manual/Auto Toggle */}
                    <div className="bg-stone-900 p-1 rounded-full flex gap-1 border border-stone-800">
                        <button
                            onClick={() => setIsManualMode(false)}
                            className={`px - 4 py - 2 rounded - full text - xs font - bold transition - all ${!isManualMode ? 'bg-stone-700 text-white' : 'text-stone-500 hover:text-stone-300'} `}
                        >
                            Automático
                        </button>
                        <button
                            onClick={() => setIsManualMode(true)}
                            className={`px - 4 py - 2 rounded - full text - xs font - bold transition - all ${isManualMode ? 'bg-purple-900 text-purple-100 border border-purple-500/30' : 'text-stone-500 hover:text-stone-300'} `}
                        >
                            Manual
                        </button>
                    </div>

                    {/* UI Customization Controls Removed */}
                </div>
            </header>

            {/* Batch Mode Info */}
            {isBatchMode && (
                <div className="max-w-2xl mx-auto mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-800/50">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎬</span>
                        <div>
                            <h3 className="text-sm font-bold text-purple-300 mb-1">Modo Variaciones Activo</h3>
                            <p className="text-xs text-stone-400 leading-relaxed">
                                Al generar, se crearán <strong>3 versiones automáticamente</strong> con diferentes combinaciones de fuente y tema.
                                Luego puedes elegir la mejor variación para descargar. Perfecto para encontrar el estilo más viral.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual Effects Panel - Hidden per user request */}
            <div className="hidden">
                <details className="group">
                    <summary>Hidden</summary>
                    <div className="mt-4 space-y-4">
                        {/* Blur Control */}
                        <div>
                            <label className="text-xs text-stone-400 block mb-1">
                                Desenfoque: {blurIntensity}px
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                value={blurIntensity}
                                onChange={(e) => setBlurIntensity(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Vignette Control */}
                        <div>
                            <label className="text-xs text-stone-400 block mb-1">
                                Viñeta: {vignetteStrength}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={vignetteStrength}
                                onChange={(e) => setVignetteStrength(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Speech Rate Control */}
                        <div>
                            <label className="text-xs text-stone-400 block mb-1">
                                Velocidad de Voz: {speechRate}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={speechRate}
                                onChange={(e) => setSpeechRate(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-stone-600 mt-1">
                                <span>Lento</span>
                                <span>Normal</span>
                                <span>Rápido</span>
                            </div>
                        </div>

                        {/* Transition Type */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-stone-400">Transición:</label>
                            <select
                                value={transitionType}
                                onChange={(e) => setTransitionType(e.target.value as 'fade' | 'slide' | 'zoom')}
                                className="bg-stone-800 text-stone-200 text-xs border border-stone-700 rounded px-2 py-1"
                            >
                                <option value="fade">Fundido</option>
                                <option value="slide">Deslizar</option>
                                <option value="zoom">Zoom</option>
                            </select>
                            <input
                                type="number"
                                min="0.5"
                                max="3"
                                step="0.5"
                                value={transitionDuration}
                                onChange={(e) => setTransitionDuration(Number(e.target.value))}
                                className="bg-stone-800 text-stone-200 text-xs border border-stone-700 rounded px-2 py-1 w-16"
                            />
                            <span className="text-xs text-stone-500">seg</span>
                        </div>

                        {/* Music Controls */}
                        <div className="pt-3 border-t border-stone-800">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-stone-400 font-semibold">🎵 Música de Fondo</label>
                                <input
                                    type="checkbox"
                                    checked={enableMusic}
                                    onChange={(e) => setEnableMusic(e.target.checked)}
                                    className="rounded"
                                />
                            </div>

                            {enableMusic && (
                                <div className="space-y-2 mt-2">
                                    <select
                                        value={selectedMusicTrack}
                                        onChange={(e) => setSelectedMusicTrack(e.target.value)}
                                        className="w-full bg-stone-800 text-stone-200 text-xs border border-stone-700 rounded px-2 py-1"
                                    >
                                        {MUSIC_TRACKS.map(track => (
                                            <option key={track.id} value={track.id}>{track.label}</option>
                                        ))}
                                    </select>

                                    <div>
                                        <label className="text-xs text-stone-500">Volumen: {Math.round(musicVolume * 100)}%</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={musicVolume}
                                            onChange={(e) => setMusicVolume(Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Watermark Controls */}
                        <div className="pt-3 border-t border-stone-800">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-stone-400 font-semibold">🏷️ Watermark/Logo</label>
                                <input
                                    type="checkbox"
                                    checked={enableWatermark}
                                    onChange={(e) => setEnableWatermark(e.target.checked)}
                                    className="rounded"
                                />
                            </div>

                            {enableWatermark && (
                                <div className="space-y-2 mt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setWatermarkType('text')}
                                            className={`flex-1 text-xs py-1 px-2 rounded ${watermarkType === 'text' ? 'bg-purple-600 text-white' : 'bg-stone-800 text-stone-400'}`}
                                        >
                                            Texto
                                        </button>
                                        <button
                                            onClick={() => setWatermarkType('logo')}
                                            className={`flex-1 text-xs py-1 px-2 rounded ${watermarkType === 'logo' ? 'bg-purple-600 text-white' : 'bg-stone-800 text-stone-400'}`}
                                        >
                                            Logo
                                        </button>
                                    </div>

                                    {watermarkType === 'text' && (
                                        <input
                                            type="text"
                                            value={watermarkText}
                                            onChange={(e) => setWatermarkText(e.target.value)}
                                            placeholder="@TuNombre"
                                            className="w-full bg-stone-800 text-stone-200 text-xs border border-stone-700 rounded px-2 py-1"
                                        />
                                    )}

                                    <select
                                        value={watermarkPosition}
                                        onChange={(e) => setWatermarkPosition(e.target.value as any)}
                                        className="w-full bg-stone-800 text-stone-200 text-xs border border-stone-700 rounded px-2 py-1"
                                    >
                                        <option value="top-left">Arriba Izquierda</option>
                                        <option value="top-right">Arriba Derecha</option>
                                        <option value="bottom-left">Abajo Izquierda</option>
                                        <option value="bottom-right">Abajo Derecha</option>
                                    </select>

                                    <div>
                                        <label className="text-xs text-stone-500">Opacidad: {Math.round(watermarkOpacity * 100)}%</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={watermarkOpacity}
                                            onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </details>
            </div>

            {/* Main Action Area */}
            < main className="w-full max-w-4xl flex flex-col items-center gap-8" >

                {state === AppState.ERROR && (
                    <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg flex items-center gap-3 max-w-md w-full">
                        <AlertTriangle size={20} />
                        <p className="text-sm">{errorMsg}</p>
                    </div>
                )}

                {
                    (state === AppState.COMPLETED && currentContent) && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full flex flex-col items-center gap-4">
                            <VideoPlayer content={currentContent} />

                            {/* Back Button to Create Another Video */}
                            <button
                                onClick={() => {
                                    setState(AppState.IDLE);
                                    setCurrentContent(null);
                                    setBatchResults([]);
                                }}
                                className="mt-4 px-6 py-3 bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-lg"
                            >
                                <Sparkles size={16} />
                                ✨ Crear Otro Video
                            </button>

                            {/* Batch Variations Grid */}
                            {batchResults.length > 0 && (
                                <div className="w-full max-w-4xl mt-6">
                                    <h3 className="text-sm font-bold text-stone-300 mb-3 flex items-center gap-2">
                                        🎬 Variaciones Generadas - Click para seleccionar:
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {batchResults.map((variation, idx) => (
                                            <button
                                                key={variation.id}
                                                onClick={() => setCurrentContent(variation)}
                                                className={`p-3 rounded-lg border-2 transition ${currentContent.id === variation.id
                                                    ? 'border-purple-500 bg-purple-900/20'
                                                    : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
                                                    }`}
                                            >
                                                <div className="text-xs font-bold text-stone-300 mb-1">
                                                    Variación {idx + 1}
                                                </div>
                                                <div className="text-xs text-stone-500">
                                                    {variation.fontFamily}
                                                </div>
                                                <div className="text-xs text-stone-600">
                                                    {variation.colorTheme}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR && (
                        <div className="flex flex-col items-center gap-4 py-12">
                            <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                            <p className="text-stone-400 font-mono text-sm animate-pulse">{statusText}</p>
                        </div>
                    )
                }

                {/* CONTROLS */}
                <div className="flex flex-col gap-8 w-full max-w-lg items-center">

                    {/* Topic Selector */}
                    {state === AppState.IDLE && (
                        <div className="w-full space-y-6">

                            {isManualMode ? (
                                /* MANUAL MODE INPUTS */
                                <div className="flex flex-col gap-4 bg-stone-900/50 p-6 rounded-2xl border border-stone-800 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                                    <h3 className="text-center text-purple-400 font-bold tracking-widest text-xs uppercase mb-2">Ingreso Manual de Contenido</h3>

                                    {/* Daily Word Button removed per user request */}

                                    <div className="space-y-2">
                                        <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">Título (Opcional)</label>
                                        <input
                                            type="text"
                                            value={manualTitle}
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            placeholder="Ej: Salmo 23"
                                            className="w-full bg-black/50 border border-stone-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">Texto Completo (Oración)</label>
                                        <textarea
                                            value={manualText}
                                            onChange={(e) => setManualText(e.target.value)}
                                            placeholder="Pega aquí tu oración o frase completa..."
                                            rows={5}
                                            className="w-full bg-black/50 border border-stone-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">Autor / Fuente</label>
                                            <input
                                                type="text"
                                                value={manualAuthor}
                                                onChange={(e) => setManualAuthor(e.target.value)}
                                                placeholder="Ej: David, San Agustín..."
                                                className="w-full bg-black/50 border border-stone-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">Estilo Visual</label>
                                            <select
                                                value={manualCategory}
                                                onChange={(e) => setManualCategory(e.target.value as any)}
                                                className="w-full bg-black/50 border border-stone-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition"
                                            >
                                                <option value="CHRISTIAN">Cristiano ✝️</option>
                                                <option value="STOIC">Estoico 🏛️</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-t border-stone-800 pt-4">
                                        <label className="text-xs text-purple-400 uppercase tracking-wider font-bold flex items-center gap-2">
                                            <Sparkles size={12} />
                                            Multimedia Propio (Opcional)
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*,video/*"
                                                multiple
                                                onChange={handleFileUpload}
                                                className="w-full text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-900 file:text-purple-100 hover:file:bg-purple-800 cursor-pointer bg-black/30 rounded-lg border border-dashed border-stone-700 hover:border-purple-500/50 transition-all p-2"
                                            />
                                        </div>
                                        {manualMediaUrls.length > 0 && (
                                            <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                                                ✅ {manualMediaUrls.length} archivo(s) cargado(s) ({manualMediaType})
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* AUTO MODE INPUT */
                                <div className="w-full bg-stone-900/50 p-6 rounded-2xl border border-stone-800 backdrop-blur-sm">
                                    <label className="block text-xs uppercase tracking-widest font-bold text-stone-500 mb-2 text-center">
                                        Escribe tu Tema o Elige Abajo
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        placeholder="Ej: La Muerte, Disciplina, Poder..."
                                        className="w-full bg-black/50 border border-stone-700 rounded-xl px-4 py-4 text-center text-lg font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-stone-600"
                                    />
                                </div>
                            )}



                            {/* Christian Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 justify-center text-amber-500/80">
                                    <BookOpen size={14} />
                                    <p className="text-xs uppercase tracking-widest font-bold">Peticiones y Oraciones de Poder</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {/* Palabra del día button removed */}
                                    <button
                                        onClick={() => fetchVaticanContent('GOSPEL')}
                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-full text-[10px] text-red-200 uppercase tracking-widest font-bold transition flex items-center gap-2"
                                    >
                                        <Sparkles size={12} />
                                        Evangelio
                                    </button>
                                    <button
                                        onClick={() => fetchVaticanContent('READING_1')}
                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 rounded-full text-[10px] text-blue-200 uppercase tracking-widest font-bold transition flex items-center gap-2"
                                    >
                                        <BookOpen size={12} />
                                        1ra Lectura
                                    </button>
                                    <button
                                        onClick={() => fetchVaticanContent('READING_2')}
                                        className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-full text-[10px] text-indigo-200 uppercase tracking-widest font-bold transition flex items-center gap-2"
                                    >
                                        <BookOpen size={12} />
                                        2da Lectura
                                    </button>
                                    <button
                                        onClick={() => fetchVaticanContent('PSALM')}
                                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/50 rounded-full text-[10px] text-emerald-200 uppercase tracking-widest font-bold transition flex items-center gap-2"
                                    >
                                        <BookOpen size={12} />
                                        Salmo
                                    </button>
                                    {/* Topics Removed per User Request */}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={startGeneration}
                        disabled={state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR}
                        className="group relative flex items-center justify-center gap-3 bg-gradient-to-br from-stone-200 to-stone-400 hover:from-white hover:to-stone-300 text-black font-bold py-4 px-12 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 w-full max-w-sm"
                    >
                        {state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR ? (
                            <span>Creando Video...</span>
                        ) : (
                            <>
                                <Sparkles size={20} className="text-amber-600 fill-current" />
                                <span>Generar Video Viral</span>
                            </>
                        )}
                    </button>
                </div >

                {/* History */}
                {
                    history.length > 0 && (
                        <div className="w-full mt-12 border-t border-stone-900 pt-8">
                            <h3 className="text-center text-stone-600 mb-6 uppercase tracking-widest text-xs font-bold">Historial</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setCurrentContent(item)}
                                        className={`cursor - pointer rounded - lg overflow - hidden border ${currentContent?.id === item.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-stone-800 hover:border-stone-600'} transition - all opacity - 80 hover: opacity - 100`}
                                    >
                                        <div className="aspect-[9/16] relative bg-stone-900 group">
                                            {item.imageUrls && item.imageUrls.length > 0 ? (
                                                <img src={item.imageUrls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                                                    <span className="text-xs text-stone-600">Audio</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

            </main >
        </div >
    );
};

export default App;