console.log("✅ quoteBank.ts loaded");
import { ViralQuote } from '../types';

// Banco de Frases Estoicas
const STOIC_QUOTES: Omit<ViralQuote, 'category'>[] = [
    { text: "El obstáculo es el camino", author: "Marco Aurelio", theme: "ancient stone path through mountain" },
    { text: "Controla tu mente o ella te controlará", author: "Epicteto", theme: "stormy ocean with lighthouse" },
    { text: "La disciplina vence al talento", author: "Séneca", theme: "iron forge with sparks" },
    { text: "No temas al fracaso, teme no intentarlo", author: "Proverbio Estoico", theme: "warrior standing at cliff edge" },
    { text: "Tu obstáculo más grande eres tú", author: "Epicteto", theme: "mirror reflection in dark room" },
    { text: "La inacción es la peor derrota", author: "Marco Aurelio", theme: "lone soldier on battlefield" },
    { text: "Sufre ahora, triunfa después", author: "Filosofía Estoica", theme: "boxing gym at dawn" },
    { text: "El dolor es temporal, el orgullo eterno", author: "Disciplina Diaria", theme: "mountain climber at summit" },
    { text: "Sé el dueño de tu destino", author: "Séneca", theme: "captain steering ship in storm" },
    { text: "La virtud es la única riqueza real", author: "Epicteto", theme: "ancient greek statue in rain" },
    { text: "No esperes, crea tu momento", author: "Marco Aurelio", theme: "blacksmith hammering metal" },
    { text: "El miedo solo existe en tu mente", author: "Séneca", theme: "dark forest with single light" },
    { text: "Menos queja, más acción", author: "Mentalidad Élite", theme: "athletic track at sunrise" },
    { text: "Tu carácter es tu destino", author: "Marco Aurelio", theme: "ancient ruins at dusk" },
    { text: "Domina tu día o el día te dominará", author: "Disciplina Real", theme: "clock tower in fog" },
    { text: "El camino fácil nunca vale la pena", author: "Filosofía Estoica", theme: "steep mountain trail" },
    { text: "Sé quien eres, no quien te piden ser", author: "Epicteto", theme: "lone wolf in wilderness" },
    { text: "La excelencia es un hábito diario", author: "Aristóteles", theme: "martial arts dojo empty" },
    { text: "Convierte el dolor en poder", author: "Mentalidad Ganadora", theme: "phoenix rising from ashes" },
    { text: "No hay atajos a ningún lugar que valga la pena", author: "Séneca", theme: "long desert road" },
    { text: "El confort es el enemigo del crecimiento", author: "Disciplina Diaria", theme: "icy mountain peak" },
    { text: "Tu mente es tu arma más poderosa", author: "Marco Aurelio", theme: "chess pieces on stone board" },
    { text: "La adversidad revela el carácter", author: "Epicteto", theme: "diamond under pressure" },
    { text: "Quien controla la mañana controla el día", author: "Rutina Estoica", theme: "sunrise over city skyline" },
    { text: "El fracaso es el mejor maestro", author: "Filosofía Estoica", theme: "broken sword being reforged" },
    { text: "No reacciones, responde con sabiduría", author: "Séneca", theme: "calm lake reflecting mountains" },
    { text: "La mediocre es una elección", author: "Mentalidad Élite", theme: "crossroads with two paths" },
    { text: "Haz hoy lo que otros no harán", author: "Disciplina Real", theme: "empty gym at 5am" },
    { text: "Tu única competencia eres tú mismo", author: "Marco Aurelio", theme: "athlete running alone" },
    { text: "El silencio es más poderoso que las palabras", author: "Epicteto", theme: "zen garden in mist" }
];

