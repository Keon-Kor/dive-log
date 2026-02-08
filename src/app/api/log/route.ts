
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { level, message, component, data, url, userAgent } = body;

        // Sanitize: ensure no massive data blobs
        const safeData = JSON.stringify(data).slice(0, 2000); // Truncate large data

        // Server-side Log Format (Structured nicely for Vercel/CloudWatch)
        // [Client-Error] [Component] Message | URL | UA | Data
        const logContent = `[Client-${level.toUpperCase()}] [${component || 'Unknown'}] ${message} | URL: ${url} | UA: ${userAgent} | Data: ${safeData}`;

        if (level === 'error') {
            console.error(logContent);
        } else if (level === 'warn') {
            console.warn(logContent);
        } else {
            console.log(logContent);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // Fallback
        console.error('Logging API Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
