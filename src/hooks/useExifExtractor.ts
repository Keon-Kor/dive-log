// useExifExtractor Hook
// Wraps Web Worker communication for EXIF extraction

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Comlink from 'comlink';
import type { ExifWorker, ExifResult } from '@/workers/exif-worker';

interface UseExifExtractorReturn {
    extractFromFiles: (files: File[]) => Promise<ExifResult[]>;
    isExtracting: boolean;
    progress: number;
    error: string | null;
}

export function useExifExtractor(): UseExifExtractorReturn {
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const workerApiRef = useRef<Comlink.Remote<ExifWorker> | null>(null);

    // Initialize worker
    useEffect(() => {
        if (typeof window !== 'undefined') {
            workerRef.current = new Worker(
                new URL('@/workers/exif-worker.ts', import.meta.url)
            );
            workerApiRef.current = Comlink.wrap<ExifWorker>(workerRef.current);
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const extractFromFiles = useCallback(async (files: File[]): Promise<ExifResult[]> => {
        if (!workerApiRef.current) {
            setError('Worker not initialized');
            return [];
        }

        setIsExtracting(true);
        setProgress(0);
        setError(null);

        const results: ExifResult[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const result = await workerApiRef.current.extractExif(file);
                results.push(result);
                setProgress(((i + 1) / files.length) * 100);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setIsExtracting(false);
        }

        return results;
    }, []);

    return {
        extractFromFiles,
        isExtracting,
        progress,
        error,
    };
}
