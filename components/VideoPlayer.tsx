import React, { useEffect, useRef, useState } from 'react';
import { GeneratedContent } from '../types';
import { getThemeById } from '../config/themes';
import { decodeAudioData } from '../services/audioService';
import { AmbientDrone } from '../services/audioService';
import { convertWebMToMP4, ConversionProgress } from '../services/videoConverter';
import { shareToTwitter, shareToFacebook, shareToWhatsApp, shareToTikTok, generateShareText } from '../services/shareService';
import { generateShareLink, copyShareLink } from '../services/shareLinkService';
import { Play, Pause, Download, Loader2, Volume2, VolumeX, RefreshCw, Share2, Link } from 'lucide-react';

interface VideoPlayerProps {
  content: GeneratedContent;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  opacity: number;
}

const CANVAS_WIDTH = 540;  // 9:16 Ratio high res enough for phone
const CANVAS_HEIGHT = 960;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ content }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hidden sources
  const imageElementsRef = useRef<HTMLImageElement[]>([]);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRendering, setIsRendering] = useState(false); // For download process
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [hasEnded, setHasEnded] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const activeWordIndexRef = useRef(-1);
  const lastSlideIndexRef = useRef(0);

  // Audio Engine Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const voiceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const droneRef = useRef<AmbientDrone | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Recorder Refs
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Animation Refs
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timingsRef = useRef<WordTiming[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioFinishedRef = useRef(false); // Track if audio has ended

  // Initialize
  useEffect(() => {
    initPlayer();
    return () => stopPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  async function initPlayer() {
    try {
      console.log("🎬 VideoPlayer: Initializing...");
      stopPlayer();
      setHasEnded(false);
      setIsRendering(false);

      // 1. Setup Audio Context
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      // Master Gain (Volume Control)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Destination for Recording
      const dest = ctx.createMediaStreamDestination();
      masterGain.connect(dest);
      destNodeRef.current = dest;

      // Analyser for Visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      masterGain.connect(analyser);
      analyserRef.current = analyser;

      // Drone
      droneRef.current = new AmbientDrone(ctx);

      // 2. Load Visual Assets OR Custom Video
      console.log("🎬 Loading visuals...");

      if (content.customMedia?.type === 'video') {
        // Custom Video Mode
        console.log("🎥 Loading Custom Video:", content.customMedia.url);
        const vid = document.createElement('video');
        vid.src = content.customMedia.url;
        vid.crossOrigin = "anonymous";
        vid.loop = true;
        vid.muted = true; // Audio handled by AudioContext separately? Or should we use video audio?
        // For now, we use generated text audio, so video is visual only.
        await new Promise((resolve) => {
          vid.onloadeddata = resolve;
          vid.load();
        });
        videoElementRef.current = vid;
        // Start playing video immediately so it's ready for canvas draw
        vid.play().catch(e => console.error("Video play error", e));
      }
      else if (content.imageUrls && content.imageUrls.length > 0) {
        // Preload all images (Standard or Custom Image)
        const promises = content.imageUrls.map(url => {
          return new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.warn("Failed to load image:", url);
              resolve(null);
            };
          });
        });
        const loadedImages = await Promise.all(promises);
        imageElementsRef.current = loadedImages.filter((img): img is HTMLImageElement => img !== null);
      } else {
        imageElementsRef.current = [];
      }

      // 3. Load Audio Data & Calculate Timings
      if (content.audioData) {
        console.log("🎬 Decoding Audio Data (Mock PCM)...");
        try {
          const buffer = await decodeAudioData(content.audioData, ctx);
          audioBufferRef.current = buffer;
          calculateTimings(buffer.duration);
          console.log("✅ Audio Decoded. Duration:", buffer.duration);
        } catch (audioErr) {
          console.error("❌ Audio Decode Failed:", audioErr);
          // Non-fatal? If we fail to decode, we can't sync.
          // But we should continue to at least show the video?
          // Let's create a silent fallback buffer (10s)
          const fallbackBuffer = ctx.createBuffer(2, 24000 * 10, 24000);
          audioBufferRef.current = fallbackBuffer;
          calculateTimings(10);
        }
      }

      // 4. Init Particles
      initParticles();

      // 5. Initial Draw
      drawFrame();

      // Auto-start playback (preview)
      console.log("🎬 Starting Sequence...");
      playSequence();
    } catch (err) {
      console.error("🔥 VideoPlayer CRASH:", err);
    }
  };

  const stopPlayer = () => {
    // 1. Audio Nodes
    if (voiceNodeRef.current) {
      try { voiceNodeRef.current.stop(); } catch (e) { }
      voiceNodeRef.current = null;
    }
    if (droneRef.current) {
      droneRef.current.stop();
    }

    // 2. Animation
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    // 3. Browser TTS
    window.speechSynthesis.cancel();

    setIsPlaying(false);
  };


  const initParticles = () => {
    const p: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      p.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speedY: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
    particlesRef.current = p;
  };

  const calculateTimings = (duration: number) => {
    const words = content.quote.text.split(/\s+/);

    // 1. Calculate "Virtual Length" of each word
    const virtualLengths = words.map(word => {
      const cleanLen = word.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/g, '').length;
      let vLen = Math.max(2, cleanLen); // Min length of 2

      // Add "Virtual Characters" for punctuation to absorb time
      if (word.includes(',') || word.includes(';')) vLen += 4;  // ~2 extra chars worth of time
      if (word.includes('.') || word.includes('?') || word.includes('!')) vLen += 8; // ~4 extra chars

      return vLen;
    });

    const totalVirtualLength = virtualLengths.reduce((a, b) => a + b, 0);

    // 2. Define "Speech Window" (Exclude entry/exit silence)
    const startMute = 0.0; // No delay - speech starts immediately
    const endMute = 0.8; // Reduced for tighter sync at end
    const speechDuration = Math.max(1, duration - startMute - endMute);

    // 3. Distribute
    let currentTime = startMute;

    timingsRef.current = words.map((word, i) => {
      const percent = virtualLengths[i] / totalVirtualLength;
      const wordDuration = percent * speechDuration;

      const t = {
        word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      currentTime += wordDuration;
      return t;
    });
  };

  async function playSequence(isRenderMode = false) {
    const ctx = audioCtxRef.current;
    if (!ctx || !audioBufferRef.current) return;

    if (ctx.state === 'suspended') await ctx.resume();

    // Stop existing audio
    if (voiceNodeRef.current) { try { voiceNodeRef.current.stop() } catch (e) { } }
    if (droneRef.current) droneRef.current.stop();

    // Reset custom video if present
    const customVideo = videoElementRef.current;
    if (customVideo) {
      customVideo.currentTime = 0;
      customVideo.play().catch(e => console.error("Video replay error", e));
    }

    // Reset animation timing
    startTimeRef.current = ctx.currentTime;
    activeWordIndexRef.current = -1;
    audioFinishedRef.current = false; // Reset audio finished flag

    // Restart render loop
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    drawFrame();

    // Start Audio Source
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    if (masterGainRef.current) source.connect(masterGainRef.current);
    voiceNodeRef.current = source;

    // --- LOGIC SPLIT: NATIVE MP3 VS BROWSER SYNTHESIS ---
    if (content.isNativeAudio) {
      console.log("🔊 Playing Native Audio (Google TTS)...");
      // Source will be started below in common code

      // Use onended to stop
      source.onended = () => {
        console.log("🎤 Native Audio Finished.");
        setTimeout(() => {
          if (droneRef.current) droneRef.current.stop();
          setIsPlaying(false);
          setHasEnded(true);
          cancelAnimationFrame(requestRef.current);
        }, 500);
      };

    } else {
      // --- BROWSER TTS FALLBACK ---
      console.log("🗣️ Using Browser Synthesis with time-based sync...");

      // CANCELAR cualquier speech anterior primero
      window.speechSynthesis.cancel();

      if (content.quote?.text && !isMuted) {
        // Include Title and Author in spoken text
        const spokenText = content.quote.title
          ? `${content.quote.title}. ${content.quote.text}. ${content.quote.author}`
          : `${content.quote.text}. ${content.quote.author}`;

        const utterance = new SpeechSynthesisUtterance(spokenText);

        // --- INTELLIGENT VOICE SELECTION (MALE PRIORITY) ---
        const voices = window.speechSynthesis.getVoices();

        const maleKeywords = ['Pablo', 'Alvaro', 'David', 'Miguel', 'Enrique', 'Male', 'Hombre'];

        // 1. Try finding a known Male Spanish voice
        let bestVoice = voices.find(v =>
          v.lang.startsWith('es') && maleKeywords.some(k => v.name.includes(k))
        );

        // 2. If no explicit male, try "Natural" voices (often high quality, maybe gender configurable?)
        if (!bestVoice) {
          bestVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Online') || v.name.includes('Natural')));
        }

        // 3. Fallback: Any Spanish
        if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('es'));

        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log("🗣️ VideoPlayer Voice:", bestVoice.name);
        } else {
          utterance.lang = 'es-ES';
        }

        // --- DYNAMIC TUNING ---
        const opts = content.audioOptions || { pitch: 0.8, rate: 0.9 };
        utterance.pitch = opts.pitch;
        utterance.rate = opts.rate;
        utterance.volume = 1;

        speechUtteranceRef.current = utterance;

        // --- HEURISTIC TIMELINE SYNC ---
        // 1. Get all words to render
        const titleArr = (content.quote.title || '').split(/\s+/).filter(w => w.length > 0);
        const bodyArr = content.quote.text.split(/\s+/).filter(w => w.length > 0);
        const allWords = [...titleArr, ...bodyArr];
        const totalRenderedWords = allWords.length;

        // 2. Calculate weights based on length & punctuation
        let totalWeight = 0;
        const wordWeights = allWords.map(word => {
          let weight = word.length + 2; // Base: length + subtle const
          if (word.match(/[.!?]$/)) weight += 15; // Major pause (period)
          else if (word.match(/[,;:]$/)) weight += 8; // Minor pause (comma)
          else if (word.length > 7) weight += 2; // Extra for long words

          totalWeight += weight;
          return weight;
        });

        // 3. Estimate Duration
        const totalSpokenChars = spokenText.length;
        const charsPerSecond = 18 * (utterance.rate || 0.9);
        const estimatedDuration = totalSpokenChars / charsPerSecond;

        console.log(`📊 Sync: ${totalRenderedWords} words. Heuristic weights calculated.`);

        // 4. Build Timeline (Absolute Times)
        let accumulatedTime = 0;
        const timeline = wordWeights.map((w, i) => {
          const duration = (w / totalWeight) * estimatedDuration;
          const start = accumulatedTime;
          accumulatedTime += duration;
          return {
            word: allWords[i],
            start,
            end: accumulatedTime,
            index: i
          };
        });

        timingsRef.current = timeline as any;
        (timingsRef.current as any).totalWords = totalRenderedWords;
        (timingsRef.current as any).totalDuration = estimatedDuration;
        (timingsRef.current as any).isHeuristic = true; // Flag for draw loop

        // --- AUTO-STOP ON SPEECH END ---
        utterance.onend = () => {
          const actualDuration = audioCtxRef.current ? (audioCtxRef.current.currentTime - startTimeRef.current) : estimatedDuration;
          console.log(`🎤 Audio Finished. Estimated: ${estimatedDuration.toFixed(2)}s, Actual: ${actualDuration.toFixed(2)}s`);

          // Update metadata with ACTUAL duration for accurate final frame calculations
          (timingsRef.current as any).totalDuration = actualDuration;

          // CRITICAL: Set flag FIRST to prevent drawFrame from recalculating
          audioFinishedRef.current = true;
          // Then set to last valid index (0-based, so totalWords - 1)
          activeWordIndexRef.current = totalRenderedWords - 1;

          setTimeout(() => {
            if (voiceNodeRef.current) { try { voiceNodeRef.current.stop() } catch (e) { } }
            setIsPlaying(false);
            setHasEnded(true);
            if (droneRef.current) droneRef.current.stop();
            cancelAnimationFrame(requestRef.current);
          }, 800); // Increased to 800ms to clearly show last word
        };

        window.speechSynthesis.speak(utterance);
      }
    }
    source.start(0);

    setIsPlaying(true);
    setHasEnded(false);

    const loop = () => {
      drawFrame();

      const elapsed = ctx.currentTime - startTimeRef.current;

      // Check End
      if (elapsed > audioBufferRef.current!.duration + 1) {
        if (isRenderMode) {
          stopRecording();
        } else {
          setIsPlaying(false);
          setHasEnded(true);
          if (droneRef.current) droneRef.current.stop();
        }
        return;
      }

      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };



  const togglePlayback = () => {
    console.log('🔘 togglePlayback called, isPlaying:', isPlaying, 'hasEnded:', hasEnded);
    if (isPlaying) {
      stopPlayer();
    } else {
      // Restart the sequence
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      playSequence();
    }
  };

  const toggleMute = () => {
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(isMuted ? 0 : 1, now);
      setIsMuted(!isMuted);
    }
  };

  // --- RENDERING LOGIC (Canvas) ---
  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elapsed = audioCtxRef.current ? (audioCtxRef.current.currentTime - startTimeRef.current) : 0;
    const totalDuration = audioBufferRef.current?.duration || 10;

    // --- HEURISTIC SYNC UPDATE ---
    if (!audioFinishedRef.current && timingsRef.current && (timingsRef.current as any).isHeuristic) {
      const timeline = timingsRef.current as any as { start: number, end: number, index: number }[];

      // Find current word based on elapsed time
      const found = timeline.find(t => elapsed >= t.start && elapsed < t.end);

      if (found) {
        activeWordIndexRef.current = found.index;
      } else if (timeline.length > 0 && elapsed >= timeline[timeline.length - 1].end) {
        // If past the end, clamp to last word
        activeWordIndexRef.current = timeline[timeline.length - 1].index;
      }
    }

    // 1. Background Logic (Custom Video OR Slideshow)
    let bgDrawn = false;

    // CHECK CUSTOM VIDEO
    const customVideo = videoElementRef.current;
    if (customVideo) {
      drawVideoFrame(ctx, customVideo);
      bgDrawn = true;
    } else {
      // SLIDESHOW LOGIC
      const images = imageElementsRef.current;

      if (images && images.length > 0) {
        const slideDuration = totalDuration / images.length;
        const currentSlideIndex = Math.min(Math.floor(elapsed / slideDuration), images.length - 1);
        const nextSlideIndex = (currentSlideIndex + 1) % images.length;
        const slideLocalTime = elapsed % slideDuration;

        // Draw Current Slide
        if (images[currentSlideIndex]) {
          drawPannedImage(ctx, images[currentSlideIndex], 1, elapsed);
        } else {
          console.warn(`⚠️ Image at index ${currentSlideIndex} is undefined`);
        }

        // Crossfade logic
        const crossFadeStart = slideDuration - 1.0;
        if (slideLocalTime > crossFadeStart && currentSlideIndex < images.length - 1) {
          const opacity = (slideLocalTime - crossFadeStart) / 1.0;
          if (images[nextSlideIndex]) {
            drawPannedImage(ctx, images[nextSlideIndex], opacity, elapsed + 5);
          }
        }

        // Check for slide change to trigger SFX (One-time trigger)
        if (currentSlideIndex !== lastSlideIndexRef.current) {
          lastSlideIndexRef.current = currentSlideIndex;
          if (currentSlideIndex > 0) playImpactSound(); // Don't play on 0 (start)
        }

        bgDrawn = true;
      }
    }

    // Fallback Background (Procedural)
    if (!bgDrawn) {
      // Base dark bg
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // --- CINEMATIC FOG OVERLAY ---
    // Floating fog clouds that move slowly
    const time = elapsed * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay'; // Blend mode for atmosphere

    for (let i = 0; i < 3; i++) {
      const x = (Math.sin(time * 0.2 + i) * 100) + (CANVAS_WIDTH / 2);
      const y = ((time * 20 + i * 200) % (CANVAS_HEIGHT + 400)) - 200;
      const size = 400 + (Math.sin(time * 0.5 + i) * 100);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Cinematic Overlay (Vignette & darken) - REDUCIDO para ver fondo
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, 'rgba(0,0,0,0.1)'); // Muy sutil arriba
    grad.addColorStop(0.5, 'rgba(0,0,0,0.05)'); // Casi transparente medio
    grad.addColorStop(1, 'rgba(0,0,0,0.3)'); // Sutil abajo
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 3. Film Grain
    drawFilmGrain(ctx);

    // 4. Particles (Embers)
    drawEmbers(ctx);

    // 5. Text (Karaoke)
    if (audioCtxRef.current) {
      drawKaraokeText(ctx, elapsed);
    }

    // 6. Visualizer & Progress
    drawVisualizer(ctx);
    drawProgressBar(ctx, elapsed, totalDuration);
    drawCTA(ctx, elapsed, totalDuration);

    // 7. Safe Zone Overlay (Debug Guide)
    // TikTok UI: Right side buttons, Bottom description
    // if (paused) { // Optional: Show only when paused? User asked for option.
    // For now, subtle guide always on or just when rendering? Let's make it always invisible unless specific debug state, 
    // BUT the text layout logic above already centers it. 
    // Let's add a visual guide that flashes briefly at start or safe area borders.
    // Actually, user asked for "Option to see". For simplicity, let's draw it faint if not rendering.

    if (!isRendering && elapsed < 2) { // Show guide for first 2 seconds as check
      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      // Safe Area Rect (approx TikTok safe zone)
      // Top: 100px clear, Bottom: 200px clear, Sides: 20px clear, Right: 80px clear
      ctx.strokeRect(20, 100, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 350);

      ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
      ctx.font = "10px sans-serif";
      ctx.fillText("SAFE ZONE", 30, 115);
      ctx.restore();
    }

    // 8. Branding/Title Overlay (Fades out)
    if (elapsed < 3) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (elapsed / 3));
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px tracking-widest uppercase sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 5;
      ctx.fillStyle = content.quote.category === 'CHRISTIAN' ? '#fbbf24' : '#ffffff';
      ctx.fillText(content.quote.category === 'CHRISTIAN' ? "DIVINE WISDOM" : "STOICBOT", CANVAS_WIDTH / 2, 60);
      ctx.restore();
    }
  };

  // --- AUDIO SFX ---
  const playImpactSound = () => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;

    // 1. Low Thud (Sine Drop)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(masterGainRef.current!); // Connect to master so it respects mute

    osc.start(t);
    osc.stop(t + 0.6);

    // 2. High Breath (Noise element) if Christian for "Angel wings" effect? 
    // Let's keep it simple: A cinematic "Whoosh"
    // Use a Bandpass filter on simple noise if possible, but for now just the Thud is good for "Impact".
  };

  const drawFilmGrain = (ctx: CanvasRenderingContext2D) => {
    // Procedural noise
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    // We don't generate full pixel noise every frame for performance, just random rects
    // Or we can use a small pattern
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const alpha = Math.random() * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
  };

  const drawPannedImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, opacity: number, timeSeed: number) => {
    if (!img) {
      console.warn("⚠️ drawPannedImage called with null/undefined img");
      return;
    }

    ctx.save();
    ctx.globalAlpha = opacity;

    // Gentle Ken Burns: Zoom in slowly
    const scale = 1.0 + (Math.sin(timeSeed * 0.05) * 0.15); // Scales between 1.0 and 1.15
    // Pan slightly based on time
    const xPan = (Math.sin(timeSeed * 0.1) * 20);

    // Center zoom
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.translate(-CANVAS_WIDTH / 2 + xPan, -CANVAS_HEIGHT / 2);

    ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  };

  // Helper to draw video frame
  const drawVideoFrame = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement) => {
    // Cover logic (Object-fit: cover)
    const vidRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let drawWidth = CANVAS_WIDTH;
    let drawHeight = CANVAS_HEIGHT;
    let offsetX = 0;
    let offsetY = 0;

    if (vidRatio > canvasRatio) {
      drawWidth = CANVAS_HEIGHT * vidRatio;
      offsetX = (CANVAS_WIDTH - drawWidth) / 2;
    } else {
      drawHeight = CANVAS_WIDTH / vidRatio;
      offsetY = (CANVAS_HEIGHT - drawHeight) / 2;
    }

    // Draw video
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

    // Add Overlay for text readability
    ctx.fillStyle = "rgba(0,0,0,0.5)"; // Darker overlay for video
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawKaraokeText = (ctx: CanvasRenderingContext2D, elapsed: number) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = content.quote.text.split(/\s+/);

    // Find active word logic
    // We now use the state driven by 'onboundary' event
    let activeIdx = activeWordIndexRef.current;

    // Debug info on screen (temporary)
    // ctx.fillText(`Idx: ${activeIdx}`, 50, 50);

    // Handle end of stream holding (keep last word lit)
    if (activeIdx >= words.length) {
      activeIdx = words.length - 1;
    }

    // setActiveWordIndex(activeIdx); // No need to trigger re-renders, purely canvas driven

    // Layout configuration
    // Dynamic Font Size for Prayers (Granular)
    const count = words.length;
    let fontSize = 52;
    let lineHeight = 70;

    if (count > 120) {
      fontSize = 24;
      lineHeight = 36;
    } else if (count > 70) {
      fontSize = 28; // Fits ~80-100 words
      lineHeight = 42;
    } else if (count > 30) {
      fontSize = 34; // Fits ~40-60 words
      lineHeight = 50;
    }
    // Else default 52/70 for short impactful quotes

    const maxWidth = CANVAS_WIDTH - 80;
    // Fix: Start from absolute center. We will subtract half height later.
    const startY = CANVAS_HEIGHT / 2;

    const fontName = `"${content.fontFamily || 'Cinzel'}", serif`;
    ctx.font = `${fontSize}px ${fontName}`;

    // --- SYNC LOGIC ---
    // If title is present, the audio index counts through the Title + Body words.
    // We need to calculate the offset to know if we are in Title or Body.

    const title = content.quote.title?.trim().toUpperCase();
    const titleWords = title ? title.split(/\s+/) : [];
    const titleLength = titleWords.length;

    // Calculate Active Index relative to Body Text
    // If global index < titleLength, we are in title.
    // If global index >= titleLength, we are in body (shifted by titleLength).

    const globalIndex = activeIdx;
    const isTitleActive = titleLength > 0 && globalIndex < titleLength;
    const bodyActiveIndex = globalIndex - titleLength; // Negative if in title

    // --- DRAW TITLE (IF PRESENT) ---
    let titleOffset = 0; // To push body text down if title is present

    if (content.quote.title && elapsed > 0.5) {
      ctx.save();
      const titleFont = "bold 42px 'Anton', sans-serif";
      ctx.font = titleFont;
      ctx.fillStyle = "#fbbf24"; // Gold color
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;

      const titleWords = content.quote.title.toUpperCase().split(' ');
      let titleLine = '';
      const titleLines = [];
      const titleMaxWidth = CANVAS_WIDTH - 60; // Padding

      for (let n = 0; n < titleWords.length; n++) {
        const testLine = titleLine + titleWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > titleMaxWidth && n > 0) {
          titleLines.push(titleLine);
          titleLine = titleWords[n] + ' ';
        } else {
          titleLine = testLine;
        }
      }
      titleLines.push(titleLine);

      // Draw title lines
      let titleY = 100; // Start Y
      const titleLineHeight = 46;

      titleLines.forEach((line) => {
        ctx.fillText(line.trim(), CANVAS_WIDTH / 2, titleY);
        titleY += titleLineHeight;
      });

      titleOffset = (titleLines.length * titleLineHeight) + 20; // Padding
      ctx.restore();
    }

    // --- MAIN TEXT ---
    // Ensure main font is set back for measurements
    ctx.font = `${fontSize}px ${fontName}`;

    // Adjust startY based on title
    // If title exists, we might need to push startY down or ensure it flows
    // Original startY was Center (CANVAS_HEIGHT / 2).
    // Let's rely on scroll logic for long text, but for layout:
    // If title takes space at top, the "Center" might need to be effectively lower?
    // Actually, the main text scroll logic centers the *active line*.
    // We just need to make sure we don't draw ON TOP of the title.
    // The main text runs in a scroll block. 
    // Let's just trust separate layer rendering, but maybe we can warn if body is too high?
    // For now, let's just wrap the title. The body text autoscrolls so it should be fine.

    // Word Wrapping Logic
    let line = '';
    let lines: { text: string, words: { text: string, index: number }[] }[] = [];
    let currentLineWords: { text: string, index: number }[] = [];
    let wordGlobalIndex = 0; // Relative to Body Start

    for (let i = 0; i < words.length; i++) {
      // ... (existing wrapping logic) ...
      // We reconstruct the loop to ensure clean indexing
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push({ text: line, words: currentLineWords });
        line = words[i] + ' ';
        currentLineWords = [{ text: words[i], index: wordGlobalIndex++ }];
      } else {
        line = testLine;
        currentLineWords.push({ text: words[i], index: wordGlobalIndex++ });
      }
    }
    lines.push({ text: line, words: currentLineWords });

    // Draw Lines
    const totalLines = lines.length;
    const totalTextHeight = totalLines * lineHeight;

    // SCROLLING LOGIC (Teleprompter / Karaoke Scroll)
    let blockStartOffsetY = CANVAS_HEIGHT / 2;

    // Sync Scroll to BODY Index
    if (totalTextHeight > (CANVAS_HEIGHT - 300)) {
      // Only scroll if we are actually IN the body
      if (bodyActiveIndex >= 0) {
        let activeLineIndex = 0;
        lines.forEach((l, idx) => {
          const firstWordIdx = l.words[0]?.index || 0;
          const lastWordIdx = l.words[l.words.length - 1]?.index || 0;
          if (bodyActiveIndex >= firstWordIdx && bodyActiveIndex <= lastWordIdx) {
            activeLineIndex = idx;
          }
        });
        const targetBlockTop = (CANVAS_HEIGHT / 2) - (activeLineIndex * lineHeight) - (lineHeight / 2);
        blockStartOffsetY = targetBlockTop;
      } else {
        // If in title, show start of body
        blockStartOffsetY = (CANVAS_HEIGHT / 2) - (0 * lineHeight) - (lineHeight / 2);
      }
    } else {
      blockStartOffsetY = (CANVAS_HEIGHT / 2) - (totalTextHeight / 2);
    }

    // Draw
    lines.forEach((lineObj, lineIdx) => {
      const lineY = blockStartOffsetY + (lineIdx * lineHeight);
      if (lineY < -100 || lineY > CANVAS_HEIGHT + 100) return;

      ctx.font = `${fontSize}px ${fontName}`;
      let lineWidth = ctx.measureText(lineObj.text.trim()).width;
      let currentX = (CANVAS_WIDTH / 2) - (lineWidth / 2);

      lineObj.words.forEach(w => {
        // CRITICAL FIX: Compare against bodyActiveIndex instead of global activeIdx
        const isActive = bodyActiveIndex >= 0 && w.index === bodyActiveIndex;
        const isPast = bodyActiveIndex >= 0 && w.index < bodyActiveIndex;


        ctx.font = `${fontSize}px ${fontName}`;
        const standardMetrics = ctx.measureText(w.text + " ");
        const wordWidth = standardMetrics.width;

        // --- SEMANTIC COLORING ---
        const lowerText = w.text.toLowerCase();
        let wordColor = "#ffffff"; // Default white
        let glowColor = "rgba(255, 255, 255, 0.5)";

        // 1. DANGER / DEATH (Red)
        if (['death', 'pain', 'die', 'sangre', 'miedo', 'muerte', 'dolor', 'suffer', 'hell', 'infierno', 'matar', 'kill'].some(k => lowerText.includes(k))) {
          wordColor = "#ef4444"; // Red-500
          glowColor = "rgba(239, 68, 68, 0.8)";
        }
        // 2. GOD / HOLY / LIGHT (Gold/Yellow)
        else if (['god', 'lord', 'dios', 'señor', 'espíritu', 'santo', 'luz', 'padre', 'cielo', 'heaven', 'light', 'pray', 'orar'].some(k => lowerText.includes(k))) {
          wordColor = "#fbbf24"; // Amber-400
          glowColor = "rgba(251, 191, 36, 0.8)";
        }
        // 3. HOPE / LIFE (Green/Blue)
        else if (['hope', 'life', 'vida', 'esperanza', 'fe', 'faith', 'love', 'amor', 'paz', 'peace'].some(k => lowerText.includes(k))) {
          wordColor = "#34d399"; // Emerald-400
          glowColor = "rgba(52, 211, 153, 0.8)";
        }

        if (isActive) {
          // --- CAMERA SHAKE TRIGGER ---
          // Logic handled in drawFrame via ref

          // --- GLITCH / CHROMATIC ABERRATION (Phonk Style) ---
          // Only glitch if it's a "Power Word" (has semantic color)
          const isPowerWord = wordColor !== "#ffffff";

          ctx.save();
          const centerX = currentX + (wordWidth / 2);
          const centerY = lineY;
          ctx.translate(centerX, centerY);

          // Massive Pop
          const scale = isPowerWord ? 1.7 : 1.5;
          ctx.scale(scale, scale);
          ctx.rotate((Math.random() - 0.5) * 0.1); // Jitter

          if (isPowerWord) {
            // 1. Cyan Layer (Offset Left)
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = "#00ffff";
            ctx.fillText(w.text, -4 + (Math.random() * 2), 0);

            // 2. Red Layer (Offset Right)
            ctx.fillStyle = "#ff0000";
            ctx.fillText(w.text, 4 + (Math.random() * 2), 0);

            ctx.globalCompositeOperation = 'source-over';
          }

          // Main Text (White/Colored Center)
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = isPowerWord ? 60 : 40;
          ctx.fillStyle = "#ffffff";

          // Outline
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.lineJoin = 'round';
          ctx.strokeText(w.text, 0, 0);
          ctx.fillText(w.text, 0, 0);

          ctx.restore();

        } else if (isPast) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; // Slightly dimmer past
          ctx.fillText(w.text, currentX + (wordWidth / 2), lineY);
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)"; // Darker future
          ctx.fillText(w.text, currentX + (wordWidth / 2), lineY);
        }

        currentX += wordWidth;
      });
      // y += lineHeight; // Legacy code, removed as we calculate lineY explicitly
    });

    // Author - Position at bottom of the block
    if (elapsed > 1) {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      // Calc bottom of block
      const blockBottomY = blockStartOffsetY + totalTextHeight;
      // Ensure Author is at least visible if scrolling.
      // If scrolling, blockStartOffsetY moves up, so author moves up with it.
      // This is correct behavior (scrolling up).
      ctx.fillText(content.quote.author.toUpperCase(), CANVAS_WIDTH / 2, blockBottomY + 40);
    }
  };

  // --- VIRAL LAYERS ---

  const drawProgressBar = (ctx: CanvasRenderingContext2D, elapsed: number, duration: number) => {
    const progress = Math.min(1, elapsed / duration);
    const h = 6;
    const w = CANVAS_WIDTH;

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(0, CANVAS_HEIGHT - h, w, h);

    // Gradient bar
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(1, '#f59e0b');

    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.fillRect(0, CANVAS_HEIGHT - h, w * progress, h);
    ctx.shadowBlur = 0;
  };

  const drawCTA = (ctx: CanvasRenderingContext2D, elapsed: number, duration: number) => {
    const timeLeft = duration - elapsed;
    if (timeLeft > 3) return; // Only show in last 3 seconds

    const alpha = Math.min(1, (3 - timeLeft) * 2); // Fade in fast

    ctx.save();
    ctx.globalAlpha = alpha;

    const y = CANVAS_HEIGHT / 2 + 250; // Moved lower to avoid covering text

    // Background pill
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    // Simple rect fallback for canvas
    ctx.roundRect(CANVAS_WIDTH / 2 - 150, y - 25, 300, 50, 25);
    ctx.fill();

    // Text
    ctx.font = "bold 24px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";

    const ctaText = content.quote.category === 'CHRISTIAN'
      ? "👉 ESCRIBE 'AMEN'"
      : "👉 SÍGUEME PARA MÁS";

    ctx.fillText(ctaText, CANVAS_WIDTH / 2, y + 8);

    ctx.restore();
  };

  const drawEmbers = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(p => {
      // Update (Drift)
      p.y -= p.speedY;
      p.x += Math.sin(p.y * 0.01) * 0.5;
      if (p.y < 0) {
        p.y = CANVAS_HEIGHT;
        p.x = Math.random() * CANVAS_WIDTH;
      }

      // Draw Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = content.quote.category === 'CHRISTIAN' ? "rgba(200, 230, 255, 0.8)" : "rgba(255, 100, 0, 0.8)";
      ctx.fillStyle = content.quote.category === 'CHRISTIAN'
        ? `rgba(200, 230, 255, ${p.opacity})`
        : `rgba(255, 150, 50, ${p.opacity})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    });
  };

  const drawVisualizer = (ctx: CanvasRenderingContext2D) => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const barWidth = CANVAS_WIDTH / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * 100;
      ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
      ctx.fillRect(x, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  };

  const handleDownloadVideo = () => {
    if (isRendering || !canvasRef.current || !destNodeRef.current) return;

    setIsRendering(true);
    recordedChunksRef.current = [];

    const canvasStream = canvasRef.current.captureStream(30);
    const audioStream = destNodeRef.current.stream;

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    const options = { mimeType: 'video/webm; codecs=vp9' };
    try {
      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stoicbot - ${content.id}.webm`;
        a.click();
        setIsRendering(false);
        playSequence();
      };

      recorder.start();
      playSequence(true);
    } catch (e) {
      console.error("Recorder error", e);
      setIsRendering(false);
      alert("Recording not supported in this browser.");
    }
  };

  const handleDownloadMP4 = async () => {
    if (isRendering || isConverting || !canvasRef.current || !destNodeRef.current) return;

    try {
      setIsRendering(true);
      setConversionProgress({ progress: 0, stage: 'Preparing...' });
      recordedChunksRef.current = [];

      const canvasStream = canvasRef.current.captureStream(30);
      const audioStream = destNodeRef.current.stream;

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      const options = { mimeType: 'video/webm; codecs=vp9' };
      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const webmBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setIsRendering(false);
          setIsConverting(true);

          // Convert to MP4
          const mp4Blob = await convertWebMToMP4(webmBlob, (progress) => {
            setConversionProgress(progress);
          });

          // Download
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stoicbot-${content.id}.mp4`;
          a.click();
          URL.revokeObjectURL(url);

          setIsConverting(false);
          setConversionProgress(null);
          playSequence();
        } catch (error) {
          console.error('MP4 conversion failed:', error);
          setIsConverting(false);
          setConversionProgress(null);
          alert('Failed to convert to MP4. Try WebM download instead.');
        }
      };

      recorder.start();
      playSequence(true);
    } catch (e) {
      console.error("MP4 Recording error", e);
      setIsRendering(false);
      setIsConverting(false);
      alert("MP4 recording not supported in this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      {/* Canvas Container */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border border-stone-800" style={{ width: 340, height: 604 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain bg-black"
        />

        {/* Overlay Controls */}
        {!isRendering && (
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-black/0 hover:bg-black/20 transition-all group">
            <div className="flex justify-end">
              <button onClick={toggleMute} className="p-2 bg-black/40 backdrop-blur rounded-full text-white/80 hover:text-white">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            {!isPlaying && hasEnded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 p-4 rounded-full backdrop-blur pointer-events-auto cursor-pointer hover:scale-110 transition" onClick={togglePlayback}>
                  <RefreshCw size={32} className="text-white" />
                </div>
              </div>
            )}

            {!isPlaying && !hasEnded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 p-6 rounded-full backdrop-blur pointer-events-auto cursor-pointer hover:scale-110 transition" onClick={togglePlayback}>
                  <Play size={40} className="text-white ml-1" />
                </div>
              </div>
            )}
          </div>
        )}

        {isRendering && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-serif text-lg">Rendering Video...</p>
            <p className="text-xs text-stone-400 mt-2">Please wait while we record pixel-perfect quality.</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={handleDownloadVideo}
            disabled={isRendering || isConverting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 hover:bg-white text-stone-900 rounded-full font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {isRendering && !isConverting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span>WebM</span>
          </button>

          <button
            onClick={handleDownloadMP4}
            disabled={isRendering || isConverting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {isConverting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span>MP4</span>
          </button>
        </div>

        {/* Conversion Progress */}
        {conversionProgress && (
          <div className="bg-stone-900 rounded-lg p-3 border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-stone-400">{conversionProgress.stage}</span>
              <span className="text-xs font-bold text-purple-400">{conversionProgress.progress}%</span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300"
                style={{ width: `${conversionProgress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500 max-w-md text-center">
        *WebM: Mejor calidad, compatible con redes sociales. MP4: Conversión automática para máxima compatibilidad.
      </p>

      {/* Social Share Buttons */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t border-stone-800/50">
        <h3 className="text-xs font-bold text-stone-400 flex items-center gap-2">
          <Share2 size={14} />
          Compartir
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => shareToTwitter({
              text: generateShareText(content.quote.text, content.quote.category)
            })}
            className="px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white text-xs font-bold rounded-full transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
            </svg>
            Twitter
          </button>

          <button
            onClick={() => shareToFacebook({ text: content.quote.text })}
            className="px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-full transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
            </svg>
            Facebook
          </button>

          <button
            onClick={() => shareToWhatsApp({
              text: generateShareText(content.quote.text, content.quote.category)
            })}
            className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-full transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
            </svg>
            WhatsApp
          </button>

          <button
            onClick={() => shareToTikTok(generateShareText(content.quote.text, content.quote.category))}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-full transition border border-stone-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"></path>
            </svg>
            TikTok
          </button>
        </div>
        <p className="text-xs text-stone-600 text-center max-w-xs">
          Comparte tu video en redes sociales. TikTok: descarga primero y caption se copia automáticamente.
        </p>

        {/* Copy Shareable Link */}
        <button
          onClick={async () => {
            const link = generateShareLink(content);
            const success = await copyShareLink(link);
            if (success) {
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 3000);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-full transition border border-stone-700"
        >
          <Link size={14} />
          {linkCopied ? '✓ Link Copiado!' : 'Copiar Link Compartible'}
        </button>
        {linkCopied && (
          <p className="text-xs text-green-400">Link copiado! Compártelo para recrear esta configuración.</p>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;