// useExifExtractor Hook
// Direct EXIF extraction without Web Worker (more reliable in production)

'use client';

import { useState, useCallback } from 'react';
import exifr from 'exifr';

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

export function useExifExtractor(): UseExifExtractorReturn {
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const extractExif = async (file: File): Promise<ExifResult> => {
        try {
            console.log('Extracting EXIF from:', file.name, file.type);

            // Parse EXIF data - use full file for better compatibility
            const exif = await exifr.parse(file, {
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
                const gps = await exifr.gps(file);
                console.log('GPS result:', gps);
                if (gps) {
                    gpsLat = gps.latitude;
                    gpsLng = gps.longitude;
                }
            } catch (gpsError) {
                console.log('GPS extraction failed:', gpsError);
            }

            // Get date - try multiple fields
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
