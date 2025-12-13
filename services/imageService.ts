/**
 * Generador de Fondos Procedurales Mejorado (100% Local, Sin APIs)
 * Crea gradientes cinemáticos contextuales basados en el theme completo
 */

interface GradientConfig {
  colors: string[];
  angle: number;
}

const themeToGradient = (theme: string): GradientConfig => {
  const themeLower = theme.toLowerCase();

  // CRISTIANAS - Paletas luminosas y esperanzadoras
  if (themeLower.includes('light') || themeLower.includes('ray') || themeLower.includes('divine') || themeLower.includes('heaven') || themeLower.includes('glow')) {
    return { colors: ['#fef5e7', '#f9e79f', '#f8c471', '#f39c12'], angle: 135 };
  }
  if (themeLower.includes('cross') || themeLower.includes('church') || themeLower.includes('pray') || themeLower.includes('hands')) {
    return { colors: ['#d4af37', '#f4e4c1', '#ffffff', '#e8dab2'], angle: 90 }; // Dorado/blanco
  }
  if (themeLower.includes('dove') || themeLower.includes('peace') || themeLower.includes('calm')) {
    return { colors: ['#a8dadc', '#f1faee', '#e0f7fa', '#b0d4e3'], angle: 180 }; // Celeste suave
  }
  if (themeLower.includes('mountain') || themeLower.includes('rock') || themeLower.includes('stone')) {
    return { colors: ['#78909c', '#90a4ae', '#b0bec5', '#cfd8dc'], angle: 180 }; // Grises montaña
  }
  if (themeLower.includes('crown') || themeLower.includes('throne') || themeLower.includes('king')) {
    return { colors: ['#4a148c', '#6a1b9a', '#8e24aa', '#ab47bc'], angle: 45 }; // Púrpura real
  }
  if (themeLower.includes('shepherd') || themeLower.includes('lamb') || themeLower.includes('val')) {
    return { colors: ['#558b2f', '#689f38', '#7cb342', '#8bc34a'], angle: 120 }; // Verde pastoral
  }
  if (themeLower.includes('anchor') || themeLower.includes('ocean') || themeLower.includes('sea') || themeLower.includes('water')) {
    return { colors: ['#003049', '#0466c8', '#0353a4', '#002855'], angle: 90 }; // Azul profundo
  }
  if (themeLower.includes('path') || themeLower.includes('door') || themeLower.includes('gate')) {
    return { colors: ['#8b4513', '#a0522d', '#cd853f', '#daa520'], angle: 0 }; // Madera/tierra  
  }
  if (themeLower.includes('garden') || themeLower.includes('bloom') || themeLower.includes('flower')) {
    return { colors: ['#2e7d32', '#66bb6a', '#81c784', '#a5d6a7'], angle: 135 }; // Verde vida
  }
  if (themeLower.includes('sun') || themeLower.includes('sunrise') || themeLower.includes('dawn') || themeLower.includes('sunset')) {
    return { colors: ['#ff6f00', '#ff8f00', '#ffa726', '#ffb74d'], angle: 0 }; // Naranja cálido
  }

  // ESTOICAS - Paletas oscuras y dramáticas
  if (themeLower.includes('dark') || themeLower.includes('night') || themeLower.includes('shadow') || themeLower.includes('void')) {
    return { colors: ['#0a0a0a', '#1a1a1a', '#2a2a2a', '#1c1917'], angle: 180 };
  }
  if (themeLower.includes('fire') || themeLower.includes('flame') || themeLower.includes('phoenix') || themeLower.includes('burn')) {
    return { colors: ['#7f1d1d', '#b91c1c', '#dc2626', '#f97316'], angle: 45 }; // Rojo fuego
  }
  if (themeLower.includes('storm') || themeLower.includes('thunder') || themeLower.includes('lightning') || themeLower.includes('tempest')) {
    return { colors: ['#1e293b', '#334155', '#475569', '#64748b'], angle: 135 }; // Gris tormenta
  }
  if (themeLower.includes('warrior') || themeLower.includes('battle') || themeLower.includes('soldier') || themeLower.includes('fight')) {
    return { colors: ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c'], angle: 90 }; // Rojo sangre
  }
  if (themeLower.includes('statue') || themeLower.includes('marble') || themeLower.includes('greek') || themeLower.includes('roman')) {
    return { colors: ['#e8e8e8', '#d4d4d4', '#a3a3a3', '#737373'], angle: 180 }; // Mármol
  }
  if (themeLower.includes('gym') || themeLower.includes('iron') || themeLower.includes('steel') || themeLower.includes('metal')) {
    return { colors: ['#18181b', '#27272a', '#3f3f46', '#52525b'], angle: 90 }; // Hierro oscuro
  }
  if (themeLower.includes('desert') || themeLower.includes('sand') || themeLower.includes('dune')) {
    return { colors: ['#92400e', '#b45309', '#d97706', '#f59e0b'], angle: 0 }; // Arena
  }
  if (themeLower.includes('cliff') || themeLower.includes('edge') || themeLower.includes('peak')) {
    return { colors: ['#374151', '#4b5563', '#6b7280', '#9ca3af'], angle: 180 }; // Piedra gris
  }
  if (themeLower.includes('forest') || themeLower.includes('tree') || themeLower.includes('wood')) {
    return { colors: ['#14532d', '#166534', '#15803d', '#16a34a'], angle: 120 }; // Verde oscuro bosque
  }
  if (themeLower.includes('zen') || themeLower.includes('meditation') || themeLower.includes('calm')) {
    return { colors: ['#0c4a6e', '#075985', '#0369a1', '#0284c7'], angle: 135 }; // Azul zen
  }
  if (themeLower.includes('chess') || themeLower.includes('strategy') || themeLower.includes('mind')) {
    return { colors: ['#000000', '#171717', '#262626', '#404040'], angle: 90 }; // Negro/blanco ajedrez
  }
  if (themeLower.includes('forge') || themeLower.includes('anvil') || themeLower.includes('hammer')) {
    return { colors: ['#dc2626', '#ea580c', '#f59e0b', '#facc15'], angle: 45 }; // Fuego forja
  }

  // Default: Oscuro cinemático
  return { colors: ['#0f172a', '#1e293b', '#334155', '#475569'], angle: 135 };
};

const generateGradientDataURL = (config: GradientConfig): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext('2d')!;

  // Convertir ángulo a radianes
  const angleRad = (config.angle * Math.PI) / 180;
  const x0 = 540 - Math.cos(angleRad) * 960;
  const y0 = 960 - Math.sin(angleRad) * 960;
  const x1 = 540 + Math.cos(angleRad) * 960;
  const y1 = 960 + Math.sin(angleRad) * 960;

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

  // Distribuir colores
  config.colors.forEach((color, i) => {
    gradient.addColorStop(i / (config.colors.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // Añadir textura de ruido suave para profundidad
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 1080;
    const y = Math.random() * 1920;
    ctx.fillRect(x, y, 1, 1);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Genera un fondo procedural (Fallback si falla la IA)
 */
export const generateProceduralFallback = async (theme: string): Promise<string> => {
  console.log("🎨 Generando fondo procedural (fallback):", theme);
  const config = themeToGradient(theme);
  return generateGradientDataURL(config);
};

/**
 * Genera una IMAGEN REAL usando Pollinations AI (Stable Diffusion)
 * @param theme - Base theme for the image
 * @param iconographyDesc - Optional iconography description from Gemini
 */
export const generateCinematicImage = async (theme: string, iconographyDesc?: string | null): Promise<string> => {
  // 1. Prompt Engineering para Estilo Viral
  // Fix: Allow Spanish accents in regex (ÁÉÍÓÚñ...)
  const cleanTheme = theme.replace(/Evangelio del Día.*$/gi, 'Biblical Scene')
    .replace(/[^\w\s\u00C0-\u00FF,\.-]/gi, '') // Keep accents, commas, dots
    .substring(0, 150); // Increased context

  // Expanded keywords (English + Spanish)
  const isChristian = ['heaven', 'god', 'church', 'cross', 'light', 'jesus', 'bible', 'angel', 'cielo', 'dios', 'iglesia', 'cruz', 'luz', 'jesús', 'biblia', 'ángel', 'cristo', 'señor', 'espíritu', 'santo', 'santa', 'virgen', 'maría', 'josé', 'apóstol', 'profeta'].some(k => theme.toLowerCase().includes(k));

  let enhancedPrompt = "";
  const seed = Math.floor(Math.random() * 1000000);

  // If we have iconography description, use it (Truncated but preserving detail)
  if (iconographyDesc) {
    const desc = iconographyDesc.substring(0, 450).replace(/[^\w\s\u00C0-\u00FF,\.-]/gi, '');
    console.log("🎨 Using iconography description for prompt");

    if (isChristian) {
      enhancedPrompt = `hyperrealistic cinematic portrait, ${desc}, divine light rays, heaven atmosphere, renaissance oil painting style, 8k resolution, highly detailed, golden hour lighting, traditional catholic art, --no text --no watermark --no modern clothing`;
    } else {
      enhancedPrompt = `dark moody cinematic shot, ${desc}, ancient aesthetic, dramatic chiaroscuro lighting, 8k, sharp focus, stoic atmosphere, --no text --no watermark`;
    }
  } else {
    // FALLBACK LOGIC (Offline / Quota Exceeded)
    console.log("⚠️ Using Offline Smart Fallback for Image");

    // 1. Extract known figures manually (since Gemini failed)
    const t = theme.toLowerCase();
    let subject = "biblical figure";
    let extraDetails = "";

    // Mapping Common Figures (Spanish -> English Prompt)
    if (t.includes('jesús') || t.includes('jesus')) { subject = "Jesus Christ"; extraDetails = "healing, teaching, sacred heart, divine"; }
    else if (t.includes('maría') || t.includes('maria') || t.includes('virgen')) { subject = "Virgin Mary"; extraDetails = "blue robes, holy mother, immaculate conception"; }
    else if (t.includes('josé') || t.includes('jose')) { subject = "Saint Joseph"; extraDetails = "carpenter, holy father, lily"; }
    else if (t.includes('miguel')) { subject = "Archangel Michael"; extraDetails = "armor, sword, wings, warrior angel"; }
    else if (t.includes('gabriel')) { subject = "Archangel Gabriel"; extraDetails = "messenger, lily, annunciation"; }
    else if (t.includes('pedro')) { subject = "Saint Peter"; extraDetails = "keys of heaven, fisherman, beard"; }
    else if (t.includes('pablo')) { subject = "Saint Paul"; extraDetails = "holding sword, scroll, ancient rome background"; }
    else if (t.includes('juan')) { subject = "Saint John"; extraDetails = "eagle, book, young apostle"; }
    else if (t.includes('mateo')) { subject = "Saint Matthew"; extraDetails = "angel writing, book, tax collector"; }
    else if (t.includes('bautista')) { subject = "John the Baptist"; extraDetails = "jordan river, wilderness, camel skin"; }
    else if (t.includes('espíritu') || t.includes('espiritu')) { subject = "Holy Spirit"; extraDetails = "white dove, flames, rays of light"; }
    else if (t.includes('ángel') || t.includes('angel')) { subject = "Holy Angel"; extraDetails = "huge white wings, divine light, seraphim"; }

    if (isChristian) {
      enhancedPrompt = `hyperrealistic cinematic portrait of ${subject}, ${extraDetails}, ${cleanTheme}, divine light rays, heaven gates atmosphere, renaissance oil painting style, 8k resolution, highly detailed, golden hour lighting, grandeur, epic scale, --no text --no watermark --no modern clothing`;
    } else {
      enhancedPrompt = `dark moody cinematic shot of ${cleanTheme}, ancient greek aesthetic, dramatic chiaroscuro lighting, unreal engine 5 render, 8k, sharp focus, mist and fog, stoic atmosphere, monochrome color grading, --no text --no watermark`;
    }
  }

  // 2. Pollinations URL (No key required)
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  // Use 'turbo' model for speed/reliability. 'flux' caused 502s.
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true&seed=${seed}&model=turbo`;

  console.log("🤖 Asking Pollinations AI Image:", imageUrl);

  // 3. Return URL directly (Browser will load it)
  // We could pre-fetch here to ensure it works, but for speed we return the URL.
  // However, knowing Pollinations, sometimes it takes a few seconds. VideoPlayer handles loading.

  return imageUrl;
};
