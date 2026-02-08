// PhotoUploader Component - With EXIF Preview
// Shows extracted metadata before confirming to proceed

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useExifExtractor } from '@/hooks/useExifExtractor';
import type { ExifResult } from '@/workers/exif-worker';
import { clientLogger } from '@/lib/clientLogger';

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
    const [phase, setPhase] = useState<Phase>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [extractedResults, setExtractedResults] = useState<ExifResult[]>([]);
    const [savePhotos, setSavePhotos] = useState(false); // Default OFF
    const [allowGps, setAllowGps] = useState(false); // Default OFF (Privacy Opt-in)
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
                        quality: 0.5
                    });

                    // Handle potential array result
                    const convertedBlob = Array.isArray(result) ? result[0] : result;
                    urls.push(URL.createObjectURL(convertedBlob));
                } catch (e: any) {
                    // Log the error to server for monitoring, but don't crash UI
                    clientLogger.error('HEIC preview conversion failed', e, 'PhotoUploader');

                    if (process.env.NODE_ENV === 'development') {
                        console.warn('HEIC preview generation failed:', e.message);
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
    }, [extractFromFiles]);

    // Re-extract when GPS consent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Trigger re-extraction when GPS consent is toggled while in preview mode
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
        e.preventDefault(); // Changed to preventDefault + stopPropagation
        e.stopPropagation();

        console.log('Toggle clicked. LoggedIn:', isLoggedIn);

        if (!isLoggedIn) {
            console.log('User not logged in, triggering login callback');
            onLoginClick?.();
            return;
        }
        console.log('Toggling save photos:', !savePhotos);
        setSavePhotos(prev => !prev);
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                weekday: 'short'
            });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const timeStr = date.toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit',
                hour12: true
            });
            return `${timeStr} (현지 시간)`;
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
                            사진의 위치와 시간 정보만 추출합니다
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            사진은 기본적으로 저장되지 않으며, 메타데이터만 로그에 사용됩니다
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
                                    {isProcessingPreviews ? '미리보기 생성 중...' : '사진 분석 중...'}
                                </p>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-slate-400 text-sm">{Math.round(progress)}% 완료</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-white">다이빙 사진을 업로드하세요</p>
                                    <p className="text-slate-400 text-sm mt-1">드래그 앤 드롭 또는 클릭하여 선택</p>
                                </div>
                                <p className="text-xs text-slate-500">JPEG, PNG, HEIC 지원 • 최대 {MAX_PHOTOS}장</p>
                            </div>
                        )}
                    </div>

                    {/* GPS Consent Checkbox */}
                    <div
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            const newAllowGps = !allowGps;
                            setAllowGps(newAllowGps);

                            // Re-extract if files are already selected to apply new GPS setting
                            if (selectedFiles.length > 0) {
                                // We need to use the functional update or a useEffect, but since we are inside an event handler,
                                // we can't easily force the hook to update immediately and return a new function.
                                // HOWEVER, useExifExtractor depends on 'finalConfig' which depends on 'allowGps'.
                                // So simply updating the state will trigger the hook's effect IF the hook uses it.
                                // BUT extractFromFiles is a useCallback dependent on finalConfig.
                                // So we need to call the *new* extractFromFiles. 
                                // Actually, standard React way: utilize useEffect to react to allowGps change? 
                                // No, that might trigger unwanted runs.
                                // Better: Just set state, and let a useEffect handle the re-run if phase is 'preview'.
                            }
                        }}
                    >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${allowGps ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'}`}>
                            {allowGps && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <div className="text-sm text-slate-300 select-none">
                            사진의 위치 정보(GPS) 수집에 동의합니다 <span className="text-slate-500 text-xs">(선택)</span>
                        </div>
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
                                        최신
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Extracted Metadata Card */}
                    <div className="p-5 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📋 추출된 메타데이터
                        </h3>

                        {latestResult?.data ? (
                            <div className="grid grid-cols-2 gap-4">
                                {/* Date */}
                                {latestResult.data.dateTaken && (
                                    <div className="bg-slate-700/50 p-3 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">📅 촬영 날짜</p>
                                        <p className="text-white font-medium">
                                            {formatDate(latestResult.data.dateTaken)}
                                        </p>
                                    </div>
                                )}

                                {/* Time */}
                                {latestResult.data.dateTaken && (
                                    <div className="bg-slate-700/50 p-3 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">⏰ 촬영 시간</p>
                                        <p className="text-white font-medium">
                                            {formatTime(latestResult.data.dateTaken)}
                                        </p>
                                    </div>
                                )}

                                {/* GPS */}
                                {hasGPS ? (
                                    <div className="col-span-2 bg-green-500/10 border border-green-500/30 p-3 rounded-xl">
                                        <p className="text-xs text-green-400 mb-1">📍 GPS 위치 정보</p>
                                        <p className="text-white font-medium">
                                            {latestResult.data.gpsLat?.toFixed(4)}°, {latestResult.data.gpsLng?.toFixed(4)}°
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            다이빙 사이트 자동 매칭에 사용됩니다
                                        </p>
                                    </div>
                                ) : (
                                    <div className="col-span-2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl">
                                        <p className="text-xs text-yellow-400 mb-1">📍 GPS 정보 없음</p>
                                        <p className="text-sm text-slate-300">
                                            사진에 위치 정보가 없습니다. 다이빙 사이트를 직접 입력해주세요.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
                                <p className="text-yellow-400 font-medium">⚠️ 메타데이터를 찾을 수 없습니다</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    사진에서 EXIF 데이터를 추출할 수 없습니다. 정보를 직접 입력해주세요.
                                </p>
                            </div>
                        )}

                        {/* Photo count info */}
                        <p className="text-xs text-slate-500 text-center">
                            {extractedResults.length}장의 사진에서 정보를 추출했습니다
                        </p>
                    </div>

                    {/* Save Photos Toggle */}
                    <div
                        onClick={handleToggleSavePhotos} // Toggle on container click too
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/80 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-medium">📷 로그북에 사진도 함께 저장하기</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isLoggedIn
                                        ? "로그북과 함께 압축된 사진을 저장합니다"
                                        : "로그인이 필요합니다 (클릭하여 로그인)"
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

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                        >
                            다시 선택
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors"
                        >
                            이 정보로 진행 →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
