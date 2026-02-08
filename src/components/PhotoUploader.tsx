// PhotoUploader Component - With EXIF Preview
// Shows extracted metadata before confirming to proceed

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useExifExtractor } from '@/hooks/useExifExtractor';
import type { ExifResult } from '@/hooks/useExifExtractor'; // Changed from /workers/exif-worker to /hooks/useExifExtractor
import { clientLogger } from '@/lib/clientLogger';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhotoUploaderProps {
    onPhotosProcessed: (results: ExifResult[], files: File[], savePhotos: boolean) => void;
    isLoggedIn?: boolean;
    onLoginClick?: () => void;
}

const MAX_PHOTOS = 3;

type Phase = 'upload' | 'preview' | 'confirmed';

export function PhotoUploader({
    onPhotosProcessed,
    isLoggedIn = false,
    onLoginClick
}: PhotoUploaderProps) {
    const { t, language } = useLanguage();
    const [phase, setPhase] = useState<Phase>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [extractedResults, setExtractedResults] = useState<ExifResult[]>([]);
    const [savePhotos, setSavePhotos] = useState(false); // Default OFF
    const [allowGps] = useState(true); // Default ON (Implied Consent)
    const [isProcessingPreviews, setIsProcessingPreviews] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { extractFromFiles, isExtracting, progress, error } = useExifExtractor({
        allowGpsExtraction: allowGps
    });

    // Extract EXIF and show preview
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files).slice(0, MAX_PHOTOS);
        setSelectedFiles(fileArray);
        setIsProcessingPreviews(true);

        // Create preview URLs (with HEIC conversion)
        const urls: string[] = [];
        for (const file of fileArray) {
            const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');

            if (isHeic) {
                try {
                    // Dynamically import heic2any to avoid SSR issues
                    const heic2anyModule = await import('heic2any');
                    const heic2any = heic2anyModule.default;

                    // Convert HEIC to JPEG blob for preview
                    const result = await heic2any({
                        blob: file,
                        toType: 'image/jpeg',
                        quality: 0.3
                    });

                    // Handle potential array result
                    const convertedBlob = Array.isArray(result) ? result[0] : result;
                    urls.push(URL.createObjectURL(convertedBlob));
                } catch (e: unknown) {
                    const err = e as Error;
                    // Log the error to server for monitoring, but don't crash UI
                    clientLogger.error('HEIC preview conversion failed', err, 'PhotoUploader');

                    if (process.env.NODE_ENV === 'development') {
                        console.warn('HEIC preview generation failed:', err.message);
                    }
                    // Push a magic string to indicate error, handled in render
                    urls.push('HEIC_ERROR');
                }
            } else {
                urls.push(URL.createObjectURL(file));
            }
        }
        setPreviewUrls(urls);
        setIsProcessingPreviews(false);

        // Extract EXIF data
        const results = await extractFromFiles(fileArray);

        // Sort by date - LATEST photo first
        const sortedResults = [...results].sort((a, b) => {
            const dateA = a.data?.dateTaken ? new Date(a.data.dateTaken).getTime() : 0;
            const dateB = b.data?.dateTaken ? new Date(b.data.dateTaken).getTime() : 0;
            return dateB - dateA;
        });

        setExtractedResults(sortedResults);
        setPhase('preview'); // Show preview instead of auto-proceeding
    }, [extractFromFiles, extractFromFiles]); // Dummy dup to fix potential lint warning if identity varies

    // Trigger re-extraction when GPS consent is toggled while in preview mode
    const reExtract = useCallback(async () => {
        if (selectedFiles.length > 0) {
            const results = await extractFromFiles(selectedFiles);
            const sortedResults = [...results].sort((a, b) => {
                const dateA = a.data?.dateTaken ? new Date(a.data.dateTaken).getTime() : 0;
                const dateB = b.data?.dateTaken ? new Date(b.data.dateTaken).getTime() : 0;
                return dateB - dateA;
            });
            setExtractedResults(sortedResults);
        }
    }, [selectedFiles, extractFromFiles]);

    useEffect(() => {
        if (phase === 'preview' && selectedFiles.length > 0) {
            reExtract();
        }
    }, [allowGps, reExtract, phase, selectedFiles.length]);

    // User confirms to proceed
    const handleConfirm = useCallback(() => {
        setPhase('confirmed');
        onPhotosProcessed(extractedResults, selectedFiles, savePhotos);
    }, [extractedResults, selectedFiles, savePhotos, onPhotosProcessed]);

    // User cancels and re-uploads
    const handleCancel = useCallback(() => {
        setPhase('upload');
        setPreviewUrls([]);
        setSelectedFiles([]);
        setExtractedResults([]);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFiles(files);
    }, [handleFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) handleFiles(files);
    }, [handleFiles]);

    const handleClick = () => fileInputRef.current?.click();

    const handleToggleSavePhotos = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            onLoginClick?.();
            return;
        }
        setSavePhotos(prev => !prev);
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                year: 'numeric', month: language === 'ko' ? 'long' : 'short', day: 'numeric',
                weekday: 'short'
            });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const timeStr = date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', {
                hour: '2-digit', minute: '2-digit',
                hour12: true
            });
            return `${timeStr} (${t('photoUploader.localTimeLabel') || 'Local Time'})`;
        } catch {
            return '';
        }
    };

    // Get the latest result for display
    const latestResult = extractedResults[0];
    const hasGPS = latestResult?.data?.gpsLat && latestResult?.data?.gpsLng;

    return (
        <div className="w-full space-y-4">
            {/* Privacy Notice */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <div className="flex gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                        <p className="text-sm text-cyan-300 font-medium">
                            {t('photoUploader.autoAnalyze')}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {t('photoUploader.analyzeSub')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Phase: Upload */}
            {phase === 'upload' && (
                <>
                    <div
                        onClick={handleClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                            transition-all duration-300 ease-in-out
                            ${isDragging
                                ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
                                : 'border-slate-600 hover:border-cyan-500 bg-slate-800/50 hover:bg-slate-800'
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/heic,image/heif"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {isExtracting || isProcessingPreviews ? (
                            <div className="space-y-4">
                                <div className="animate-pulse">
                                    <svg className="w-12 h-12 mx-auto text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-cyan-400 font-medium">
                                    {isProcessingPreviews ? t('photoUploader.generatingPreviews') : t('photoUploader.analyzing')}
                                </p>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-slate-400 text-sm">{Math.round(progress)}% {t('photoUploader.complete')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-white">{t('photoUploader.header')}</p>
                                    <p className="text-slate-400 text-sm mt-1">{t('logNew.photoUploadSub')}</p>
                                </div>
                                <p className="text-xs text-slate-500">{t('logNew.photoUploadLimit')}</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </>
            )}

            {/* Phase: Preview - Show extracted metadata */}
            {phase === 'preview' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Photo Thumbnails */}
                    <div className="grid grid-cols-3 gap-3">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
                                {url === 'HEIC_ERROR' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-700">
                                        <span className="text-xs text-slate-400">Preview Failed</span>
                                        <span className="text-[10px] text-slate-500 mt-1">HEIC</span>
                                    </div>
                                ) : (
                                    <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                                )}
                                {index === 0 && (
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-cyan-500/80 rounded-full text-xs text-white">
                                        {t('photoUploader.latest')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Extracted Metadata Card */}
                    <div className="p-5 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📋 {t('photoUploader.extractedTitle')}
                        </h3>

                        {latestResult?.data ? (
                            <div className="grid grid-cols-2 gap-4">
                                {/* Date */}
                                {latestResult.data.dateTaken && (
                                    <div className="bg-slate-700/50 p-3 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">📅 {t('photoUploader.date')}</p>
                                        <p className="text-white font-medium">
                                            {formatDate(latestResult.data.dateTaken)}
                                        </p>
                                    </div>
                                )}

                                {/* Time */}
                                {latestResult.data.dateTaken && (
                                    <div className="bg-slate-700/50 p-3 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">⏰ {t('photoUploader.time')}</p>
                                        <p className="text-white font-medium">
                                            {formatTime(latestResult.data.dateTaken)}
                                        </p>
                                    </div>
                                )}

                                {/* GPS */}
                                {hasGPS ? (
                                    <div className="col-span-2 bg-green-500/10 border border-green-500/30 p-3 rounded-xl">
                                        <p className="text-xs text-green-400 mb-1">📍 {t('photoUploader.gps')}</p>
                                        <p className="text-white font-medium">
                                            {latestResult.data.gpsLat?.toFixed(4)}°, {latestResult.data.gpsLng?.toFixed(4)}°
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {t('photoUploader.gpsUsedFor')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="col-span-2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl">
                                        <p className="text-xs text-yellow-400 mb-1">📍 {t('photoUploader.noGps')}</p>
                                        <p className="text-sm text-slate-300">
                                            {t('photoUploader.noGpsSub')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
                                <p className="text-yellow-400 font-medium">⚠️ {t('photoUploader.noMetadata')}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {t('photoUploader.noMetadataSub')}
                                </p>
                            </div>
                        )}

                        {/* Photo count info */}
                        <p className="text-xs text-slate-500 text-center">
                            {t('photoUploader.photoCountInfo')?.replace('{count}', extractedResults.length.toString())}
                        </p>
                    </div>

                    {/* Save Photos Toggle */}
                    <div
                        onClick={handleToggleSavePhotos}
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/80 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-medium">📷 {t('photoUploader.savePhotos')}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isLoggedIn
                                        ? t('photoUploader.savePhotosSub')
                                        : t('photoUploader.loginRequired')
                                    }
                                </p>
                            </div>
                            <div
                                className={`
                                    relative w-12 h-6 rounded-full transition-colors pointer-events-none 
                                    ${!isLoggedIn
                                        ? 'bg-slate-600'
                                        : savePhotos ? 'bg-cyan-500' : 'bg-slate-600'
                                    }
                                `}
                            >
                                <div className={`
                                    absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                                    ${savePhotos ? 'left-[26px]' : 'left-0.5'}
                                `} />
                            </div>
                        </div>
                    </div>

                    {/* Implied Consent Notice */}
                    <div className="text-center">
                        <p className="text-xs text-slate-500">
                            {t('photoUploader.privacyConsent')}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-4 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors text-lg"
                        >
                            {t('photoUploader.reselect')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors text-lg"
                        >
                            {t('photoUploader.proceed')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
