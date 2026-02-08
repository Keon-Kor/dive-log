// IndexedDB Offline Storage
// Stores dive logs locally for offline support, syncs when online

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DiveLog } from './types';

interface DiveLogDB extends DBSchema {
    'dive-logs': {
        key: string;
        value: DiveLog;
        indexes: {
            'by-date': string;
            'by-synced': number;
        };
    };
    'pending-uploads': {
        key: string;
        value: {
            id: string;
            type: 'create' | 'update' | 'delete';
            data: DiveLog;
            timestamp: string;
        };
    };
}

const DB_NAME = 'dive-log-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DiveLogDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DiveLogDB>> {
    if (!dbPromise) {
        dbPromise = openDB<DiveLogDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Dive logs store
                if (!db.objectStoreNames.contains('dive-logs')) {
                    const logStore = db.createObjectStore('dive-logs', { keyPath: 'id' });
                    logStore.createIndex('by-date', 'date');
                    logStore.createIndex('by-synced', 'isSynced');
                }

                // Pending uploads store (for offline changes)
                if (!db.objectStoreNames.contains('pending-uploads')) {
                    db.createObjectStore('pending-uploads', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

// Save dive log locally
export async function saveDiveLogLocal(log: DiveLog): Promise<void> {
    const db = await getDB();
    await db.put('dive-logs', log);
}

// Get all dive logs from local storage
export async function getAllDiveLogsLocal(): Promise<DiveLog[]> {
    const db = await getDB();
    return db.getAll('dive-logs');
}

// Get dive log by ID
export async function getDiveLogLocal(id: string): Promise<DiveLog | undefined> {
    const db = await getDB();
    return db.get('dive-logs', id);
}

// Delete dive log locally
export async function deleteDiveLogLocal(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('dive-logs', id);
}

// Add pending upload (for offline sync)
export async function addPendingUpload(
    type: 'create' | 'update' | 'delete',
    data: DiveLog
): Promise<void> {
    const db = await getDB();
    await db.put('pending-uploads', {
        id: data.id,
        type,
        data,
        timestamp: new Date().toISOString(),
    });
}

// Get all pending uploads
export async function getPendingUploads() {
    const db = await getDB();
    return db.getAll('pending-uploads');
}

// Clear pending upload after successful sync
export async function clearPendingUpload(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('pending-uploads', id);
}

// Check if we're online
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
