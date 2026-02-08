// Dive Site Matching Library
// Matches GPS coordinates to known dive sites using Haversine distance

import diveSitesData from '@/data/dive-sites.json';

export interface DiveSite {
    id: string;
    name: string;
    nameLocal?: string;
    lat: number;
    lng: number;
    country: string;
    region: string;
    maxDepth?: number;
    features?: string[];
}

export interface MatchResult {
    site: DiveSite;
    distance: number; // in meters
}

// Load dive sites from JSON
const diveSites: DiveSite[] = diveSitesData as DiveSite[];

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
function haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Find the closest dive site to given GPS coordinates
 * @param lat Latitude
 * @param lng Longitude
 * @param maxDistance Maximum distance in meters (default: 5km)
 * @returns Matched site or null if no site within maxDistance
 */
export function findNearestDiveSite(
    lat: number,
    lng: number,
    maxDistance: number = 5000
): MatchResult | null {
    let closest: MatchResult | null = null;

    for (const site of diveSites) {
        const distance = haversineDistance(lat, lng, site.lat, site.lng);

        if (distance <= maxDistance) {
            if (!closest || distance < closest.distance) {
                closest = { site, distance };
            }
        }
    }

    return closest;
}

/**
 * Find all dive sites within a given radius
 * @param lat Latitude
 * @param lng Longitude
 * @param radius Radius in meters
 * @returns Array of matched sites sorted by distance
 */
export function findDiveSitesNearby(
    lat: number,
    lng: number,
    radius: number = 50000 // 50km default
): MatchResult[] {
    const results: MatchResult[] = [];

    for (const site of diveSites) {
        const distance = haversineDistance(lat, lng, site.lat, site.lng);

        if (distance <= radius) {
            results.push({ site, distance });
        }
    }

    // Sort by distance
    return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Search dive sites by name (fuzzy match)
 * @param query Search query
 * @returns Matching sites
 */
export function searchDiveSites(query: string): DiveSite[] {
    const lowerQuery = query.toLowerCase();

    return diveSites.filter(
        (site) =>
            site.name.toLowerCase().includes(lowerQuery) ||
            site.nameLocal?.toLowerCase().includes(lowerQuery) ||
            site.country.toLowerCase().includes(lowerQuery) ||
            site.region.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get all dive sites by country
 * @param country Country name
 * @returns Sites in that country
 */
export function getDiveSitesByCountry(country: string): DiveSite[] {
    return diveSites.filter(
        (site) => site.country.toLowerCase() === country.toLowerCase()
    );
}

/**
 * Get all available countries with dive sites
 */
export function getAvailableCountries(): string[] {
    const countries = new Set(diveSites.map((site) => site.country));
    return Array.from(countries).sort();
}

/**
 * Get all dive sites
 */
export function getAllDiveSites(): DiveSite[] {
    return [...diveSites];
}
