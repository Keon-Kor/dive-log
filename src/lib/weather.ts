// Weather API Client
// Fetches weather data from OpenWeatherMap

import { WeatherData, ApiResponse } from './types';

export async function getWeather(
    lat: number,
    lng: number,
    date?: string // ISO date string for historical data
): Promise<ApiResponse<WeatherData>> {
    try {
        // Use our API route to proxy the request (keeps API key server-side)
        const params = new URLSearchParams({
            lat: lat.toString(),
            lng: lng.toString(),
        });

        if (date) {
            params.append('date', date);
        }

        const response = await fetch(`/api/weather?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Weather API failed: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data: data as WeatherData };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Weather fetch failed',
        };
    }
}

// Weather condition translation (for display)
export const weatherConditionMap: Record<string, { ko: string; en: string }> = {
    'Clear': { ko: '맑음', en: 'Clear' },
    'Clouds': { ko: '흐림', en: 'Cloudy' },
    'Rain': { ko: '비', en: 'Rain' },
    'Drizzle': { ko: '이슬비', en: 'Drizzle' },
    'Thunderstorm': { ko: '뇌우', en: 'Thunderstorm' },
    'Snow': { ko: '눈', en: 'Snow' },
    'Mist': { ko: '안개', en: 'Mist' },
    'Fog': { ko: '짙은 안개', en: 'Fog' },
};

export function translateWeather(condition: string, locale: 'ko' | 'en' = 'ko'): string {
    return weatherConditionMap[condition]?.[locale] || condition;
}
