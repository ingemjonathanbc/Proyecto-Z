/**
 * Reference Image Service (Gemini-Only)
 * Uses Gemini's knowledge to describe traditional iconography
 * More accurate and faster than external image searches
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedEntity {
    primaryEntity: string | null;
    entities: string[];
    category: 'saint' | 'biblical' | 'symbol' | 'none';
}

/**
 * Extract entities (saints, biblical figures) from text using Gemini
 */
export const extractEntities = async (text: string): Promise<ExtractedEntity> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);
        if (!apiKey) {
            console.warn("⚠️ No Gemini API key for entity extraction, skipping");
            return { primaryEntity: null, entities: [], category: 'none' };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Analyze this religious/spiritual text and identify the PRIMARY visual entity to depict in an image:

"${text}"

PRIORITY RULES (apply in order):
1. **SAINTS FIRST**: If the text is a prayer TO or ABOUT a saint (e.g., "Glorioso San Benito"), the saint IS the primary entity, even if other symbols (cruz, etc.) are mentioned in the prayer.
2. **Biblical figures**: If no saint, look for biblical figures (Jesús, David, Virgen María, etc.)
3. **Symbols**: Only if NO person is identified, use religious symbols (Cruz, Paloma, etc.)

Examples:
- "Glorioso San Benito... la Santa Cruz..." → PRIMARY: "San Benito" (NOT "La Santa Cruz")
- "Santa María de Guadalupe... intercede..." → PRIMARY: "Virgen de Guadalupe" (NOT generic "Virgen María")
- "San Miguel Arcángel combate..." → PRIMARY: "San Miguel Arcángel"

Return ONLY valid JSON (no markdown):
{
  "primaryEntity": "Name in Spanish (or null if none)",
  "entities": ["Entity 1", "Entity 2"],
  "category": "saint|biblical|symbol|none"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Clean JSON formatting
        let cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace >= 0) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(cleaned);
        console.log("🔍 Extracted entities:", parsed);

        return {
            primaryEntity: parsed.primaryEntity || null,
            entities: parsed.entities || [],
            category: parsed.category || 'none'
        };

    } catch (error) {
        console.error("❌ Entity extraction failed:", error);
        return { primaryEntity: null, entities: [], category: 'none' };
    }
};

/**
 * Get traditional iconography description from Gemini
 * This is the core function - uses Gemini's knowledge directly
 */
export const getIconographyDescription = async (entityName: string, category: string): Promise<string | null> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);
        if (!apiKey) {
            console.warn("⚠️ No Gemini API key, skipping iconography");
            return null;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        if (category === 'saint') {
            prompt = `Describe the TRADITIONAL CATHOLIC ICONOGRAPHY of "${entityName}" as depicted in religious art.

CRITICAL: Identify what makes THIS saint UNIQUE and DIFFERENT from others.

For Marian advocations (Guadalupe, Lourdes, Fátima, etc.), describe the SPECIFIC appearance of THAT advocation, not generic Mary.

BE VERY SPECIFIC about visual details:
1. Vestments: EXACT colors and style (e.g., "pink dress with blue starry mantle" for Guadalupe, NOT just "blue robe")
2. Objects held: What they hold in each hand
3. Unique symbols: What makes THIS saint/advocation recognizable (e.g., "standing on crescent moon with sun rays" for Guadalupe)
4. Physical appearance: Skin tone, age, facial features specific to this representation
5. Artistic style: Traditional style for this particular saint

Focus ONLY on UNIQUE visual elements that distinguish this saint from all others.
Output in English for AI image prompts.`;
        } else if (category === 'biblical') {
            prompt = `Describe how "${entityName}" is TRADITIONALLY DEPICTED in biblical art and religious iconography.

Include specific visual details:
1. Clothing: Colors, style, traditional garments
2. Objects or symbols: What they're shown with
3. Key scene or pose: Most iconic representation
4. Artistic tradition: How they appear in Renaissance, Baroque, or Byzantine art

Be specific and visual. Output in English.`;
        } else {
            prompt = `Describe the traditional visual symbolism of "${entityName}" in Christian/Catholic art.

Focus on:
1. Visual form and appearance
2. Colors and materials
3. Context and setting
4. Artistic style

Be specific. Output in English.`;
        }

        console.log("🎨 Asking Gemini for iconography of:", entityName);
        const result = await model.generateContent(prompt);
        const description = result.response.text().trim();

        console.log("📝 Iconography description:", description.substring(0, 150) + "...");
        return description;

    } catch (error) {
        console.error("❌ Iconography description failed:", error);
        return null;
    }
};

/**
 * Main function: Extract entity and get its iconographic description
 */
export const findReferenceForText = async (text: string): Promise<string | null> => {
    try {
        console.log("🎨 Starting iconography analysis for:", text.substring(0, 100));

        // Step 1: Extract primary entity
        const entities = await extractEntities(text);

        if (!entities.primaryEntity || entities.category === 'none') {
            console.log("⚠️ No specific entity found, using standard generation");
            return null;
        }

        // Step 2: Get iconographic description from Gemini
        const description = await getIconographyDescription(entities.primaryEntity, entities.category);

        if (!description) {
            console.log("⚠️ No iconography description, using standard generation");
            return null;
        }

        console.log(`✅ Iconography ready for: ${entities.primaryEntity}`);
        return description;

    } catch (error) {
        console.error("❌ Reference search failed:", error);
        return null;
    }
};
