
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { DiveLog } from '@/lib/types';

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
    // Note: We are doing a best-effort mapping here.
    // If fields are missing in DB, they will be undefined.
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
        tempAvg: logData.temp_avg || logData.sea_temperature, // Map sea_temperature to tempAvg if needed

        // Tank/Gas (might be missing in old schema)
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
        visibility: parseFloat(logData.visibility) || 0, // visibility might be string in DB
        weather: logData.weather || logData.weather_condition,
        current: logData.current,
        wave: logData.wave,
        wind: logData.wind,
        entryMethod: logData.entry_method,

        // Equipment (Likely JSON or missing)
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

    return {
        title: `${log.diveSiteName} - Dive Log`,
        description: `Dive log from ${log.date} at ${log.diveSiteName}`,
    };
}

export default async function LogPage({ params }: PageProps) {
    const log = await getLog(params.id);

    if (!log) {
        notFound();
    }

    // Helper to format time
    const formatTime = (time: string) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    return (
        <div className="min-h-screen pb-8 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-white/10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-medium">All Logs</span>
                    </Link>
                    <div className="font-semibold">{log.date}</div>
                    <div className="w-20"></div> {/* Spacer for centering */}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Hero / Site Info */}
                <section className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                    <h1 className="text-2xl font-bold mb-1">{log.diveSiteName}</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <span>📍 {log.country || 'Unknown Location'}</span>
                        {log.gpsLat && log.gpsLng && (
                            <a
                                href={`https://www.google.com/maps?q=${log.gpsLat},${log.gpsLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline"
                            >
                                Map
                            </a>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                            <div className="text-slate-400 text-xs mb-1">Max Depth</div>
                            <div className="text-2xl font-bold text-cyan-400">
                                {log.maxDepth}<span className="text-sm font-normal text-slate-400">m</span>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                            <div className="text-slate-400 text-xs mb-1">Dive Time</div>
                            <div className="text-2xl font-bold text-cyan-400">
                                {log.divingTime}<span className="text-sm font-normal text-slate-400">min</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Photos */}
                {log.photos && log.photos.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span>📸</span> Photos
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.photos.map((photo) => (
                                <div key={photo.id} className="aspect-square relative rounded-xl overflow-hidden bg-slate-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo.thumbnailUrl}
                                        alt="Dive photo"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Dive Details Grid */}
                <section className="bg-slate-800/30 rounded-2xl p-6 border border-white/5 space-y-6">
                    {/* Time */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Time</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">In</div>
                                <div className="font-mono">{formatTime(log.timeStart)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Out</div>
                                <div className="font-mono">{formatTime(log.timeEnd)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Surface</div>
                                <div className="font-mono">{log.surfaceInterval || '-'} min</div>
                            </div>
                        </div>
                    </div>

                    {/* Conditions */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Conditions</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Temp</div>
                                <div>{log.tempAvg || '-'}°C</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Vis</div>
                                <div>{log.visibility || '-'}m</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Weather</div>
                                <div className="capitalize">{log.weather?.replace('_', ' ') || '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Current</div>
                                <div className="capitalize">{log.current || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Equipment */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Gear</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Suit</div>
                                <div>{log.equipment?.suit || log.equipment?.undersuit || '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Tank</div>
                                <div className="capitalize">
                                    {log.tankMaterial || '-'} / {log.gasMix}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Weight</div>
                                <div>{(log.weightBelt || 0) + (log.weightPocket || 0)} kg</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Gas</div>
                                <div>{log.pressureStart || '-'} → {log.pressureEnd || '-'} bar</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notes */}
                {log.notes && (
                    <section className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                        <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Notes</h3>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {log.notes}
                        </p>
                    </section>
                )}

                {/* Team */}
                {(log.buddy || log.instructor || log.guide) && (
                    <section className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Team</h3>
                        <div className="space-y-2">
                            {log.buddy && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Buddy</span>
                                    <span>{log.buddy}</span>
                                </div>
                            )}
                            {log.guide && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Guide</span>
                                    <span>{log.guide}</span>
                                </div>
                            )}
                            {log.instructor && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Instructor</span>
                                    <span>{log.instructor}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
