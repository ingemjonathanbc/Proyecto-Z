import { ViralQuote } from '../types';
// @ts-ignore
import bibleData from '../src/data/bible.json'; // Direct local source
// @ts-ignore
import verifiedData from '../src/data/verified_content.json'; // Verified internet searches
import { getVerifiedWikiQuote } from './wikipediaService';

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

    // Remove the header artifacts
    clean = clean.replace(/(?:^\*|\(\d+\)\*).*?(?=\s+1\s|\s+Salmo)/i, '');

    // Existing cleaning
    clean = clean.replace(/\|/g, ''); // Remove bars
    clean = clean.replace(/\d+\s+/g, ''); // Remove verse numbers "1 ", "2 "

    // Remove Pause Markers
    clean = clean.replace(/\(Pausa\)/gi, '');
    clean = clean.replace(/\(Selah\)/gi, '');
    clean = clean.replace(/\(Interludio\)/gi, '');

    // Remove excess newlines/spaces
    clean = clean.replace(/\s+/g, ' ').trim();

    // Remove cross-references at the end
    const footnotePattern = /\s\d+:\s[A-Z][a-z]/;
    const footnoteMatch = clean.match(footnotePattern);
    if (footnoteMatch && footnoteMatch.index && footnoteMatch.index > 50) {
        clean = clean.substring(0, footnoteMatch.index);
    }

    return {
        text: clean.trim(),
        title: title || undefined
    };
};

