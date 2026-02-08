// Reverse Geocoding Client
// Converts GPS coordinates to location names using Nominatim (OpenStreetMap)

import { GeocodingResult, ApiResponse } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<ApiResponse<GeocodingResult>> {
    try {
        const response = await fetch(
            `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&accept-language=ko,en`,
            {
                headers: {
                    'User-Agent': 'DiveLog-App/1.0',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data = await response.json();

        const result: GeocodingResult = {
            locationName: data.display_name || 'Unknown Location',
            country: data.address?.country || 'Unknown',
            region: data.address?.state || data.address?.province,
            city: data.address?.city || data.address?.town || data.address?.village,
        };

        return { success: true, data: result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geocoding failed',
        };
    }
}

// Get simplified location name (city, country format)
export function formatLocationName(result: GeocodingResult): string {
    const parts: string[] = [];

    if (result.city) {
        parts.push(result.city);
    } else if (result.region) {
        parts.push(result.region);
    }

    if (result.country) {
        parts.push(result.country);
    }

    return parts.join(', ') || result.locationName;
}
