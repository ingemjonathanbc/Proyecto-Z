/**
 * Service to perform "True" Web Search using DuckDuckGo Lite (Scraping via Proxy)
 * This fulfills the user requirement: "Search Google/Internet instead of inventing"
 */

const PROXY_BASE = "https://corsproxy.io/?";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";

export interface SearchResult {
    title: string;
    snippet: string;
    source: string;
    url?: string;
}

/**
 * Clean text artifacts
 */
const cleanText = (text: string): string => {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[.]{3,}/g, '...')
        .trim();
};

const TRUSTED_SITES = [
    'webcatolicodejavier.org',
    'marypages.com',
    'aciprensa.com',
    'ewtn.com',
    'vaticannews.va',
    'oracionesydevociones.info'
];

/**
 * Fetch full content from a URL (Deep Navigation)
 */
const fetchFullContentFromUrl = async (url: string): Promise<string | null> => {
    try {
        console.log(`🧭 Navigating to: ${url}`);
        const proxyUrl = `${PROXY_BASE}${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
            console.warn(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
            return null;
        }

        const html = await res.text();

        // VALIDATION: Check if we got the Proxy Landing Page instead of the content
        if (html.includes('CorsProxy allows web applications') || html.includes('USAGE:')) {
            console.warn(`⚠️ Proxy returned potential error page for ${url}`);
            return null;
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Heuristic extraction for typical prayer sites
        // 1. Remove clutter
        doc.querySelectorAll('script, style, nav, footer, header, .sidebar, .ads, .related-posts, .menu').forEach(el => el.remove());

        // 2. Try specific containers if known (MaryPages, WebCatolico)
        const specificContent = doc.querySelector('.mbr-article, .post-content, #content, main, .entry-content, .article-content, .td-post-content');
        if (specificContent) {
            const text = cleanText(specificContent.textContent || "");
            if (text.length > 100) { // Ensure it's substantial
                return text;
            }
        }

        // 3. Fallback: Find paragraph-heavy distinct body
        const paragraphs = doc.querySelectorAll('p');
        let fullText = "";
        paragraphs.forEach(p => {
            const t = p.textContent?.trim() || "";
            if (t.length > 30) fullText += t + "\n\n";
        });

        return fullText.length > 50 ? fullText.trim() : null;

    } catch (e) {
        console.error("Navigation Error:", e);
        return null;
    }
}

/**
 * Search DuckDuckGo specifically for a Prayer/Oración
 * Priority: Trusted Sites -> General Web
 */
export const searchWebForPrayer = async (saintOrTopic: string): Promise<SearchResult | null> => {
    try {
        // 1. Try Specific Trusted Search first
        const siteQuery = TRUSTED_SITES.map(site => `site:${site}`).join(' OR ');
        const trustedQuery = `(${siteQuery}) ${saintOrTopic} oracion`; // Removed "completa" to be broader

        console.log(`🌍 Searching Trusted Sites: "${trustedQuery}"`);
        let result = await performDuckDuckGoSearch(trustedQuery, saintOrTopic);

        if (result && result.url) {
            console.log(`✅ Found Cached Link: ${result.url}`);
            // DEEP NAVIGATION: Fetch the real content!
            const fullContent = await fetchFullContentFromUrl(result.url);
            if (fullContent) {
                console.log(`📄 Extracted Full Page Content (${fullContent.length} chars)`);
                // Optimize: Return a good chunk of it, or the whole thing if typically short
                return {
                    ...result,
                    snippet: fullContent.substring(0, 1000) // Limit to avoid context overflow, usually prayers aren't huge
                };
            } else {
                console.warn(`⚠️ Could not extract full content from ${result.url}, falling back to snippet.`);
            }
        }

        if (result) {
            console.log(`✅ Found snippet from search: ${result.source}`);
            return result;
        }

        // 2. Fallback to General Search
        const generalQuery = `Oracion a ${saintOrTopic}`;
        console.log(`🌍 Fallback to General Web: "${generalQuery}"`);
        return await performDuckDuckGoSearch(generalQuery, saintOrTopic);

    } catch (error) {
        console.error("❌ Web Search Failed:", error);
        return null;
    }
};

/**
 * Helper to execute the actual DDG request and parse
 */
const performDuckDuckGoSearch = async (query: string, topic: string): Promise<SearchResult | null> => {
    try {
        const targetUrl = `${DDG_LITE_URL}?q=${encodeURIComponent(query)}`;
        const proxyUrl = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;

        console.log(`🔍 Performing DDG Lite search for: "${query}"`);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.error(`DDG Search Network Error: ${response.status} ${response.statusText}`);
            throw new Error("Search Network Error");
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // DDG Lite Table Structure:
        // TR 1: <td class="result-link"><a href="...">Title</a></td>
        // TR 2: <td class="result-snippet">Snippet...</td>

        const rows = doc.querySelectorAll('tr');

        for (let i = 0; i < rows.length - 1; i++) {
            const linkRow = rows[i];
            const snippetRow = rows[i + 1];

            const linkAnchor = linkRow.querySelector('a.result-link');
            const snippetTd = snippetRow.querySelector('td.result-snippet');

            if (linkAnchor && snippetTd) {
                const title = linkAnchor.textContent || "";
                const rawUrl = linkAnchor.getAttribute('href') || "";
                const snippet = cleanText(snippetTd.textContent || "");

                // DDG Lite hrefs are often /l/?kh=-1&uddg=... need decoding?
                let realUrl = rawUrl;
                if (realUrl.startsWith('/l/')) {
                    const match = realUrl.match(/uddg=([^&]+)/);
                    if (match) {
                        try {
                            realUrl = decodeURIComponent(match[1]);
                        } catch (e) { }
                    }
                }

                const lower = (title + snippet).toLowerCase();
                const prayerKeywords = ['oracion', 'oh', 'señor', 'dios', 'amen', 'ruega'];
                const score = prayerKeywords.reduce((acc, word) => lower.includes(word) ? acc + 1 : acc, 0);

                if (score >= 1) {
                    return {
                        title: title,
                        snippet: snippet,
                        source: "Sitio Católico Verificado",
                        url: realUrl
                    };
                }
            }
        }
        return null;
    } catch (e) {
        console.error("DDG Search Error", e);
        return null;
    }
};