export const generateFreeAiQuote = async (topic: string): Promise<ViralQuote> => {
    // 1. Construct the Prompt (URL Encoded)
    // Normalize accents: 'Oración' -> 'Oracion'
    const normalizedTopic = topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    // Detect dedicated Prayer intent (Creative/Devotional)
    const isPrayer = ['ORACION', 'REZO', 'SAN', 'VIRGEN', 'MIGUEL', 'ARCANGEL', 'GUADALUPE', 'BENITO', 'JUDAS'].some(k => normalizedTopic.includes(k));

    // Exact Scripture detection (Strict/Biblical)
    const isPsalm = normalizedTopic.includes('SALMO');

    // Broader Christian detection
    const isChristian = isPrayer || isPsalm || ['CHRISTIAN', 'GOD', 'JESUS', 'FE', 'BIBLI', 'VERSICULO', 'DIOS', 'CRISTO', 'ESPIRITU', 'PROVERBIO', 'IGLESIA', 'AMEN', 'CIELO', 'ANGEL', 'TESTAMENTO'].some(k => normalizedTopic.includes(k));

    // --- VERIFIED CONTENT CHECK (INTERNET SEARCH RESULT) ---
    // Check if we have a verified prayer in our database
    const prayers = (verifiedData as any).prayers;
    if (prayers) {
        // Simple keyword matching against keys
        // Keys: "JUAN PABLO II FAMILIA", "SAN MIGUEL ARCANGEL", etc.
        const foundKey = Object.keys(prayers).find(key => {
            const keyParts = key.split(' ');
            // Check if Topic contains MOST of the key parts? 
            // Or if key contains the Topic?
            // Topic: "Oracion Juan Pablo II" -> Key: "JUAN PABLO II FAMILIA"
            // Let's check if the Key includes significant parts of the Topic OR vice versa.

            // Better: Check if Topic includes the main identifier
            if (key.includes('JUAN PABLO') && normalizedTopic.includes('JUAN PABLO')) return true;
            if (key.includes('MIGUEL') && normalizedTopic.includes('MIGUEL')) return true;
            if (key.includes('JUDAS') && normalizedTopic.includes('JUDAS')) return true;
            if (key.includes('BENITO') && normalizedTopic.includes('BENITO')) return true;
            if (key.includes('GUADALUPE') && normalizedTopic.includes('GUADALUPE')) return true;
            if (key.includes('PADRE') && key.includes('NUESTRO') && normalizedTopic.includes('PADRE')) return true;
            if (key.includes('AVE') && key.includes('MARIA') && normalizedTopic.includes('AVE')) return true;
            if (key.includes('CREDO') && normalizedTopic.includes('CREDO')) return true;
            if (key.includes('SALVE') && normalizedTopic.includes('SALVE')) return true;
            if (key.includes('GLORIA') && normalizedTopic.includes('GLORIA')) return true;
            if (key.includes('ANGEL') && normalizedTopic.includes('ANGEL')) return true;
            if (key.includes('CONFIESO') && normalizedTopic.includes('CONFIESO')) return true;
            if (key.includes('CONTRICION') && normalizedTopic.includes('CONTRICION')) return true;
            return false;
        });

        if (foundKey) {
            console.log(`✅ FOUND VERIFIED CONTENT: ${foundKey}`);
            const entry = prayers[foundKey];

            // Gender/Iconography Correction
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
                // Contextual theme: "Saint Juan Pablo II religious icon..."
                theme: `${baseTheme}, catholic devotion, cinematic lighting, sacred atmosphere`,
                category: 'CHRISTIAN'
            };
        }
    }

    // --- ZERO HALLUCINATION CHECK (LOCAL BIBLE) ---
    if (isPsalm) {
        // Extract number: "Salmo 23" -> "23"
        const match = normalizedTopic.match(/SALMO\s*(\d+)/);
        if (match) {
            const psalmNum = match[1];
            // Access typed dictionary
            const psalms = (bibleData as any).psalms;
            const exactText = psalms[psalmNum];

            if (exactText) {
                console.log(`✅ FOUND LOCAL PSALM: ${psalmNum}`);
                const { text: cleanedText, title } = cleanPsalmText(exactText);

                // If text is extremely long (e.g. Psalm 119), we NOW allow it fully.
                // User explicitly requested "libera esto", "que dure lo que tenga que durar".
                // We rely on the layout engine (Teleprompter) to handle it.

                return {
                    text: cleanedText,
                    title: title, // Pass title separately
                    author: `Salmos ${psalmNum}`,
                    theme: "biblical parchment, rays of god light, clouds",
                    category: 'CHRISTIAN'
                };
            }
        }
    }
    // ----------------------------------------------

    // ----------------------------------------------

    // --- DYNAMIC INTERNET SEARCH (WIKIQUOTE) ---
    // If not found in local verified DB, try real-time search
    // Only for specific intents or generically? Let's try for everything that isn't simple AI chatter.
    const wikiQuote = await getVerifiedWikiQuote(topic);
    if (wikiQuote) {
        return {
            text: wikiQuote.text,
            author: wikiQuote.author,
            // Contextual theme: "Portrait of Marco Aurelio..."
            theme: `Portrait of ${wikiQuote.author}, historical setting, cinematic lighting, realistic, 8k resolution`,
            category: isChristian ? 'CHRISTIAN' : 'STOIC'
        };
    }
    // -------------------------------------------



    let systemPrompt = "";

    if (isPsalm) {
        // Fallback if local not found
        systemPrompt = `Rol: Eres una Biblia digital (Reina Valera 1960).
           Objetivo: Cita textualmente el "${topic}".
           Estilo: Bíblico exacto.
           Restricción: NO INVENTES NADA. COPIA EL TEXTO SAGRADO ORIGINAL. Máximo 60 palabras. Si es largo, resume respetando el versículo clave.`;
    } else if (isPrayer) {
        systemPrompt = `Rol: Eres un devoto de fe profunda.
           Objetivo: Escribe la ORACIÓN COMPLETA Y PODEROSA a: "${topic}".
           Estilo: Solemne, litúrgico y conmovedor. IDIOMA: SIEMPRE EN ESPAÑOL.
           Restricción: DEBE SER LA ORACIÓN REAL Y COMPLETA. (Ej: 'San Miguel Arcángel, defiéndenos en la batalla...'). Extensión ideal: 40-60 palabras.`;
    } else if (isChristian) {
        systemPrompt = `Rol: Eres un bibliotecario teológico experto.
           Objetivo: Busca una CITA REAL y BÍBLICA (Reina Valera 1960) o de un autor cristiano famoso (C.S. Lewis, Spurgeon) sobre: "${topic}".
           Estilo: Solemne y verdadero. IDIOMA: SIEMPRE EN ESPAÑOL.
           Restricción: DEBE SER UNA CITA REAL. NO LA INVENTES. Máximo 25 palabras.`;
    } else {
        systemPrompt = `Rol: Eres un historiador estoico hispanohablante.
           Objetivo: Busca una CITA REAL (Marco Aurelio, Séneca, Epicteto) sobre: "${topic}".
           IDIOMA OBLIGATORIO: ESPAÑOL (SPANISH). SI LA CITA ES EN LATÍN O INGLÉS, TRADÚCELA.
           Restricción: DEBE SER UNA CITA REAL CON AUTOR REAL. Máximo 15 palabras.`;
    }

    const formatInstruction = `
    IMPORTANTE: Responde SOLO con JSON raw. Nada de markdown.
    Estructura obligatoria:
    {
      "text": "${isPrayer ? 'Texto completo de la oración (usa puntuación para pausas)' : 'Texto exacto en ESPAÑOL'}",
      "author": "Nombre EXACTO del Autor, Libro o Santo (ej: 'Salmo 91', 'Mateo 5:9', 'San Agustín', 'Marco Aurelio')",
      "theme": "prompt visual en inglés para el fondo (ej: 'ancient rome marble statue, dramatic lighting')",
      "category": "${isChristian ? 'CHRISTIAN' : 'STOIC'}"
    }`;

    const fullPrompt = `${systemPrompt} ${formatInstruction}`;
    const seed = Math.floor(Math.random() * 1000000); // Prevent caching
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?seed=${seed}&model=openai`; // Force randomness

    console.log("🤖 Asking Free AI:", url);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Pollinations API Error');

        const text = await response.text();
        console.log("🤖 Raw AI Response:", text);

        const json = JSON.parse(cleanJSON(text));

        // CORRECTION: Force category based on our detection, not just the AI's guess.
        // If we detected Christian topic, it MUST be Christian logic.
        if (isChristian) {
            json.category = 'CHRISTIAN';
        } else if (!json.category || (json.category !== 'STOIC' && json.category !== 'CHRISTIAN')) {
            json.category = 'STOIC';
        }

        return {
            text: json.text || `La disciplina es el puente entre metas y logros.`,
            author: json.author || "StoicBot AI",
            theme: json.theme || "dark minimal abstract background",
            category: json.category
        };

    } catch (error) {
        console.error("❌ Free AI Generation Failed:", error);
        throw error; // Let App.tsx handle fallback to QuoteBank
    }
};
