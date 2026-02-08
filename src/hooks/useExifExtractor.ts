// useExifExtractor Hook
// Robust EXIF extraction: Tries native HEIC parsing first, then falls back to conversion

'use client';

import { useState, useCallback, useMemo } from 'react';
// @ts-expect-error - tz-lookup lacks typings
import tz from 'tz-lookup';

// App version for deployment verification
export const APP_VERSION = 'v1.3.9';

const IS_DEV = process.env.NODE_ENV === 'development';
import { clientLogger } from '@/lib/clientLogger';

const LOG_PREFIX = '[ExifExtractor]';

// Safe Logger Wrapper
const logger = {
    log: (msg: string, ...args: unknown[]) => IS_DEV && console.log(`${LOG_PREFIX} ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => IS_DEV && console.warn(`${LOG_PREFIX} ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [
        config.allowGpsExtraction,
        config.allowedTypes,
        config.maxFileSizeMB,
        config.uploadTimeoutMs
    ]);

    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Security: Validate file before processing
    const validateFile = useCallback((file: File): string | null => {
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
    }, [finalConfig.allowedTypes, finalConfig.maxFileSizeMB]);

    // Helper to process EXIF data into our format
    const processExif = useCallback((exifData: Record<string, unknown>, fileName: string): ExifResult => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exif = exifData as any;

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
                    const d = new Date(dateValue);

                    if (timezone) {
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
            dateTaken,
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

    const extractExif = useCallback(async (file: File): Promise<ExifResult> => {
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
                gps: finalConfig.allowGpsExtraction,
                ifd0: false,
                xmp: false,
                icc: false,
                mergeOutput: true,
            } as Record<string, unknown>);

            if (exif) {
                logger.log('Native parsing successful');
                return processExif(exif, file.name);
            }
        } catch (nativeError) {
            logger.warn('Native parsing failed:', nativeError);
        }

        // 3. Server-Side Fallback (Robustness)
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
                throw new Error(`Server API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                logger.log('Server parsing successful');
                return processExif(result.data, file.name);
            }
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                return { success: false, data: null, error: '서버 응답 시간이 초과되었습니다.', fileName: file.name };
            }
            logger.error('Server fallback error:', err);
        } finally {
            clearTimeout(timeoutId);
        }

        return {
            success: false,
            data: null,
            error: '정보를 읽을 수 없습니다.',
            fileName: file.name,
        };
    }, [finalConfig.allowGpsExtraction, finalConfig.uploadTimeoutMs, processExif, validateFile]);

    const extractFromFiles = useCallback(async (files: File[]): Promise<ExifResult[]> => {
        if (!files || files.length === 0) return [];

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
        } catch (err: unknown) {
            logger.error('Extraction loop error:', err);
            setError('일부 파일 처리 중 오류가 발생했습니다.');
        } finally {
            setIsExtracting(false);
        }

        return results;
    }, [extractExif]);

    return {
        extractFromFiles,
        isExtracting,
        progress,
        error,
    };
}
