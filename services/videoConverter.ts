/**
 * Video Converter Service using FFmpeg.wasm
 * Converts WebM to MP4 in the browser
 */

export interface ConversionProgress {
    progress: number; // 0 to 100
    stage: string;
}

let ffmpegInstance: any = null;
let isFFmpegLoaded = false;

/**
 * Load FFmpeg.wasm library
 */
export async function loadFFmpeg(onProgress?: (progress: ConversionProgress) => void): Promise<void> {
    if (isFFmpegLoaded && ffmpegInstance) {
        return;
    }

    try {
        // Dynamically import FFmpeg
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

        ffmpegInstance = new FFmpeg();

        // Set up logging
        ffmpegInstance.on('log', ({ message }: { message: string }) => {
            console.log('[FFmpeg]', message);
        });

        // Set up progress tracking
        ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
            if (onProgress) {
                onProgress({
                    progress: Math.round(progress * 100),
                    stage: 'Converting...'
                });
            }
        });

        // Load FFmpeg core
        onProgress?.({ progress: 0, stage: 'Loading FFmpeg...' });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        });

        isFFmpegLoaded = true;
        onProgress?.({ progress: 100, stage: 'Ready!' });

        console.log('✅ FFmpeg loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load FFmpeg:', error);
        throw new Error('Failed to initialize video converter. This feature requires a modern browser.');
    }
}

/**
 * Convert WebM blob to MP4
 */
export async function convertWebMToMP4(
    webmBlob: Blob,
    onProgress?: (progress: ConversionProgress) => void
): Promise<Blob> {
    try {
        // Ensure FFmpeg is loaded
        await loadFFmpeg(onProgress);

        if (!ffmpegInstance) {
            throw new Error('FFmpeg not initialized');
        }

        onProgress?.({ progress: 10, stage: 'Preparing video...' });

        // Import util functions
        const { fetchFile } = await import('@ffmpeg/util');

        // Write input file to FFmpeg virtual filesystem
        const inputFileName = 'input.webm';
        const outputFileName = 'output.mp4';

        await ffmpegInstance.writeFile(inputFileName, await fetchFile(webmBlob));

        onProgress?.({ progress: 20, stage: 'Converting to MP4...' });

        // Run FFmpeg conversion
        // High quality H.264 encoding with AAC audio
        await ffmpegInstance.exec([
            '-i', inputFileName,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            outputFileName
        ]);

        onProgress?.({ progress: 90, stage: 'Preparing download...' });

        // Read the output file
        const data = await ffmpegInstance.readFile(outputFileName);
        const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

        // Clean up
        await ffmpegInstance.deleteFile(inputFileName);
        await ffmpegInstance.deleteFile(outputFileName);

        onProgress?.({ progress: 100, stage: 'Complete!' });

        return mp4Blob;
    } catch (error) {
        console.error('❌ Conversion failed:', error);
        throw new Error('Video conversion failed. Please try the WebM download instead.');
    }
}

/**
 * Check if FFmpeg is supported in current browser
 */
export function isConversionSupported(): boolean {
    // FFmpeg.wasm requires SharedArrayBuffer which needs specific headers
    // For now, we'll try to load it and catch errors
    return typeof WebAssembly !== 'undefined';
}
