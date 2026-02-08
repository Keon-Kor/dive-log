// Weather API Route
// Proxies requests to OpenWeatherMap (keeps API key server-side)

import { NextRequest, NextResponse } from 'next/server';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
        return NextResponse.json(
            { error: 'Missing lat or lng parameter' },
            { status: 400 }
        );
    }

    if (!OPENWEATHER_API_KEY) {
        // Return mock data if no API key configured
        return NextResponse.json({
            condition: 'Clear',
            airTemperature: 25,
            windSpeed: 5,
            visibility: 'Good',
            humidity: 60,
            pressure: 1013,
        });
    }

    try {
        const response = await fetch(
            `${OPENWEATHER_URL}?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            condition: data.weather?.[0]?.main || 'Unknown',
            airTemperature: Math.round(data.main?.temp || 0),
            windSpeed: Math.round(data.wind?.speed || 0),
            visibility: data.visibility ? `${data.visibility / 1000}km` : 'Unknown',
            humidity: data.main?.humidity || 0,
            pressure: data.main?.pressure || 0,
        });
    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
