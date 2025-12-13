export interface MusicTrack {
    id: string;
    label: string;
    path?: string; // If present, it's a file. If missing, it's procedural.
    type: 'file' | 'procedural';
}

export const MUSIC_TRACKS: MusicTrack[] = [
    // Procedural (Generated)
    { id: 'calm-ambient', label: '☁️ Ambiente Tranquilo (Generado)', type: 'procedural' },
    { id: 'uplifting-piano', label: '🎹 Piano Inspirador (Generado)', type: 'procedural' },
    { id: 'dramatic-strings', label: '🎻 Cuerdas Dramáticas (Generado)', type: 'procedural' },
    { id: 'peaceful-meditation', label: '🧘 Meditación Pacífica (Generado)', type: 'procedural' },

    // Custom Files (Gregorian & Cinematic)
    { id: 'act-of-contrition', label: '🙏 Act of Contrition (Latin)', path: '/music/act-of-contrition-latin-gregorian-chant-240837.mp3', type: 'file' },
    { id: 'amo-te', label: '❤️ Amo Te (Latin)', path: '/music/amo-te-gregorian-chant-in-latin-342517.mp3', type: 'file' },
    { id: 'angel-of-god', label: '👼 Angel of God', path: '/music/angel-of-god-247262.mp3', type: 'file' },
    { id: 'cathedral', label: '🏰 Cathedral Atmosphere', path: '/music/cathedral-110021.mp3', type: 'file' },
    { id: 'cendres', label: '📜 Cendres sur le Parchemin', path: '/music/cendres-sur-le-parchemin-378060.mp3', type: 'file' },
    { id: 'cinematic-chant', label: '🎬 Cinematic Chant (Halo)', path: '/music/cinematic-choral-chant-halo-inspired-201206.mp3', type: 'file' },
    { id: 'epic-choir', label: '⚔️ Epic Gregorian Choir', path: '/music/epic-gregorian-choir-cinematic-soundtrack-355524.mp3', type: 'file' },
    { id: 'canticum-01', label: '🌑 Canticum Tenebrae I', path: '/music/epic-gregorian-choir-cinematic-soundtrack-canticum-tenebrae-01-436728.mp3', type: 'file' },
    { id: 'canticum-03', label: '🌑 Canticum Tenebrae III', path: '/music/epic-gregorian-choir-cinematic-soundtrack-canticum-tenebrae-03-436725.mp3', type: 'file' },
    { id: 'canticum-04', label: '🌑 Canticum Tenebrae IV', path: '/music/epic-gregorian-choir-cinematic-soundtrack-canticum-tenebrae-04-436727.mp3', type: 'file' },
    { id: 'ethereal-bells', label: '🔔 Ethereal Bells & Organ', path: '/music/ethereal-gregorian-choir-cathedral-bells-amp-organ-422968.mp3', type: 'file' },
    { id: 'exsultet', label: '🕯️ Exsultet', path: '/music/exsultet-324810.mp3', type: 'file' },
    { id: 'domine-deus', label: '⛪ Domine Deus Meus', path: '/music/gregorian-chant-domine-deus-meus-225267.mp3', type: 'file' },
    { id: 'prayer-mary', label: '🌹 Prayer to Mary', path: '/music/gregorian-chant-private-prayer-to-mary-337672.mp3', type: 'file' },
    { id: 'regina-caeli', label: '👑 Regina Caeli', path: '/music/gregorian-chant-regina-caeli-prayer-341917.mp3', type: 'file' },
    { id: 'regina-caeli-monks', label: ' monks Regina Caeli (Monks)', path: '/music/gregorian-chant-regina-caeli-sung-by-monks-228448.mp3', type: 'file' },
    { id: 'glory-be', label: '✨ Glory Be', path: '/music/gregorian-chant-the-glory-be-prayer-222193.mp3', type: 'file' },
    { id: 'honorguard', label: '🛡️ Honor Guard', path: '/music/honorguard-115551.mp3', type: 'file' },
    { id: 'thanksgiving', label: '🙌 Thanksgiving Chant', path: '/music/latin-gregorian-chant-in-thanksgiving-for-a-new-pope-340437.mp3', type: 'file' },
    { id: 'le-masque', label: '🎭 Le Masque', path: '/music/le-masque-de-lheretique-378065.mp3', type: 'file' },
    { id: 'quantum', label: '🌌 Quantum Chant', path: '/music/quantum-entanglement-latin-gregorian-chant-214406.mp3', type: 'file' },
    { id: 'absolve', label: '⚖️ Absolve Domine', path: '/music/religious-chant-absolve-domine-331686.mp3', type: 'file' },
    { id: 'salve-regina', label: '👸 Salve Regina', path: '/music/salve-regina-324809.mp3', type: 'file' },
    { id: 'te-deum', label: '✝️ Te Deum', path: '/music/te-deum-324799.mp3', type: 'file' },
    { id: 'veni-creator', label: '🔥 Veni Creator Spiritus', path: '/music/veni-creator-spiritus-324807.mp3', type: 'file' },
];
