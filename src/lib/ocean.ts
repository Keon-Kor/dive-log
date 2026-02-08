// Ocean/Sea Temperature API Client
// Uses Open-Meteo Marine API (free, no API key required)

import { OceanData, ApiResponse } from './types';

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

export async function getOceanData(
    lat: number,
    lng: number,
    date?: string // ISO date string
): Promise<ApiResponse<OceanData>> {
    try {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lng.toString(),
            hourly: 'sea_surface_temperature,wave_height,swell_wave_direction',
        });

        // If date is provided, use it for historical data
        if (date) {
            params.append('start_date', date);
            params.append('end_date', date);
        }

        const response = await fetch(`${OPEN_METEO_MARINE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Ocean API failed: ${response.status}`);
        }

        const data = await response.json();

        // Get the first available data point
        const hourlyData = data.hourly;
        const seaTemp = hourlyData?.sea_surface_temperature?.[12] || // Noon data
            hourlyData?.sea_surface_temperature?.[0] ||
            null;
        const waveHeight = hourlyData?.wave_height?.[12] ||
            hourlyData?.wave_height?.[0] ||
            null;

        const result: OceanData = {
            seaTemperature: seaTemp,
            waveHeight: waveHeight,
        };

        return { success: true, data: result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Ocean data fetch failed',
        };
    }
}

// Format sea temperature for display
export function formatSeaTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
    if (unit === 'F') {
        return `${Math.round(temp * 9 / 5 + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
}
