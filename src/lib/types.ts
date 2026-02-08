// Dive Log Types and Interfaces

export interface DiveLog {
    id: string;
    userId: string;

    // Auto-extracted from EXIF
    date: string;          // ISO date
    timeIn: string;        // from earliest photo
    timeOut?: string;      // from latest photo (if multiple)
    gpsLat: number;
    gpsLng: number;

    // Auto-resolved from APIs
    locationName: string;  // reverse geocoded
    diveSiteName?: string; // matched known dive site
    country: string;

    // Weather (auto-fetched)
    weatherCondition: string;
    airTemperature: number;
    windSpeed: number;
    visibility: string;
    seaTemperature: number;

    // User-editable fields
    maxDepth?: number;
    bottomTime?: number;
    buddy?: string;
    notes?: string;
    rating?: number;       // 1-5 stars

    // Photos
    photos: DivePhoto[];

    // Metadata
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    isSynced: boolean;     // For offline support
}

export interface DivePhoto {
    id: string;
    thumbnailUrl: string;
    originalUrl?: string;
    exifData: {
        dateTaken: string;
        gpsLat: number;
        gpsLng: number;
        camera?: string;
        lens?: string;
    };
}

export interface DiveSite {
    id: string;
    name: string;
    gpsLat: number;
    gpsLng: number;
    country: string;
    region: string;
    depthRange: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    description: string;
    avgTemperature?: number;
    totalLogs: number;
}

export interface WeatherData {
    condition: string;
    airTemperature: number;
    windSpeed: number;
    visibility: string;
    humidity: number;
    pressure: number;
}

export interface OceanData {
    seaTemperature: number;
    waveHeight?: number;
    swellDirection?: string;
}

export interface GeocodingResult {
    locationName: string;
    country: string;
    region?: string;
    city?: string;
}

// Form types for creating/editing dive logs
export interface DiveLogFormData {
    date: string;
    timeIn: string;
    timeOut?: string;
    gpsLat: number;
    gpsLng: number;
    locationName: string;
    diveSiteName?: string;
    country: string;
    maxDepth?: number;
    bottomTime?: number;
    buddy?: string;
    notes?: string;
    rating?: number;
    isPublic: boolean;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
