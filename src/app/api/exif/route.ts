import { NextRequest, NextResponse } from 'next/server';
import exifr from 'exifr';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`[API] Extracting EXIF from: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse EXIF data using exifr in Node.js environment (more robust for HEIC)
        const exif = await exifr.parse(buffer, {
            tiff: true,
            exif: true,
            gps: true,
        });

        if (!exif) {
            return NextResponse.json({ error: 'No EXIF data found' }, { status: 404 });
        }

        // Extract GPS coordinates
        let gpsLat: number | null = null;
        let gpsLng: number | null = null;

        try {
            // Need to pass buffer again for gps extraction if not found in first parse
            // But exifr.parse with gps:true usually returns latitude/longitude in the result object
            if (exif.latitude && exif.longitude) {
                gpsLat = exif.latitude;
                gpsLng = exif.longitude;
            } else {
                // Try dedicated GPS extraction if main parse didn't return it structured
                const gps = await exifr.gps(buffer);
                if (gps) {
                    gpsLat = gps.latitude;
                    gpsLng = gps.longitude;
                }
            }
        } catch (gpsError) {
            console.error('GPS specific extraction failed:', gpsError);
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
