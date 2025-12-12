/**
 * Visual themes for video customization
 */

export interface ColorTheme {
    id: string;
    name: string;
    emoji: string;
    // Text colors
    primaryText: string;
    highlightText: string;
    // Overlay & Background
    overlayColor: string;
    overlayOpacity: number;
    // Particles
    particleColor: string;
    particleGlow: string;
    // Gradients (for fallback backgrounds)
    gradientStart: string;
    gradientEnd: string;
}

export const COLOR_THEMES: ColorTheme[] = [
    {
        id: 'golden-heaven',
        name: 'Cielo Dorado',
        emoji: '✨',
        primaryText: '#FFD700',
        highlightText: '#FFF4E6',
        overlayColor: 'rgba(25, 15, 0, 0.6)',
        overlayOpacity: 0.5,
        particleColor: '#FFD700',
        particleGlow: '#FFA500',
        gradientStart: '#1a1410',
        gradientEnd: '#2d1f0f'
    },
    {
        id: 'mystic-blue',
        name: 'Azul Místico',
        emoji: '🌙',
        primaryText: '#87CEEB',
        highlightText: '#E0F7FF',
        overlayColor: 'rgba(0, 15, 35, 0.6)',
        overlayOpacity: 0.55,
        particleColor: '#87CEEB',
        particleGlow: '#4A90E2',
        gradientStart: '#0a0e1a',
        gradientEnd: '#1a1f3a'
    },
    {
        id: 'royal-purple',
        name: 'Púrpura Real',
        emoji: '👑',
        primaryText: '#DA70D6',
        highlightText: '#F8E5FF',
        overlayColor: 'rgba(20, 0, 30, 0.6)',
        overlayOpacity: 0.5,
        particleColor: '#DA70D6',
        particleGlow: '#9370DB',
        gradientStart: '#14001e',
        gradientEnd: '#2a0f3a'
    },
    {
        id: 'emerald-peace',
        name: 'Paz Esmeralda',
        emoji: '🌿',
        primaryText: '#50C878',
        highlightText: '#E8FFF0',
        overlayColor: 'rgba(0, 20, 15, 0.6)',
        overlayOpacity: 0.5,
        particleColor: '#50C878',
        particleGlow: '#2ECC71',
        gradientStart: '#0a1a14',
        gradientEnd: '#0f2a1f'
    }
];

export const getThemeById = (id: string): ColorTheme => {
    return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];
};
