// useDiveLog Hook - Redesigned for Logbook Format
// CRUD operations for dive logs with offline support

'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DiveLog, DiveLogFormData, DivePhoto } from '@/lib/types';
import {
    saveDiveLogLocal,
    getAllDiveLogsLocal,
    getDiveLogLocal,
    deleteDiveLogLocal,
    addPendingUpload,
    isOnline,
} from '@/lib/offline';
import { supabase } from '@/lib/supabase';

interface UseDiveLogReturn {
    logs: DiveLog[];
    isLoading: boolean;
    error: string | null;
    fetchLogs: () => Promise<void>;
    createLog: (data: DiveLogFormData, photos?: DivePhoto[]) => Promise<DiveLog | null>;
    updateLog: (id: string, data: Partial<DiveLogFormData>) => Promise<boolean>;
    deleteLog: (id: string) => Promise<boolean>;
    getLog: (id: string) => Promise<DiveLog | null>;
}

export function useDiveLog(): UseDiveLogReturn {
    const [logs, setLogs] = useState<DiveLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // First, get local logs
            const localLogs = await getAllDiveLogsLocal();
            setLogs(localLogs.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ));

            // If online, sync with server
            if (isOnline()) {
                const { data, error: fetchError } = await supabase
                    .from('dive_logs')
                    .select('*')
                    .order('date', { ascending: false });

                if (fetchError) {
                    console.error('Fetch error:', fetchError);
                } else if (data) {
                    // TODO: Implement proper sync logic
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch logs');
        } finally {
            setIsLoading(false);
        }
    }, []);


    const createLog = useCallback(async (
        data: DiveLogFormData,
        photos: DivePhoto[] = []
    ): Promise<DiveLog | null> => {
        setError(null);

        const now = new Date().toISOString();
        const newLogId = uuidv4();

        // Create new log with logbook format
        const newLog: DiveLog = {
            id: newLogId,

            // Basic Info
            date: data.date,
            diveSiteName: data.diveSiteName,
            gpsLat: data.gpsLat,
            gpsLng: data.gpsLng,
            country: data.country,

            // Time
            surfaceInterval: data.surfaceInterval,
            divingTime: data.divingTime,
            timeStart: data.timeStart,
            timeEnd: data.timeEnd,

            // Depth & Temperature
            maxDepth: data.maxDepth,
            avgDepth: data.avgDepth,
            tempMin: data.tempMin,
            tempMax: data.tempMax,
            tempAvg: data.tempAvg,

            // Tank/Gas
            tankMaterial: data.tankMaterial,
            tankConfig: data.tankConfig,
            gasMix: data.gasMix,
            nitroxPercent: data.nitroxPercent,
            pressureStart: data.pressureStart,
            pressureEnd: data.pressureEnd,

            // Weight
            weightBelt: data.weightBelt,
            weightPocket: data.weightPocket,

            // Conditions
            visibility: data.visibility,
            weather: data.weather,
            current: data.current,
            wave: data.wave,
            wind: data.wind,
            entryMethod: data.entryMethod,

            // Equipment
            equipment: data.equipment,

            // Team
            instructor: data.instructor,
            buddy: data.buddy,
            guide: data.guide,

            // Notes
            notes: data.notes,

            // Photos using the passed photos array (already processed/uploaded ideally, but for now just metadata)
            photos: data.savePhotos ? photos : undefined,
            savePhotos: data.savePhotos,

            // Metadata
            createdAt: now,
            updatedAt: now,
            isPublic: data.isPublic,
            isSynced: false,
        };

        try {
            // 1. Save locally first (offline-first)
            await saveDiveLogLocal(newLog);
            setLogs(prev => [newLog, ...prev]);

            // 2. If online, sync to Supabase
            if (isOnline()) {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                if (userId) {
                    // Map to snake_case for DB
                    const dbPayload = {
                        id: newLog.id,
                        user_id: userId,
                        date: newLog.date,
                        location_name: newLog.diveSiteName, // Mapping diveSiteName to location_name or dive_site_name based on schema. Using location_name as primary.
                        dive_site_name: newLog.diveSiteName,
                        gps_lat: newLog.gpsLat,
                        gps_lng: newLog.gpsLng,
                        country: newLog.country,

                        surface_interval: newLog.surfaceInterval,
                        diving_time: newLog.divingTime,
                        bottom_time: newLog.divingTime, // Redundant mapping for safety
                        time_start: newLog.timeStart,
                        time_in: newLog.timeStart,
                        time_end: newLog.timeEnd,
                        time_out: newLog.timeEnd,

                        max_depth: newLog.maxDepth,
                        avg_depth: newLog.avgDepth,

                        temp_min: newLog.tempMin,
                        temp_max: newLog.tempMax,
                        temp_avg: newLog.tempAvg,
                        sea_temperature: newLog.tempAvg, // Map to sea_temperature

                        tank_material: newLog.tankMaterial,
                        tank_config: newLog.tankConfig,
                        gas_mix: newLog.gasMix,
                        nitrox_percent: newLog.nitroxPercent,
                        pressure_start: newLog.pressureStart,
                        pressure_end: newLog.pressureEnd,

                        weight_belt: newLog.weightBelt,
                        weight_pocket: newLog.weightPocket,

                        visibility: newLog.visibility?.toString(), // DB might expect string
                        weather: newLog.weather,
                        weather_condition: newLog.weather, // Map alias
                        current: newLog.current,
                        wave: newLog.wave,
                        wind: newLog.wind,
                        entry_method: newLog.entryMethod,

                        equipment: newLog.equipment, // JSONB

                        instructor: newLog.instructor,
                        buddy: newLog.buddy,
                        guide: newLog.guide,

                        notes: newLog.notes,
                        is_public: newLog.isPublic,
                        created_at: newLog.createdAt,
                        updated_at: newLog.updatedAt,
                    };

                    const { error: syncError } = await supabase
                        .from('dive_logs')
                        .insert(dbPayload);

                    if (syncError) {
                        console.error('Supabase Sync Create Error:', syncError);
                        // Don't throw, just leave isSynced = false
                    } else {
                        // Mark as synced
                        newLog.isSynced = true;
                        await saveDiveLogLocal(newLog); // Update local to synced

                        // TODO: Handle Photo Sync (Upload file -> Get Public URL -> Insert to dive_photos)
                        // This is complex and might need a separate background job or "uploading" state.
                        // For now, we skip photo rows insert to avoid complexity in this quick fix.
                    }
                }
            } else {
                // Queue for later sync
                await addPendingUpload('create', newLog);
            }

            return newLog;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create log');
            return null;
        }
    }, []);

    const updateLog = useCallback(async (
        id: string,
        data: Partial<DiveLogFormData>
    ): Promise<boolean> => {
        setError(null);

        try {
            const existing = await getDiveLogLocal(id);
            if (!existing) {
                setError('Log not found');
                return false;
            }

            const updated: DiveLog = {
                ...existing,
                ...data,
                updatedAt: new Date().toISOString(),
                isSynced: false,
            };

            await saveDiveLogLocal(updated);
            setLogs(prev => prev.map(log => log.id === id ? updated : log));

            if (isOnline()) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // Map critical fields for update
                    const dbPayload = {
                        date: updated.date,
                        location_name: updated.diveSiteName,
                        dive_site_name: updated.diveSiteName,
                        notes: updated.notes,
                        is_public: updated.isPublic,
                        updated_at: updated.updatedAt,
                        // Add other fields as needed for update...
                        // For brevity, we are updating main fields. ideally map all.
                        diving_time: updated.divingTime,
                        max_depth: updated.maxDepth,
                    };

                    const { error: syncError } = await supabase
                        .from('dive_logs')
                        .update(dbPayload)
                        .eq('id', id);

                    if (syncError) {
                        console.error('Supabase Sync Update Error:', syncError);
                    } else {
                        updated.isSynced = true;
                        await saveDiveLogLocal(updated);
                    }
                }
            } else {
                await addPendingUpload('update', updated);
            }

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update log');
            return false;
        }
    }, []);

    const deleteLog = useCallback(async (id: string): Promise<boolean> => {
        setError(null);

        try {
            const existing = await getDiveLogLocal(id);
            if (!existing) {
                setError('Log not found');
                return false;
            }

            await deleteDiveLogLocal(id);
            setLogs(prev => prev.filter(log => log.id !== id));

            if (isOnline()) {
                const { error: syncError } = await supabase
                    .from('dive_logs')
                    .delete()
                    .eq('id', id);

                if (syncError) console.error('Supabase Sync Delete Error:', syncError);
            } else {
                await addPendingUpload('delete', existing);
            }

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete log');
            return false;
        }
    }, []);

    const getLog = useCallback(async (id: string): Promise<DiveLog | null> => {
        try {
            return await getDiveLogLocal(id) || null;
        } catch {
            return null;
        }
    }, []);

    return {
        logs,
        isLoading,
        error,
        fetchLogs,
        createLog,
        updateLog,
        deleteLog,
        getLog,
    };
}
