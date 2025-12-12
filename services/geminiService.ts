
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ViralQuote, GeneratedContent } from "../types";
import { generateCinematicImage } from "./imageService";

// Initialize API
const getGeminiModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta la API Key de Gemini (VITE_GEMINI_API_KEY)");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

/**
 * Clean raw text to ensure valid JSON
 */
const cleanJSON = (text: string): string => {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace >= 0) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// @ts-ignore
import bibleData from '../src/data/bible.json';
// @ts-ignore
import verifiedData from '../src/data/verified_content.json';

/**
 * Remove PDF artifacts from Bible text (Headers, verse numbers, footnotes)
 */
const cleanPsalmText = (text: string): { text: string; title?: string } => {
  let clean = text;
  let title = "";

  // Extract Title Logic: 
  // Matches "(23)* The Title 1" or "* The Title 1"
  const titleMatch = clean.match(/(?:^\*|\(\d+\)\*)\s*(.*?)(?=\s+1\s|\s+Salmo)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Remove the header artifacts we just parsed
  clean = clean.replace(/(?:^\*|\(\d+\)\*).*?(?=\s+1\s|\s+Salmo)/i, '');

  clean = clean.replace(/\|/g, '');
  clean = clean.replace(/\d+\s+/g, '');

  // Remove Pause Markers
  clean = clean.replace(/\(Pausa\)/gi, '');
  clean = clean.replace(/\(Selah\)/gi, '');
  clean = clean.replace(/\(Interludio\)/gi, '');

  // Remove excess newlines/spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return {
    text: clean.trim(),
    title: title || undefined
  };
};

