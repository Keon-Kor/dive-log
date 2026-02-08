import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import exifr from 'exifr';

// Force Node.js runtime (Vercel default is usually nodejs for APIs, but good to be explicit for Sharp)
export const runtime = 'nodejs';
// Increase body size limit if needed (Next.js default is 4MB, sufficient for photos? check config)
// export const config = { api: { bodyParser: false } }; // We use formData(), so let Next handle it.

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`[API v1.3.1] Extracting EXIF from: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // STRATEGY: Use Sharp to read metadata ONLY (Lightweight).
        // Sharp uses libvips which parses HEIC/Exif efficiently without full image decoding.
        const metadata = await sharp(buffer).metadata();

        if (!metadata.exif) {
            console.log('Sharp found no EXIF buffer');
            return NextResponse.json({ error: 'No EXIF data found' }, { status: 404 });
        }

        // Parse the EXIF buffer using exifr
        // exifr can parse raw EXIF buffers (TIFF segment)
        const exif = await exifr.parse(metadata.exif, {
            tiff: true,
            exif: true,
            gps: true,
        });

        if (!exif) {
            return NextResponse.json({ error: 'Failed to parse EXIF buffer' }, { status: 404 });
        }

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

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Server-side EXIF extraction error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Server error' },
            { status: 500 }
        );
    }
}
