// PhotoUploader Component
// Drag & drop or file select for photo uploads with EXIF extraction

'use client';

import { useState, useCallback, useRef } from 'react';
import { useExifExtractor } from '@/hooks/useExifExtractor';
import type { ExifResult } from '@/workers/exif-worker';

interface PhotoUploaderProps {
    onPhotosProcessed: (results: ExifResult[], files: File[]) => void;
    maxFiles?: number;
}

export function PhotoUploader({
    onPhotosProcessed,
    maxFiles = 20
}: PhotoUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { extractFromFiles, isExtracting, progress, error } = useExifExtractor();

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files).slice(0, maxFiles);

        // Create preview URLs
        const urls = fileArray.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);

        // Extract EXIF data
        const results = await extractFromFiles(fileArray);
        onPhotosProcessed(results, fileArray);
    }, [extractFromFiles, maxFiles, onPhotosProcessed]);

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

    return (
        <div className="w-full">
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
                            JPEG, PNG, HEIC 지원 • 최대 {maxFiles}장
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Photo Previews */}
            {previewUrls.length > 0 && !isExtracting && (
                <div className="mt-6">
                    <p className="text-sm text-slate-400 mb-3">
                        업로드된 사진 ({previewUrls.length}장)
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {previewUrls.map((url, index) => (
                            <div
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden bg-slate-800"
                            >
                                <img
                                    src={url}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