export const generateGeminiQuote = async (topic: string): Promise<ViralQuote> => {
  try {
    // Check both standard Vite env and process.env (mapped in vite.config.ts)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);

    if (!apiKey) {
      console.error("❌ CRITICAL: Missing Gemini API Key. Checked VITE_GEMINI_API_KEY and GEMINI_API_KEY.");
      throw new Error("Falta la API Key de Gemini. Configura VITE_GEMINI_API_KEY en tu archivo .env");
    }

    // 1. Classification Logic (Aligned with Free Mode)
    const normalizedTopic = topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    // Detect dedicated Prayer intent
    const isPrayer = ['ORACION', 'REZO', 'SAN', 'VIRGEN', 'MIGUEL', 'ARCANGEL', 'GUADALUPE', 'BENITO', 'JUDAS', 'PADRE NUESTRO', 'AVE MARIA'].some(k => normalizedTopic.includes(k));

    // Exact Scripture detection
    const isPsalm = normalizedTopic.includes('SALMO');

    // Broader Christian detection
    const isChristian = isPrayer || isPsalm || ['CHRISTIAN', 'GOD', 'JESUS', 'FE', 'BIBLI', 'VERSICULO', 'DIOS', 'CRISTO', 'ESPIRITU', 'PROVERBIO', 'IGLESIA', 'AMEN', 'CIELO', 'ANGEL', 'TESTAMENTO'].some(k => normalizedTopic.includes(k));

    console.log(`🔍 [Gemini Classify] Topic: "${topic}" -> "${normalizedTopic}"`);
    console.log(`🔍 [Gemini Classify] Flags: Prayer=${isPrayer}, Psalm=${isPsalm}, Christian=${isChristian}`);

    // --- CHECK LOCAL VERIFIED CONTENT FIRST (Exact same logic as Free Mode) ---
    // Why? To guarantee 100% accuracy on known Saints/Prayers without wasting Token usage or risking hallucinations
    const prayers = (verifiedData as any).prayers;
    if (prayers) {
      const foundKey = Object.keys(prayers).find(key => {
        if (key.includes('JUAN PABLO') && normalizedTopic.includes('JUAN PABLO')) return true;
        if (key.includes('MIGUEL') && normalizedTopic.includes('MIGUEL')) return true;
        if (key.includes('JUDAS') && normalizedTopic.includes('JUDAS')) return true;
        if (key.includes('BENITO') && normalizedTopic.includes('BENITO')) return true;
        if (key.includes('GUADALUPE') && normalizedTopic.includes('GUADALUPE')) return true;
        if (key.includes('PADRE') && key.includes('NUESTRO') && normalizedTopic.includes('PADRE')) return true;
        if (key.includes('AVE') && key.includes('MARIA') && normalizedTopic.includes('AVE')) return true;
        if (key.includes('CREDO') && normalizedTopic.includes('CREDO')) return true;
        if (key.includes('SALVE') && normalizedTopic.includes('SALVE')) return true;
        if (key.includes('ANGEL') && normalizedTopic.includes('ANGEL')) return true;
        return false;
      });

      if (foundKey) {
        console.log(`✅ [Gemini Service] FOUND LOCAL VERIFIED CONTENT: ${foundKey}`);
        const entry = prayers[foundKey];

        // Gender/Iconography Correction (Aligned with Free Mode)
        let baseTheme = `Saint ${entry.author} religious icon portrait`;
        const upperKey = foundKey.toUpperCase();

        if (upperKey.includes('VIRGEN') || upperKey.includes('MARIA') || upperKey.includes('GUADALUPE') || upperKey.includes('AVE')) {
          baseTheme = `Virgin Mary sacred mother of god portrait, feminine holy figure`;
        } else if (upperKey.includes('RITA')) {
          baseTheme = `Saint Rita holy woman portrait`;
        }

        return {
          text: entry.text,
          author: entry.author,
          theme: `${baseTheme}, catholic devotion, cinematic lighting, sacred atmosphere`,
          category: 'CHRISTIAN'
        };
      }
    }

    // --- CHECK LOCAL BIBLE (PSALMS) ---
    if (isPsalm) {
      const match = normalizedTopic.match(/SALMO\s*(\d+)/);
      if (match) {
        const psalmNum = match[1];
        const psalms = (bibleData as any).psalms;
        const exactText = psalms[psalmNum];

        if (exactText) {
          console.log(`✅ [Gemini Service] FOUND LOCAL PSALM: ${psalmNum}`);
          const { text: cleanedText, title: cleanedTitle } = cleanPsalmText(exactText);
          return {
            text: cleanedText,
            title: cleanedTitle,
            author: `Salmos ${psalmNum}`,
            theme: "biblical parchment, rays of god light, clouds",
            category: 'CHRISTIAN'
          };
        }
      }
    }
    // ------------------------------------

    // Initialize with Tools (Grounding)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} } as any] // Enable Google Search Grounding (Cast to any to fix type error)
    });

    let systemPrompt = "";

    if (isPsalm) {
      systemPrompt = `Rol: Eres una Biblia digital (Reina Valera 1960).
           Objetivo: USA LA HERRAMIENTA DE BÚSQUEDA (Google Search) para encontrar y citar textualmente el "${topic}".
           Estilo: Bíblico exacto.
           Restricción: NO INVENTES NADA. COPIA EL TEXTO SAGRADO ORIGINAL EXACTO que encuentres en la búsqueda. Máximo 60 palabras.`;
    } else if (isPrayer) {
      systemPrompt = `Rol: Eres un devoto de fe profunda.
           Objetivo: USA LA HERRAMIENTA DE BÚSQUEDA para encontrar la ORACIÓN TRADICIONAL COMPLETA a: "${topic}".
           Estilo: Solemne, litúrgico y conmovedor. IDIOMA: SIEMPRE EN ESPAÑOL.
           Restricción: DEBE SER LA ORACIÓN REAL (Ej: 'San Miguel Arcángel, defiéndenos en la batalla...'). No inventes una nueva.`;
    } else if (isChristian) {
      systemPrompt = `Rol: Eres un bibliotecario teológico experto.
           Objetivo: USA LA HERRAMIENTA DE BÚSQUEDA para encontrar una CITA REAL y BÍBLICA (Reina Valera 1960) o de un autor cristiano famoso sobre: "${topic}".
           Estilo: Solemne y verdadero. IDIOMA: SIEMPRE EN ESPAÑOL.
           Restricción: DEBE SER UNA CITA REAL ENCONTRADA EN GOOGLE.`;
    } else {
      systemPrompt = `Rol: Eres un historiador estoico hispanohablante.
           Objetivo: USA LA HERRAMIENTA DE BÚSQUEDA para encontrar una CITA REAL (Marco Aurelio, Séneca, Epicteto) sobre: "${topic}".
           IDIOMA OBLIGATORIO: ESPAÑOL (SPANISH).
           Restricción: DEBE SER UNA CITA REAL CON AUTOR REAL.`;
    }

    const formatInstruction = `
    IMPORTANTE: Responde SOLO con un JSON válido compatible con RFC8259.
    Estructura obligatoria:
    {
      "text": "Texto exacto encontrado en la búsqueda",
      "author": "Fuente exacta encontrada (ej: 'Salmo 91:1-4', 'San Agustín')",
      "theme": "prompt visual en inglés para el fondo (ej: 'ancient rome marble statue, dramatic lighting')",
      "category": "${isChristian ? 'CHRISTIAN' : 'STOIC'}"
    }`;

    const fullPrompt = `${systemPrompt}\n\n${formatInstruction}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini Grounded Response:", text);
    // Log grounding metadata if available (for debugging)
    if (response.candidates?.[0]?.groundingMetadata) {
      console.log("🌍 Grounding Metadata Found:", response.candidates[0].groundingMetadata);
    }

    const json = JSON.parse(cleanJSON(text));

    // FORCE Category Consistency
    // The previous logic had a flaw: `json.category` from Gemini might be undefined or 'STOIC'.
    // We MUST override it if our local regex says it's Christian.
    let finalCategory = 'STOIC'; // Default base

    if (isChristian || isPrayer || isPsalm) {
      finalCategory = 'CHRISTIAN';
    } else if (json.category === 'CHRISTIAN') {
      finalCategory = 'CHRISTIAN';
    }

    console.log(`🤖 Final Category Decision: ${finalCategory} (Detected: ${isChristian}, Gemini: ${json.category})`);

    return {
      text: json.text,
      author: json.author,
      theme: json.theme,
      category: finalCategory as 'CHRISTIAN' | 'STOIC'
    };

  } catch (error) {
    console.error("❌ Gemini Text Error:", error);
    // Ensure we throw to trigger fallback in App.tsx if API fails
    throw new Error("Error conectando con Gemini AI.");
  }
};

/**
 * Uses Gemini to "Enhance" the prompt significantly before sending to the image generator.
 */
export const generateGeminiEnhancedImage = async (baseTheme: string): Promise<string> => {
  try {
    // Step 1: Use Gemini to expand the prompt
    const model = getGeminiModel();
    const enhancePrompt = `
            Act as a midjourney/flux expert. Convert this simple concept into a highly detailed English image prompt:
            Concept: "${baseTheme}"
            
            Rules:
            - Add cinematic lighting, 8k, unreal engine 5, raytracing.
            - Specific artistic style (Renaissance for Christian, Dark Marble for Stoic).
            - NO text, NO watermarks.
            - Output ONLY the raw prompt string.
        `;

    const result = await model.generateContent(enhancePrompt);
    const enhancedPrompt = result.response.text().trim();
    console.log("✨ Gemini Enhanced Prompt:", enhancedPrompt);

    // Step 2: Use the enhanced prompt with our image service
    return generateCinematicImage(enhancedPrompt);

  } catch (e) {
    console.warn("Gemini Prompt Enhance failed, using raw theme", e);
    return generateCinematicImage(baseTheme);
  }
};

/**
 * Generate an image using Nano Banana (Gemini 2.5 Flash Image).
 * Supports enhanced prompts with iconography descriptions for religious figures.
 */
export const generateNanoBananaImage = async (
  basePrompt: string,
  iconographyDesc?: string | null
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // Build enhanced prompt
    let finalPrompt = basePrompt;

    if (iconographyDesc) {
      // If we have specific iconography, include it
      finalPrompt = `${iconographyDesc}\n\nStyle: Cinematic, divine light, photorealistic, spiritual atmosphere, dramatic lighting, highly detailed`;
      console.log("🎨 Nano Banana with iconography:", iconographyDesc.substring(0, 100) + "...");
    } else {
      // Standard religious/stoic prompt
      finalPrompt = `${basePrompt}\n\nStyle: Cinematic, divine light, photorealistic, spiritual atmosphere, dramatic lighting, highly detailed`;
      console.log("🎨 Nano Banana standard:", basePrompt);
    }

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        console.log("✅ Nano Banana generated image");
        return `data:${mimeType};base64,${base64}`;
      }
    }

    throw new Error("No image data in Nano Banana response");

  } catch (e) {
    console.warn("⚠️ Nano Banana failed, using fallback:", e);
    // Fallback to Pollinations
    return generateGeminiEnhancedImage(basePrompt);
  }
};