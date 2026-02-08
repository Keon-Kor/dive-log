// EXIF extraction Web Worker
// Uses exifr library to extract GPS, date/time, and camera information from photos
// Optimized to read only first 128KB of each file (EXIF data is in file header)

import * as Comlink from 'comlink';
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

const exifWorker = {
    async extractExif(file: File): Promise<ExifResult> {
        try {
            // For HEIC files, read the entire file as they store EXIF differently
            const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
            const fileData = isHeic ? file : file.slice(0, 131072);

            // Parse EXIF data with expanded options for HEIC support
            const exif = await exifr.parse(fileData, {
                tiff: true,
                exif: true,
                gps: true,
            });

            if (!exif) {
                return {
                    success: false,
                    data: null,
                    error: 'No EXIF data found',
                    fileName: file.name,
                };
            }

            // Extract GPS coordinates using exifr's built-in GPS method
            let gpsLat: number | null = null;
            let gpsLng: number | null = null;

            try {
                const gps = await exifr.gps(fileData);
                if (gps) {
                    gpsLat = gps.latitude;
                    gpsLng = gps.longitude;
                }
            } catch {
                // GPS data not available
            }

            const data: ExifData = {
                dateTaken: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null,
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
                fileName: file.name,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                fileName: file.name,
            };
        }
    },

    async extractMultiple(files: File[]): Promise<ExifResult[]> {
        const results: ExifResult[] = [];
        for (const file of files) {
            const result = await this.extractExif(file);
            results.push(result);
        }
        return results;
    },
};

Comlink.expose(exifWorker);

export type ExifWorker = typeof exifWorker;
