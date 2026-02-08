// PhotoUploader Component - Redesigned
// Max 3 photos, save toggle (default OFF), uses latest photo's EXIF data

'use client';

import { useState, useCallback, useRef } from 'react';
import { useExifExtractor } from '@/hooks/useExifExtractor';
import type { ExifResult } from '@/workers/exif-worker';

interface PhotoUploaderProps {
    onPhotosProcessed: (results: ExifResult[], files: File[], savePhotos: boolean) => void;
    isLoggedIn?: boolean;
}

const MAX_PHOTOS = 3;

export function PhotoUploader({
    onPhotosProcessed,
    isLoggedIn = false
}: PhotoUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [savePhotos, setSavePhotos] = useState(false); // Default OFF
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { extractFromFiles, isExtracting, progress, error } = useExifExtractor();

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        // Limit to MAX_PHOTOS
        const fileArray = Array.from(files).slice(0, MAX_PHOTOS);

        // Sort by name to get consistent ordering (newest photos typically have later names)
        // In practice, we'll sort by EXIF date after extraction
        setSelectedFiles(fileArray);

        // Create preview URLs
        const urls = fileArray.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);

        // Extract EXIF data
        const results = await extractFromFiles(fileArray);

        // Sort by date - find the LATEST photo's data
        const sortedResults = [...results].sort((a, b) => {
            const dateA = a.data?.dateTaken ? new Date(a.data.dateTaken).getTime() : 0;
            const dateB = b.data?.dateTaken ? new Date(b.data.dateTaken).getTime() : 0;
            return dateB - dateA; // Latest first
        });

        // Use the LATEST photo's EXIF data
        onPhotosProcessed(sortedResults, fileArray, savePhotos);
    }, [extractFromFiles, onPhotosProcessed, savePhotos]);

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
        if (files.length > 0) {
            handleFiles(files);
        }
    }, [handleFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    }, [handleFiles]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const removePhoto = (index: number) => {
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleToggleSavePhotos = () => {
        if (!isLoggedIn) return;
        setSavePhotos(!savePhotos);
    };

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

            {/* Drop Zone */}
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

                {isExtracting ? (
                    <div className="space-y-4">
                        <div className="animate-pulse">
                            <svg className="w-12 h-12 mx-auto text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-cyan-400 font-medium">사진 분석 중...</p>
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
                            <p className="text-lg font-semibold text-white">
                                다이빙 사진을 업로드하세요
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                드래그 앤 드롭 또는 클릭하여 선택
                            </p>
                        </div>
                        <p className="text-xs text-slate-500">
                            JPEG, PNG, HEIC 지원 • 최대 {MAX_PHOTOS}장
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Photo Previews */}
            {previewUrls.length > 0 && !isExtracting && (
                <div>
                    <p className="text-sm text-slate-400 mb-3">
                        업로드된 사진 ({previewUrls.length}/{MAX_PHOTOS}장)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {previewUrls.map((url, index) => (
                            <div
                                key={index}
                                className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 group"
                            >
                                <img
                                    src={url}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removePhoto(index);
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                {index === 0 && (
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-cyan-500/80 rounded-full text-xs text-white">
                                        최신
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Save Photos Toggle */}
            {previewUrls.length > 0 && !isExtracting && (
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white text-sm font-medium">
                                📷 사진도 함께 저장하기
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isLoggedIn
                                    ? "로그북과 함께 압축된 사진을 저장합니다"
                                    : "로그인하면 사진도 저장할 수 있습니다"
                                }
                            </p>
                        </div>
                        <button
                            onClick={handleToggleSavePhotos}
                            disabled={!isLoggedIn}
                            className={`
                                relative w-12 h-6 rounded-full transition-colors
                                ${!isLoggedIn
                                    ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                    : savePhotos
                                        ? 'bg-cyan-500'
                                        : 'bg-slate-600'
                                }
                            `}
                        >
                            <div
                                className={`
                                    absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                                    ${savePhotos ? 'left-[26px]' : 'left-0.5'}
                                `}
                            />
                        </button>
                    </div>
                    {!isLoggedIn && (
                        <button className="mt-3 w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 underline transition-colors">
                            로그인하기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
