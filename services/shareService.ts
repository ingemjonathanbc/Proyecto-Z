/**
 * Social Media Share Service
 * Handles sharing to various platforms
 */

export interface ShareOptions {
    text: string;
    url?: string;
    hashtags?: string[];
}

/**
 * Share to Twitter/X
 */
export function shareToTwitter(options: ShareOptions): void {
    const text = encodeURIComponent(options.text);
    const hashtags = options.hashtags?.join(',') || 'FeCristiana,Inspiracion';
    const url = options.url ? encodeURIComponent(options.url) : '';

    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&hashtags=${hashtags}${url ? `&url=${url}` : ''}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

/**
 * Share to Facebook
 */
export function shareToFacebook(options: ShareOptions): void {
    const url = options.url || window.location.href;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

/**
 * Share to WhatsApp
 */
export function shareToWhatsApp(options: ShareOptions): void {
    const text = encodeURIComponent(options.text + (options.url ? ` ${options.url}` : ''));
    const shareUrl = `https://wa.me/?text=${text}`;
    window.open(shareUrl, '_blank');
}

/**
 * Copy to clipboard (for TikTok caption)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    }
}

/**
 * Generate shareable text from content
 */
export function generateShareText(quote: string, category: string): string {
    const hashtags = category === 'CHRISTIAN'
        ? '#FeCristiana #Dios #Jesús #Oración'
        : '#Estoicismo #Sabiduría #Filosofía';

    return `"${quote}"\n\n${hashtags}`;
}

/**
 * Open TikTok with instructions
 */
export function shareToTikTok(caption: string): void {
    // TikTok doesn't have a web share API, so we copy caption and show instructions
    copyToClipboard(caption).then(success => {
        if (success) {
            alert(
                '✅ Caption copiado!\n\n' +
                'Pasos para compartir en TikTok:\n' +
                '1. Descarga el video (MP4)\n' +
                '2. Abre TikTok en tu móvil\n' +
                '3. Sube el video\n' +
                '4. Pega el caption (ya está en tu portapapeles)\n' +
                '5. ¡Publica!'
            );
        }
    });
}

/**
 * Native Web Share API (if available)
 */
export async function nativeShare(options: ShareOptions & { file?: File }): Promise<boolean> {
    if (!navigator.share) {
        return false;
    }

    try {
        const shareData: ShareData = {
            title: 'StoicBot Video',
            text: options.text,
        };

        if (options.url) {
            shareData.url = options.url;
        }

        if (options.file && navigator.canShare?.({ files: [options.file] })) {
            shareData.files = [options.file];
        }

        await navigator.share(shareData);
        return true;
    } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
        return false;
    }
}