// Banco de Frases Cristianas
const CHRISTIAN_QUOTES: Omit<ViralQuote, 'category'>[] = [
    { text: "Todo lo puedo en Cristo que me fortalece", author: "Filipenses 4:13", theme: "ray of light breaking through clouds" },
    { text: "Dios tiene un propósito en tu dolor", author: "Romanos 8:28", theme: "cross on hill at sunset" },
    { text: "La fe mueve montañas", author: "Mateo 17:20", theme: "mountain range with golden sky" },
    { text: "Confía en el tiempo de Dios, no en el tuyo", author: "Eclesiastés 3:1", theme: "hourglass with divine light" },
    { text: "Tu batalla es de Dios, no tuya", author: "2 Crónicas 20:15", theme: "warrior angel silhouette" },
    { text: "Dios convierte tu dolor en propósito", author: "Salmos 30:11", theme: "broken chains with light" },
    { text: "Lo imposible para el hombre es posible para Dios", author: "Lucas 1:37", theme: "hands reaching for sky" },
    { text: "Entrega tus cargas, Él cargará contigo", author: "Salmos 55:22", theme: "shepherd carrying lamb" },
    { text: "Dios nunca llega tarde", author: "Salmos 27:14", theme: "sunrise over calm waters" },
    { text: "En tus debilidades, Él es fuerte", author: "2 Corintios 12:9", theme: "cracked vase with light inside" },
    { text: "La paz de Dios sobrepasa todo entendimiento", author: "Filipenses 4:7", theme: "dove flying over stormy sea" },
    { text: "Tú eres más que vencedor en Cristo", author: "Romanos 8:37", theme: "crown on ancient throne" },
    { text: "Dios pelea tus batallas", author: "Éxodo 14:14", theme: "shield and sword in light" },
    { text: "Con Dios todo tiene sentido", author: "Proverbios 3:5-6", theme: "path through forest with light" },
    { text: "Tu fe es más fuerte que tu miedo", author: "Josué 1:9", theme: "lion standing fearless" },
    { text: "El amor de Dios nunca falla", author: "1 Corintios 13:8", theme: "heart shape in clouds" },
    { text: "Dios está contigo en el valle", author: "Salmos 23:4", theme: "shepherd in dark valley" },
    { text: "No por fuerza, sino por mi Espíritu", author: "Zacarías 4:6", theme: "flame burning bright" },
    { text: "Dios restaura lo que el enemigo robó", author: "Joel 2:25", theme: "garden blooming after storm" },
    { text: "Tu esperanza está en el Señor", author: "Salmos 39:7", theme: "anchor in stormy ocean" },
    { text: "Mayor es el que está en ti", author: "1 Juan 4:4", theme: "armor of light" },
    { text: "Dios sana el corazón quebrantado", author: "Salmos 147:3", theme: "broken heart mended with gold" },
    { text: "La gracia de Dios es suficiente", author: "2 Corintios 12:9", theme: "cup overflowing with light" },
    { text: "Entrega tu camino al Señor", author: "Salmos 37:5", theme: "path with footprints in sand" },
    { text: "Dios convierte tus cenizas en belleza", author: "Isaías 61:3", theme: "phoenix rising from fire" },
    { text: "No temas, yo estoy contigo", author: "Isaías 41:10", theme: "hand holding another hand" },
    { text: "Busca primero el reino de Dios", author: "Mateo 6:33", theme: "door of light in darkness" },
    { text: "El gozo del Señor es tu fortaleza", author: "Nehemías 8:10", theme: "sunrise over mountains" },
    { text: "Dios tiene planes de bien para ti", author: "Jeremías 29:11", theme: "map with glowing destination" },
    { text: "Echa toda ansiedad sobre Él", author: "1 Pedro 5:7", theme: "person releasing birds to sky" }
];

// Almacenar IDs de frases ya usadas
const USED_QUOTES_KEY = 'stoicbot_used_quotes';

const getUsedQuotes = (): string[] => {
    try {
        const stored = localStorage.getItem(USED_QUOTES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const markQuoteAsUsed = (quoteId: string) => {
    const used = getUsedQuotes();
    used.push(quoteId);
    // Mantener solo las últimas 100 para evitar llenado infinito
    if (used.length > 100) used.shift();
    localStorage.setItem(USED_QUOTES_KEY, JSON.stringify(used));
};

const createQuoteId = (quote: Omit<ViralQuote, 'category'>): string => {
    return `${quote.text}-${quote.author}`;
};

export const getRandomQuote = (topic: string): ViralQuote => {
    console.log("🎯 getRandomQuote called with topic:", topic);

    // Detectar categoría basada en topic (Similar lógica a antes)
    const christianKeywords = [
        "FE", "DIOS", "CRISTIANA", "BIBLIA", "ORACIÓN", "SALMOS", "ESPERANZA",
        "PROVERBIOS", "JESÚS", "ARCÁNGEL", "DEVOCIONAL", "MILAGRO", "ESPIRITUAL",
        "VERSÍCULO", "PRÓDIGO", "GOLIAT", "DANIEL", "TESTIMONIO", "EVANGELIO"
    ];

    const isChristian = christianKeywords.some(k => topic.toUpperCase().includes(k));
    const pool = isChristian ? CHRISTIAN_QUOTES : STOIC_QUOTES;
    const category = isChristian ? 'CHRISTIAN' : 'STOIC';

    console.log(`📚 Category: ${category}, Pool size: ${pool.length}`);

    const usedIds = getUsedQuotes();

    // Filtrar frases no usadas
    const availableQuotes = pool.filter(q => !usedIds.includes(createQuoteId(q)));

    // Si todas fueron usadas, resetear
    const selectedPool = availableQuotes.length > 0 ? availableQuotes : pool;

    // Selección aleatoria
    const randomQuote = selectedPool[Math.floor(Math.random() * selectedPool.length)];

    // Marcar como usada
    markQuoteAsUsed(createQuoteId(randomQuote));

    const finalQuote = {
        ...randomQuote,
        category
    };

    console.log("✅ Quote selected:", finalQuote);

    return finalQuote;
};
