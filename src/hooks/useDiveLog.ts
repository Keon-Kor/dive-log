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

        // Create new log with logbook format
        const newLog: DiveLog = {
            id: uuidv4(),

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

            // Photos (only if savePhotos is true and user is logged in)
            photos: data.savePhotos ? photos : undefined,
            savePhotos: data.savePhotos,

            // Metadata
            createdAt: now,
            updatedAt: now,
            isPublic: data.isPublic,
            isSynced: false,
        };

        try {
            // Save locally first (offline-first)
            await saveDiveLogLocal(newLog);
            setLogs(prev => [newLog, ...prev]);

            // If online, sync to server
            if (isOnline()) {
                // TODO: Sync to Supabase
                newLog.isSynced = true;
                await saveDiveLogLocal(newLog);
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
                // TODO: Sync to Supabase
                updated.isSynced = true;
                await saveDiveLogLocal(updated);
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
                // TODO: Delete from Supabase
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
