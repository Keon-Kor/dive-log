import fs from 'fs';
import { Blob } from 'buffer';

const FILE_PATH = 'C:/Users/keonh/02_Antigravity/dive-log/IMG_3454.HEIC';
const API_URL = 'http://localhost:3000/api/exif';

async function runTest() {
    console.log('Reading file:', FILE_PATH);

    if (!fs.existsSync(FILE_PATH)) {
        console.error('File not found!');
        process.exit(1);
    }

    const buffer = fs.readFileSync(FILE_PATH);
    console.log(`File size: ${buffer.length} bytes`);

    const blob = new Blob([buffer], { type: 'image/heic' });
    const formData = new FormData();
    formData.append('file', blob, 'IMG_3454.HEIC');

    console.log('Sending request to:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
        });

        console.log('Response Status:', response.status);

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log('✅ TEST PASSED: EXIF extracted successfully!');
            // Check for specific fields
            if (data.data.gpsLat) console.log('   - GPS Lat found:', data.data.gpsLat);
            if (data.data.dateTaken) console.log('   - Date found:', data.data.dateTaken);
        } else {
            console.error('❌ TEST FAILED: API returned error or success:false');
        }

    } catch (error) {
        console.error('❌ TEST ERROR:', error);
    }
}

runTest();
