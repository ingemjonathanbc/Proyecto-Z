/**
 * Share Link System
 * Generate and parse shareable URLs with video configuration
 */

import { GeneratedContent } from '../types';

export interface ShareLinkData {
    text: string;
    title?: string;
    category: string;
    font?: string;
    theme?: string;
    effects?: {
        blur?: number;
        vignette?: number;
        speechRate?: number;
    };
}

/**
 * Generate a shareable link from content
 */
export function generateShareLink(content: GeneratedContent): string {
    const data: ShareLinkData = {
        text: content.quote.text,
        title: content.quote.title,
        category: content.quote.category,
        font: content.fontFamily,
        theme: content.colorTheme,
        effects: content.visualEffects ? {
            blur: content.visualEffects.blur,
            vignette: content.visualEffects.vignette,
            speechRate: content.visualEffects.speechRate
        } : undefined
    };

    // Compress and encode the data
    const encoded = btoa(JSON.stringify(data));
    const baseUrl = window.location.origin + window.location.pathname;

    return `${baseUrl}?share=${encoded}`;
}

/**
 * Parse share link from URL
 */
export function parseShareLink(url: string = window.location.href): ShareLinkData | null {
    try {
        const urlObj = new URL(url);
        const shareParam = urlObj.searchParams.get('share');

        if (!shareParam) {
            return null;
        }

        const decoded = atob(shareParam);
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Failed to parse share link:', error);
        return null;
    }
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(link: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(link);
        return true;
    } catch (error) {
        console.error('Failed to copy link:', error);
        return false;
    }
}

/**
 * Generate short description for sharing
 */
export function generateShareDescription(content: GeneratedContent): string {
    const preview = content.quote.text.substring(0, 100);
    return `${preview}${content.quote.text.length > 100 ? '...' : ''} - Creado con StoicBot`;
}
