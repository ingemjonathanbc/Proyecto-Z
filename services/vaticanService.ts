// import { SearchResult } from "../types";

const PROXY_BASE = "https://corsproxy.io/?";
// Use the RSS feed for reliable machine-readable content
const RSS_URL = "https://rss.evangelizo.org/rss/v2/evangelizo_rss-sp.xml";

interface DailyReading {
    title: string;
    reference: string;
    text: string;
    type: 'GOSPEL' | 'READING_1' | 'READING_2' | 'PSALM';
}

/**
 * Fetches Daily Readings from Evangelizo.org RSS Feed
 */
export const getVaticanDailyReadings = async (): Promise<DailyReading[]> => {
    try {
        const target = `${PROXY_BASE}${encodeURIComponent(RSS_URL)}`;
        console.log("🙏 Fetching Evangelio RSS:", target);

        const response = await fetch(target);
        if (!response.ok) throw new Error("RSS Fetch Failed");

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item"));

        const readings: DailyReading[] = [];

        // DATE FILTERING: Ensure we only pick readings for TODAY
        // RSS format usually: "Sábado, 13 De Diciembre : ..."
        // We construct a flexible matcher.
        const now = new Date();
        const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        };
        // Ex: "sábado, 13 de diciembre"
        const todayStr = now.toLocaleDateString('es-ES', dateOptions).toLowerCase();
        // Remove accents for safer matching (optional but good) and lowercase

        console.log("📅 Looking for readings matching date pattern:", todayStr);

        for (const item of items) {
            const rawTitle = item.querySelector("title")?.textContent || "";

            // Check if Title contains today's date parts (Day Month)
            // We do loose match: "13" AND "diciembre" (ignoring 'de' casing)
            const dayNum = now.getDate().toString();
            // Get month name in Spanish: 'diciembre'
            const monthName = now.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();

            // Loose match to avoid "De" vs "de" or "," issues
            const titleLower = rawTitle.toLowerCase();
            const isToday = titleLower.includes(dayNum) && titleLower.includes(monthName);

            if (!isToday) {
                // Skip if not today (unless it's a fallback? user complained about wrong date, so strict is better)
                // console.log("Skipping stale reading:", rawTitle);
                continue;
            }
            // Format: "Sábado, 13 De Diciembre : Evangelio según San Mateo 17,10-13."
            // Split by " : " to separate Date and Source
            const parts = rawTitle.split(" : ");
            const datePart = parts[0]?.trim() || "";
            // Keep full source for display (User wants to see verses)
            const sourcePart = parts[1]?.trim() || rawTitle;

            // The description usually contains the full HTML content of the reading
            let description = item.querySelector("description")?.textContent || "";

            // Cleanup HTML tags from description to get clean text
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = description;
            const cleanText = tempDiv.textContent || "";

            // Check Category
            const category = item.querySelector("category")?.textContent || "";

            if (category === 'EVANGELIUM' || rawTitle.toLowerCase().includes("evangelio")) {
                readings.push({
                    title: `Evangelio del Día - ${datePart}`,
                    reference: sourcePart,
                    text: cleanText.trim(),
                    type: 'GOSPEL'
                });
            } else if (category === 'LECTIO 1' || (category === '' && rawTitle.includes("Libro de"))) {
                readings.push({
                    title: `1ra Lectura - ${datePart}`,
                    reference: sourcePart,
                    text: cleanText.trim(),
                    type: 'READING_1'
                });
            } else if (category === 'LECTIO 2') {
                readings.push({
                    title: `2da Lectura - ${datePart}`,
                    reference: sourcePart,
                    text: cleanText.trim(),
                    type: 'READING_2'
                });
            } else if (category === 'PSALMUS') {
                // FORMATTING: User wants only "Salmo X" (remove parenthesis and verses)
                // Ex: "Salmo 118(119),1.2.4..." -> "Salmo 118"
                let cleanRef = sourcePart;
                if (cleanRef.includes('(')) {
                    cleanRef = cleanRef.split('(')[0].trim();
                }

                readings.push({
                    title: `Salmo del Día - ${datePart}`,
                    reference: cleanRef,
                    text: cleanText.trim(),
                    type: 'PSALM'
                });
            }
        }

        return readings;

    } catch (e) {
        console.error("RSS Parsing Error:", e);
        return [];
    }
};
