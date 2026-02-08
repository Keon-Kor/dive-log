// useExifExtractor Hook
// Robust EXIF extraction: Tries native HEIC parsing first, then falls back to conversion

'use client';

import { useState, useCallback } from 'react';
// @ts-ignore
import tz from 'tz-lookup';

// App version for deployment verification
export const APP_VERSION = 'v1.3.9';

const IS_DEV = process.env.NODE_ENV === 'development';
import { clientLogger } from '@/lib/clientLogger';

const LOG_PREFIX = '[ExifExtractor]';

// Safe Logger Wrapper
const logger = {
    log: (msg: string, ...args: any[]) => IS_DEV && console.log(`${LOG_PREFIX} ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => IS_DEV && console.warn(`${LOG_PREFIX} ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => {
        // Log to console in dev
        if (IS_DEV) console.error(`${LOG_PREFIX} ${msg}`, ...args);
        // Send to server in production
        clientLogger.error(msg, args[0], 'ExifExtractor');
    },
};

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

// Configuration options for the hook
export interface UseExifExtractorConfig {
    allowGpsExtraction?: boolean; // Default: false (Privacy First)
    maxFileSizeMB?: number;       // Default: 20MB
    allowedTypes?: string[];      // Whitelist
    uploadTimeoutMs?: number;     // Default: 15000ms
}

const DEFAULT_CONFIG: Required<UseExifExtractorConfig> = {
    allowGpsExtraction: false,
    maxFileSizeMB: 20,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
    uploadTimeoutMs: 15000,
};

export function useExifExtractor(config: UseExifExtractorConfig = {}): UseExifExtractorReturn {
    // Merge validation config
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Security: Validate file before processing
    const validateFile = (file: File): string | null => {
        // 1. Type Check (Whitelist)
        // Check both MIME type and extension for robustness
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        // HEIC often has empty type or specific types
        const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
        const isValidType = finalConfig.allowedTypes.includes(fileType) || isHeic; // Broaden check for HEIC if needed

        if (!isValidType) {
            return `지원하지 않는 파일 형식입니다. (${file.type})`;
        }

        // 2. Size Check
        const maxBytes = finalConfig.maxFileSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return `파일 크기가 너무 큽니다. (최대 ${finalConfig.maxFileSizeMB}MB)`;
        }

        return null;
    };

    // Helper to process EXIF data into our format
    const processExif = useCallback((exif: any, fileName: string): ExifResult => {
        // Extract GPS coordinates ONLY if allowed
        let gpsLat: number | null = null;
        let gpsLng: number | null = null;

        if (finalConfig.allowGpsExtraction) {
            if (exif.latitude && exif.longitude) {
                gpsLat = exif.latitude;
                gpsLng = exif.longitude;
            } else if (exif.gpsLat && exif.gpsLng) {
                // Handle pre-processed server response structure
                gpsLat = exif.gpsLat;
                gpsLng = exif.gpsLng;
            }
        }

        // Get date
        let dateTaken: string | null = null;
        let timezone: string | null = null;

        // timezone lookup
        if (gpsLat && gpsLng) {
            try {
                timezone = tz(gpsLat, gpsLng);
                logger.log('Timezone identified:', timezone);
            } catch (e) {
                logger.warn('Timezone lookup failed:', e);
            }
        }

        // Prioritize original date
        // Note: exif.DateTimeOriginal is usually "Camera Clock Time".
        // If we have GPS timestamp (UTC), we could calculate exact local time,
        // but often Camera Time is what users expect if they updated their clock.
        // HOWEVER, if the user says "It shows invalid time (my home time)", it means
        // the date object is being converted to browser time.
        // We should store the "Date String" as is, OR strictly use GPS UTC.

        // Strategy: Use GPS Date/Time if available (as UTC), then convert to Local Time of that location.
        // If not, fall back to DateTimeOriginal (Camera Time).

        const gpsDate = exif.GPSDateStamp; // "2023:01:01" or "2023-01-01"
        const gpsTime = exif.GPSTimeStamp; // [h, m, s] or string

        if (timezone && gpsDate && gpsTime) {
            try {
                // Parse GPS UTC time
                // Format: YYYY:MM:DD and [H, M, S]
                let year, month, day;
                if (typeof gpsDate === 'string') {
                    const parts = gpsDate.replace(/:/g, '-').split('-');
                    year = parseInt(parts[0]);
                    month = parseInt(parts[1]) - 1;
                    day = parseInt(parts[2]);
                }

                let hour, minute, second;
                if (Array.isArray(gpsTime)) {
                    hour = gpsTime[0];
                    minute = gpsTime[1];
                    second = gpsTime[2];
                } else if (typeof gpsTime === 'string') {
                    const parts = gpsTime.split(':');
                    hour = parseInt(parts[0]);
                    minute = parseInt(parts[1]);
                    second = parseInt(parts[2]);
                }

                if (year && hour !== undefined) {
                    // Create UTC Date
                    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));

                    // Convert to Target Timezone using native toLocaleString
                    // sv-SE gives ISO-like format YYYY-MM-DD hh:mm:ss
                    dateTaken = utcDate.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
                    logger.log('Date calculated from GPS UTC:', dateTaken, 'Timezone:', timezone);
                }
            } catch (e) {
                logger.warn('GPS Time parsing failed:', e);
            }
        }

        // Fallback to Wall Clock time (DateTimeOriginal)
        if (!dateTaken) {
            const dateValue = exif.dateTaken || exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
            if (dateValue) {
                try {
                    // Critical Fix: If it's a Date object, exifr might have already shifted it to browser timezone!
                    // Convert it back to localized ISO string without using toISOString() which shifts to UTC.
                    const d = new Date(dateValue);

                    if (timezone) {
                        // If we have timezone but GPS time was missing, 
                        // attempt to show wall clock time as it appeared in the camera, 
                        // but specifically NOT shifted by browser timezone.
                        // sv-SE + timezone option is the most reliable way to say "treat this UTC-less date as TARGET-TZ local".
                        dateTaken = d.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
                        logger.log('Date calculated from Wall Clock + Timezone:', dateTaken);
                    } else {
                        dateTaken = d.toLocaleString('sv-SE').replace(' ', 'T');
                        logger.log('Date parsed from Wall Clock (Fallback to Browser TZ):', dateTaken);
                    }
                } catch {
                    logger.warn('Date parsing failed for:', dateValue);
                }
            }
        }

        const data: ExifData = {
            dateTaken, // Now strictly YYYY-MM-DDTHH:mm:ss (Wall Clock)
            gpsLat,
            gpsLng,
            camera: exif.camera || exif.Model || null,
            lens: exif.lens || exif.LensModel || null,
            make: exif.make || exif.Make || null,
            model: exif.model || exif.Model || null,
        };

        return {
            success: true,
            data,
            error: null,
            fileName,
        };
    }, [finalConfig.allowGpsExtraction]);

    const extractExif = async (file: File): Promise<ExifResult> => {
        // 1. Validation
        const validationError = validateFile(file);
        if (validationError) {
            logger.warn(`Validation failed for ${file.name}: ${validationError}`);
            return { success: false, data: null, error: validationError, fileName: file.name };
        }

        logger.log(`Extracting EXIF from: ${file.name}`);

        // 2. Try native parsing first
        try {
            const arrayBuffer = await file.arrayBuffer();

            // Dynamic import to avoid SSR issues
            const exifrModule = await import('exifr/dist/full.esm.mjs');
            const exifr = exifrModule.default;

            // Only parse what we need for performance & privacy
            const exif = await exifr.parse(arrayBuffer, {
                tiff: true,
                exif: true,
                gps: finalConfig.allowGpsExtraction, // Opt-in at parsing level
                ifd0: false, // Performance optimization
                xmp: false,
                icc: false,
                // HEIC specific:
                mergeOutput: true,
            } as any);

            if (exif) {
                logger.log('Native parsing successful');
                return processExif(exif, file.name);
            }
        } catch (nativeError) {
            logger.warn('Native parsing failed:', nativeError);
        }

        // 3. Server-Side Fallback (Robustness)
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.uploadTimeoutMs);

        try {
            logger.log('Attempting server-side fallback...');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/exif', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            if (!response.ok) {
                // Mask detailed server errors in UI, log them in dev
                throw new Error(`Server API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                logger.log('Server parsing successful');
                // processExif handles filtering, but server response format matches ExifData
                return processExif(result.data, file.name);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return { success: false, data: null, error: '서버 응답 시간이 초과되었습니다.', fileName: file.name };
            }
            logger.error('Server fallback error:', error);
        } finally {
            clearTimeout(timeoutId);
        }

        return {
            success: false,
            data: null,
            error: '정보를 읽을 수 없습니다.',
            fileName: file.name,
        };
    };

    const extractFromFiles = useCallback(async (files: File[]): Promise<ExifResult[]> => {
        if (!files || files.length === 0) return [];

        setIsExtracting(true);
        setProgress(0);
        setError(null);

        const results: ExifResult[] = [];

        try {
            // Process sequentially to avoid overwhelming browser/server
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const result = await extractExif(file);
                results.push(result);
                setProgress(((i + 1) / files.length) * 100);
            }
        } catch (err: any) {
            logger.error('Extraction loop error:', err);
            setError('일부 파일 처리 중 오류가 발생했습니다.');
        } finally {
            setIsExtracting(false);
        }

        return results;
    }, [finalConfig]); // Re-create if config changes

    return {
        extractFromFiles,
        isExtracting,
        progress,
        error,
    };
}
