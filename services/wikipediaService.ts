
/**
 * Service to fetch VERIFIED quotes from Wikiquote (Internet Search)
 * Prevents AI hallucinations by sourcing real text.
 */

interface WikiQuote {
    text: string;
    author: string;
    source?: string;
}

const WIKI_API_BASE = "https://es.wikiquote.org/w/api.php";

/**
 * Search for a relevant page on Wikiquote
 */
const searchWikiPage = async (topic: string): Promise<string | null> => {
    try {
        const url = `${WIKI_API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.query && data.query.search && data.query.search.length > 0) {
            // Return first hit title
            return data.query.search[0].title;
        }
        return null;
    } catch (e) {
        console.error("Wiki Search Error:", e);
        return null;
    }
};

/**
 * Extract quotes from a Wikiquote Page HTML
 */
const extractQuotesFromHTML = (html: string, author: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Quotes are usually in <ul> lists
    const listItems = doc.querySelectorAll('ul > li');
    const quotes: string[] = [];

    listItems.forEach(li => {
        // Filter out TOC or metadata
        // Real quotes usually don't have many links or are plain text
        // Clean citations [1]
        let text = li.textContent || "";
        text = text.replace(/\[\d+\]/g, '').trim();

        // Simple heuristic: Must be reasonably long but not an essay
        if (text.length > 20 && text.length < 500) {
            quotes.push(text);
        }
    });

    return quotes;
};

/**
 * Main function to get a verified quote
 */
export const getVerifiedWikiQuote = async (topic: string): Promise<WikiQuote | null> => {
    try {
        console.log(`🌐 Searching Internet (Wikiquote) for: ${topic}`);
        const pageTitle = await searchWikiPage(topic);

        if (!pageTitle) {
            console.warn(`❌ No Wikiquote page found for: ${topic}`);
            return null;
        }

        console.log(`📄 Found Page: ${pageTitle}`);

        const url = `${WIKI_API_BASE}?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.parse || !data.parse.text || !data.parse.text['*']) return null;

        const html = data.parse.text['*'];
        const candidates = extractQuotesFromHTML(html, pageTitle);

        if (candidates.length === 0) return null;

        // Pick random
        const randomQuote = candidates[Math.floor(Math.random() * candidates.length)];

        return {
            text: randomQuote,
            author: pageTitle, // Page title is usually the author name (e.g. "Marco Aurelio")
            source: "Wikiquote"
        };

    } catch (e) {
        console.error("Wikiquote Fetch Error:", e);
        return null;
    }
};
