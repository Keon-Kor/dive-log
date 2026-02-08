import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { DiveLog } from '@/lib/types';
import { LogDetailContent } from '@/components/LogDetailContent';

// Force dynamic rendering since we rely on DB data
export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        id: string;
    };
}

// Fetch log data from Supabase
async function getLog(id: string) {
    const { data: logData, error } = await supabase
        .from('dive_logs')
        .select(`
            *,
            dive_photos (*)
        `)
        .eq('id', id)
        .single();

    if (error || !logData) {
        return null;
    }

    // Transform DB snake_case to app camelCase
    const log: DiveLog = {
        id: logData.id,
        date: logData.date,
        diveSiteName: logData.dive_site_name || logData.location_name || 'Unknown Site',
        gpsLat: logData.gps_lat,
        gpsLng: logData.gps_lng,
        country: logData.country,

        // Time
        surfaceInterval: logData.surface_interval,
        divingTime: logData.diving_time || logData.bottom_time || 0,
        timeStart: logData.time_start || logData.time_in || '',
        timeEnd: logData.time_end || logData.time_out || '',

        // Depth & Temp
        maxDepth: logData.max_depth || 0,
        avgDepth: logData.avg_depth,
        tempMin: logData.temp_min,
        tempMax: logData.temp_max,
        tempAvg: logData.temp_avg || logData.sea_temperature,

        // Tank/Gas
        tankMaterial: logData.tank_material,
        tankConfig: logData.tank_config,
        gasMix: logData.gas_mix || 'air',
        nitroxPercent: logData.nitrox_percent,
        pressureStart: logData.pressure_start,
        pressureEnd: logData.pressure_end,

        // Weight
        weightBelt: logData.weight_belt,
        weightPocket: logData.weight_pocket,

        // Conditions
        visibility: parseFloat(logData.visibility) || 0,
        weather: logData.weather || logData.weather_condition,
        current: logData.current,
        wave: logData.wave,
        wind: logData.wind,
        entryMethod: logData.entry_method,

        // Equipment
        equipment: logData.equipment || {},

        // Team
        instructor: logData.instructor,
        buddy: logData.buddy,
        guide: logData.guide,

        notes: logData.notes,
        isPublic: logData.is_public,
        createdAt: logData.created_at,
        updatedAt: logData.updated_at,
        isSynced: true,

        // Photos
        photos: logData.dive_photos?.map((p: any) => ({
            id: p.id,
            thumbnailUrl: p.thumbnail_url,
            exifExtracted: true,
        })) || [],
    };

    return log;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const log = await getLog(params.id);

    if (!log) {
        return {
            title: 'Log Not Found - Dive Log',
        };
    }

    const title = `${log.diveSiteName} | DiveSnap`;
    const description = `${log.date} • Max ${log.maxDepth}m • ${log.divingTime}min • ${log.weather || 'Good'}`;
    const images = (log.photos && log.photos.length > 0 && log.photos[0].thumbnailUrl)
        ? [{ url: log.photos[0].thumbnailUrl, width: 800, height: 600 }]
        : [];

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images,
        },
    };
}

export default async function LogPage({ params }: PageProps) {
    const log = await getLog(params.id);

    if (!log) {
        notFound();
    }

    return <LogDetailContent log={log} />;
}
