// useExifExtractor Hook
// Direct EXIF extraction with HEIC conversion support

'use client';

import { useState, useCallback } from 'react';
import exifr from 'exifr';

// App version for deployment verification
export const APP_VERSION = 'v1.0.6';

export interface ExifData {
    dateTaken: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    camera: string | null;
    lens: string | null;
    make: string | null;
    model: string | null;
}

export interface ExifResult {
    success: boolean;
    data: ExifData | null;
    error: string | null;
    fileName: string;
}

interface UseExifExtractorReturn {
    extractFromFiles: (files: File[]) => Promise<ExifResult[]>;
    isExtracting: boolean;
    progress: number;
    error: string | null;
}

// Check if file is HEIC/HEIF
const isHeicFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
};

// Convert HEIC to JPEG using heic2any
const convertHeicToJpeg = async (file: File): Promise<Blob> => {
    console.log('Converting HEIC to JPEG...');
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
    });
    // heic2any can return a Blob or an array of Blobs
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    console.log('HEIC converted to JPEG, size:', jpegBlob.size);
    return jpegBlob;
};

export function useExifExtractor(): UseExifExtractorReturn {
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const extractExif = async (file: File): Promise<ExifResult> => {
        try {
            console.log(`[${APP_VERSION}] Extracting EXIF from:`, file.name, file.type, file.size);

            let fileToProcess: Blob = file;

            // Convert HEIC to JPEG if needed
            if (isHeicFile(file)) {
                try {
                    fileToProcess = await convertHeicToJpeg(file);
                } catch (conversionError) {
                    console.error('HEIC conversion failed:', conversionError);
                    return {
                        success: false,
                        data: null,
                        error: 'HEIC 변환 실패. JPEG로 변환 후 업로드해주세요.',
                        fileName: file.name,
                    };
                }
            }

            // Read file as ArrayBuffer
            const arrayBuffer = await fileToProcess.arrayBuffer();
            console.log('File read as ArrayBuffer, size:', arrayBuffer.byteLength);

            // Parse EXIF data
            const exif = await exifr.parse(arrayBuffer, {
                tiff: true,
                exif: true,
                gps: true,
            });

            console.log('EXIF result:', exif);

            if (!exif) {
                return {
                    success: false,
                    data: null,
                    error: 'No EXIF data found',
                    fileName: file.name,
                };
            }

            // Extract GPS coordinates
            let gpsLat: number | null = null;
            let gpsLng: number | null = null;

            try {
                const gps = await exifr.gps(arrayBuffer);
                console.log('GPS result:', gps);
                if (gps) {
                    gpsLat = gps.latitude;
                    gpsLng = gps.longitude;
                }
            } catch (gpsError) {
                console.log('GPS extraction failed:', gpsError);
            }

            // Get date
            let dateTaken: string | null = null;
            const dateValue = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
            if (dateValue) {
                try {
                    dateTaken = new Date(dateValue).toISOString();
                } catch {
                    console.log('Date parsing failed for:', dateValue);
                }
            }

            const data: ExifData = {
                dateTaken,
                gpsLat,
                gpsLng,
                camera: exif.Model || null,
                lens: exif.LensModel || null,
                make: exif.Make || null,
                model: exif.Model || null,
            };

            console.log('Extracted data:', data);

            return {
                success: true,
                data,
                error: null,
                fileName: file.name,
            };
        } catch (err) {
            console.error('EXIF extraction error:', err);
            return {
                success: false,
                data: null,
                error: err instanceof Error ? err.message : 'Unknown error',
                fileName: file.name,
            };
        }
    };

    const extractFromFiles = useCallback(async (files: File[]): Promise<ExifResult[]> => {
        setIsExtracting(true);
        setProgress(0);
        setError(null);

        const results: ExifResult[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const result = await extractExif(file);
                results.push(result);
                setProgress(((i + 1) / files.length) * 100);
            }
        } catch (err) {
            console.error('Extraction loop error:', err);
            setError(err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setIsExtracting(false);
        }

        return results;
    }, []);

    return {
        extractFromFiles,
        isExtracting,
        progress,
        error,
    };
}
