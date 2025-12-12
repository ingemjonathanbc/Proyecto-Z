/**
 * Service to fetch the "Palabra del Día" from BibleOn
 */

const BIBLIAON_URL = 'https://www.bibliaon.com/es/palabra_del_dia/';

export interface DailyWord {
    title: string;
    verse: string;
    verseReference: string;
    reflection: string;
}

/**
 * Fetches and parses the daily word from bibliaon.com
 */
export const fetchDailyWord = async (): Promise<DailyWord> => {
    try {
        console.log('📖 Fetching daily word from bibliaon.com...');

        // Use corsproxy.io - more reliable than allorigins
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(BIBLIAON_URL)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();


        console.log('✅ HTML fetched successfully');

        // Parse the HTML to extract the daily word content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // The page has multiple H2s. We want the SECOND one (first is page title, second is daily word title)
        const allH2s = doc.querySelectorAll('h2');
        let title = 'Palabra del Día';

        if (allH2s.length >= 2) {
            title = allH2s[1].textContent?.trim() || title;
        }

        console.log('📌 Title:', title);

        // Find the main content article/section
        // Look for paragraphs that contain verse references (parentheses with book names)
        const paragraphs = doc.querySelectorAll('p');
        let verse = '';
        let verseReference = '';
        let reflection = '';

        // Find the first paragraph with a biblical reference pattern
        let verseFound = false;
        let startIndex = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const text = paragraphs[i].textContent || '';

            // Skip very short paragraphs and navigation text
            if (text.length < 20 || text.includes('http') || text.includes('Únete')) {
                continue;
            }

            // Look for verse pattern: text ending with (Book chapter:verse)
            // More flexible pattern - allow multiline
            const verseMatch = text.match(/^(.+?)\s*\(([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+\d+:\d+(?:-\d+)?)\)/);

            if (verseMatch && !verseFound) {
                verse = verseMatch[1].trim();
                verseReference = verseMatch[2].trim();
                verseFound = true;
                startIndex = i + 1;
                console.log('📜 Full Verse:', verse);
                console.log('📍 Reference:', verseReference);
                break;
            }
        }

        // If no specific verse pattern found, use heuristic: skip first 2-3 paragraphs (usually nav/intro)
        if (!verseFound && paragraphs.length > 3) {
            const firstP = paragraphs[2].textContent || '';
            const generalMatch = firstP.match(/(.*?)\s*\((.*?)\)/);
            if (generalMatch) {
                verse = generalMatch[1].trim();
                verseReference = generalMatch[2].trim();
                startIndex = 3;
            } else {
                verse = firstP;
                startIndex = 3;
            }
        }

        // Get reflection (next 3-4 paragraphs after the verse)
        const reflectionParts: string[] = [];
        for (let i = startIndex; i < Math.min(paragraphs.length, startIndex + 4); i++) {
            const text = paragraphs[i].textContent?.trim();
            if (text && text.length > 20 && !text.includes('http') && !text.includes('Únete') && !text.includes('Lee también')) {
                reflectionParts.push(text);
            }
        }
        reflection = reflectionParts.join('\n\n');

        return {
            title,
            verse,
            verseReference,
            reflection: reflection || verse // Fallback
        };
    } catch (error) {
        console.error('❌ Error fetching daily word:', error);
        throw new Error('No se pudo obtener la Palabra del Día. Verifica tu conexión a internet.');
    }
};
