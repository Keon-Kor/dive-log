// useExifExtractor Hook
// Robust EXIF extraction: Tries native HEIC parsing first, then falls back to conversion

'use client';

import { useState, useCallback } from 'react';
// Import FULL bundle for HEIC support (default import is Lite which only supports JPEG/TIFF)
import exifr from 'exifr/dist/full.esm.mjs';

// App version for deployment verification
export const APP_VERSION = 'v1.1.0';

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

// Helper to check if file is HEIC
const isHeicFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
};

export function useExifExtractor(): UseExifExtractorReturn {
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Helper to process EXIF data into our format
    const processExif = (exif: any, fileName: string): ExifResult => {
        // Extract GPS coordinates
        let gpsLat: number | null = null;
        let gpsLng: number | null = null;

        if (exif.latitude && exif.longitude) {
            gpsLat = exif.latitude;
            gpsLng = exif.longitude;
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

        return {
            success: true,
            data,
            error: null,
            fileName,
        };
    };

    const extractExif = async (file: File): Promise<ExifResult> => {
        const fileType = file.type || 'unknown';
        console.log(`[${APP_VERSION}] Extracting EXIF from: ${file.name} (${fileType}, ${file.size} bytes)`);

        // 1. Try native HEIC parsing first (fastest)
        try {
            // Read file as ArrayBuffer - exifr natively supports HEIC
            const arrayBuffer = await file.arrayBuffer();
            console.log('Read as ArrayBuffer. Attempting native parsing...');

            const exif = await exifr.parse(arrayBuffer, {
                tiff: true,
                exif: true,
                gps: true,
                // Add HEIC specific options just in case, though usually auto-detected
            });

            if (exif) {
                console.log('Native parsing successful:', exif);
                return processExif(exif, file.name);
            }
        } catch (nativeError) {
            console.warn('Native parsing failed or empty:', nativeError);
        }

        // 2. If native parsing failed AND it is a HEIC file, try converting to JPEG
        // This is a fallback for when exifr's native parser fails on specific HEIC encodings
        if (isHeicFile(file)) {
            try {
                console.log('Attempting fallback: HEIC to JPEG conversion...');
                // Dynamic import heic2any
                const heic2any = (await import('heic2any')).default;

                const result = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.5, // We only need metadata, speed is priority
                });

                const jpegBlob = Array.isArray(result) ? result[0] : result;
                console.log('Conversion successful. Parsing converted JPEG...');

                const arrayBuffer = await jpegBlob.arrayBuffer();
                const exif = await exifr.parse(arrayBuffer);

                if (exif) {
                    console.log('JPEG parsing successful');
                    return processExif(exif, file.name);
                }
            } catch (conversionError) {
                console.error('Fallback conversion failed:', conversionError);
                return {
                    success: false,
                    data: null,
                    error: 'HEIC 파일 형식을 읽을 수 없습니다. JPEG로 변환하여 업로드해주세요.',
                    fileName: file.name,
                };
            }
        }

        return {
            success: false,
            data: null,
            error: '메타데이터를 찾을 수 없습니다',
            fileName: file.name,
        };
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
