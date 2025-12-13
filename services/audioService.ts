/**
 * Advanced Cinematic Ambient Generator (Stoic Edition)
 * Creates a "Hans Zimmer" style emotional pad using Web Audio API.
 * 
 * Features:
 * - Super-Saw Synthesis: Stacks detuned sawtooth waves for a lush, wide sound.
 * - Reese Bass: Deep, phasing low-end for gravitas.
 * - Auto-Swell: Low Pass Filters breathe (open/close) slowly to create movement.
 * - Massive Reverb: 5-second decay for "cosmic" atmosphere.
 */

// Helper to create a synthetic impulse response (The "Room" sound)
const createReverbBuffer = (ctx: AudioContext, duration: number = 5, decay: number = 3): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    // Exponential decay noise with slight stereo spread
    const noiseL = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    const noiseR = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    left[i] = noiseL;
    right[i] = noiseR;
  }
  return impulse;
};

export class AmbientDrone {
  private ctx: AudioContext;
  private nodes: AudioNode[] = [];
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private reverbNode: ConvolverNode | null = null;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
  }

  setupEffectsChain() {
    // Master Output Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Multi-band Compressor (Glue)
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Massive Reverb (Space)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = createReverbBuffer(this.ctx);

    // Chain: Master -> Compressor -> [Dry + Wet] -> Destination
    this.masterGain.connect(compressor);

    // Dry signal (direct)
    compressor.connect(this.ctx.destination);

    // Wet signal (reverb)
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.55; // High wet mix for atmosphere
    compressor.connect(this.reverbNode);
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(this.ctx.destination);

    this.nodes.push(this.masterGain, compressor, this.reverbNode, reverbGain);
  }

  // Creates a lush "Super Saw" voice (multiple detuned oscillators per note)
  createCinematicLayer(freq: number, pan: number = 0, vol: number = 0.1, attack: number = 2) {
    if (!this.masterGain) return;

    // We stack 3 oscillators per voice for width
    const detunes = [0, -8, 8]; // Cents
    const oscs: OscillatorNode[] = [];
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0; // Start silent for fade-in

    // Filter that moves (The "Swell")
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.value = 200; // Start dark

    // LFO to modulate filter (Breathing effect)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05 + (Math.random() * 0.02); // Very slow cycle (20s)
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 600; // Filter opens up by 600Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Panner
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;

    // Create the stack
    detunes.forEach(detune => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth'; // Sawtooth provides the "grit" and harmonics
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start();
      oscs.push(osc);
      this.nodes.push(osc);
    });

    lfo.start();

    // Connections
    filter.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Envelope (Fade In)
    const now = this.ctx.currentTime;
    gainNode.gain.linearRampToValueAtTime(vol, now + attack);

    this.nodes.push(filter, lfo, lfoGain, panner, gainNode);
  }

  // Deep pulsing bass
  createReeseBass(freq: number) {
    if (!this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.value = freq;
    osc2.frequency.value = freq;

    // Detune heavily creates the "wobble"
    osc1.detune.value = -15;
    osc2.detune.value = 15;

    filter.type = 'lowpass';
    filter.frequency.value = 140; // Sub only
    filter.Q.value = 2;

    gain.gain.value = 0;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 4); // Slow rise

    this.nodes.push(osc1, osc2, gain, filter);
  }

  start(mode: 'STOIC' | 'CHRISTIAN' = 'STOIC') {
    if (this.isPlaying) return;

    this.setupEffectsChain();

    if (mode === 'STOIC') {
      // CHORD: C Minor Add 9 (Dark/Epic/Spartan)
      // 1. THE FOUNDATION (Reese Bass)
      this.createReeseBass(32.70); // C1 (Deep Sub)
      this.createReeseBass(65.41); // C2

      // 2. THE BODY (Warm Pads)
      this.createCinematicLayer(130.81, -0.3, 0.08, 3); // C3
      this.createCinematicLayer(155.56, -0.1, 0.07, 4); // Eb3 (Emotional Minor 3rd)
      this.createCinematicLayer(196.00, 0.1, 0.07, 3.5); // G3

      // 3. THE ETHEREAL (Wide & High)
      this.createCinematicLayer(233.08, 0.5, 0.04, 6); // Bb3 (Mystery)
      this.createCinematicLayer(293.66, -0.5, 0.04, 7); // D4 (Hope/9th)
    } else {
      // CHORD: D Major 9 (Bright/Hopeful/Divine) (D - F# - A - C# - E)
      // 1. THE FOUNDATION (Reese Bass) - Brighter bass
      this.createReeseBass(36.71); // D1
      this.createReeseBass(73.42); // D2

      // 2. THE BODY (Warm Pads)
      this.createCinematicLayer(146.83, -0.3, 0.08, 3); // D3
      this.createCinematicLayer(185.00, -0.1, 0.06, 4); // F#3 (Major 3rd - Hope)
      this.createCinematicLayer(220.00, 0.1, 0.06, 3.5); // A3

      // 3. THE ETHEREAL (Wide & High & Angelic)
      this.createCinematicLayer(277.18, 0.5, 0.05, 6); // C#4 (Major 7th - Divine)
      this.createCinematicLayer(329.63, -0.5, 0.05, 7); // E4 (9th)
    }

    // Master Fade In
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 3);
    }

    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.masterGain) return;

    // Smooth Cinematic Fade Out
    const fadeOutTime = 3;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOutTime);

    setTimeout(() => {
      this.nodes.forEach(node => {
        try {
          if (node instanceof OscillatorNode) node.stop();
          node.disconnect();
        } catch (e) { }
      });
      this.nodes = [];
      this.masterGain = null;
      this.reverbNode = null;
      this.isPlaying = false;
    }, fadeOutTime * 1000 + 200);
  }
}

/**
 * Helper to decode Base64 audio data into an AudioBuffer
 */
export const decodeAudioData = async (base64Data: string, ctx: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await ctx.decodeAudioData(bytes.buffer);
};