import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import exifr from 'exifr';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    console.log('[API Start] /api/exif POST received');
    try {
        // 1. Check FormData parsing
        let formData;
        try {
            formData = await request.formData();
        } catch (e: any) {
            console.error('[API Error] FormData parsing failed:', e);
            throw new Error(`FormData parsing failed: ${e.message}`);
        }

        const file = formData.get('file') as File;
        if (!file) throw new Error('No file provided in form data');

        console.log(`[API] File received: ${file.name} (${file.type}, ${file.size} bytes)`);

        // 2. Buffer creation
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[API] Buffer created: ${buffer.length} bytes`);

        // 3. Sharp Metadata Extraction
        console.log('[API] Calling sharp(buffer).metadata()...');
        let metadata;
        try {
            metadata = await sharp(buffer).metadata();
        } catch (e: any) {
            console.error('[API Error] Sharp metadata extraction failed:', e);
            // Specific handling for unsupported format
            if (e.message.includes('heif') || e.message.includes('heic') || e.message.includes('unsupported')) {
                console.error('[API Critical] HEIC format might not be supported in this environment');
                return NextResponse.json({ error: 'heic_not_supported', details: e.message }, { status: 500 });
            }
            throw e;
        }

        console.log('[API] Sharp metadata success:', {
            format: metadata.format,
            size: metadata.size,
            hasExif: !!metadata.exif
        });

        if (!metadata.exif) {
            console.warn('[API Warning] No EXIF buffer found in image');
            return NextResponse.json({ error: 'No EXIF data found' }, { status: 404 });
        }

        console.log(`[API] EXIF buffer found: ${metadata.exif.length} bytes`);

        let exifBuffer = metadata.exif;
        // Sharp returns EXIF with 'Exif\0\0' header (6 bytes). We need to strip it for exifr/tiff parsers.
        if (exifBuffer.toString('ascii', 0, 6) === 'Exif\0\0') {
            console.log('[API] Stripping "Exif\\0\\0" header from buffer...');
            exifBuffer = exifBuffer.subarray(6);
        }

        // 4. Exifr Parsing
        // We MUST specify tiff: true because we are passing a raw EXIF buffer (TIFF structure), not a file with headers.
        console.log('[API] Parsing EXIF buffer with exifr (TIFF mode)...');
        const exif = await exifr.parse(exifBuffer, {
            tiff: true,
            exif: true,
            gps: true,
        });
        console.log('[API] exifr parse result:', exif ? 'Success' : 'Null');

        if (!exif) {
            return NextResponse.json({ error: 'Failed to parse EXIF buffer' }, { status: 404 });
        }

        // 5. Data Extraction
        let gpsLat: number | null = null;
        let gpsLng: number | null = null;

        if (exif.latitude && exif.longitude) {
            gpsLat = exif.latitude;
            gpsLng = exif.longitude;
        }

        let dateTaken: string | null = null;
        const dateValue = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
        if (dateValue) {
            try {
                dateTaken = new Date(dateValue).toISOString();
            } catch {
                console.log('Date parsing failed:', dateValue);
            }
        }

        const data = {
            dateTaken,
            gpsLat,
            gpsLng,
            camera: exif.Model || null,
            lens: exif.LensModel || null,
            make: exif.Make || null,
            model: exif.Model || null,
        };

        console.log('[API Success] Returning data');
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[API Critical Error] Stack:', error.stack);
        return NextResponse.json(
            { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
            { status: 500 }
        );
    }
}
