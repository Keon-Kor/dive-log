// New Dive Log Page
// 3-step flow: Upload photos → Review auto-filled data → Save

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoUploader } from '@/components/PhotoUploader';
import { DiveLogForm } from '@/components/DiveLogForm';
import { useDiveLog } from '@/hooks/useDiveLog';
import type { ExifResult } from '@/workers/exif-worker';
import type { DiveLogFormData, DivePhoto } from '@/lib/types';

type Step = 'upload' | 'review' | 'complete';

export default function NewLogPage() {
    const router = useRouter();
    const { createLog } = useDiveLog();
    const [step, setStep] = useState<Step>('upload');
    const [exifResults, setExifResults] = useState<ExifResult[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handlePhotosProcessed = useCallback((results: ExifResult[], files: File[]) => {
        setExifResults(results);
        setUploadedFiles(files);

        // Move to review step if we have results
        if (results.length > 0) {
            setStep('review');
        }
    }, []);

    const handleSubmit = useCallback(async (formData: DiveLogFormData) => {
        setIsSaving(true);

        try {
            // Create photo objects from uploaded files
            const photos: DivePhoto[] = uploadedFiles.map((file, index) => {
                const exifData = exifResults[index]?.data;
                return {
                    id: `photo-${Date.now()}-${index}`,
                    thumbnailUrl: URL.createObjectURL(file),
                    exifData: {
                        dateTaken: exifData?.dateTaken || new Date().toISOString(),
                        gpsLat: exifData?.gpsLat || formData.gpsLat,
                        gpsLng: exifData?.gpsLng || formData.gpsLng,
                        camera: exifData?.camera || undefined,
                        lens: exifData?.lens || undefined,
                    },
                };
            });

            // Create the dive log
            const newLog = await createLog(formData, photos);

            if (newLog) {
                setStep('complete');
                // Redirect to home after a short delay
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to create log:', error);
        } finally {
            setIsSaving(false);
        }
    }, [uploadedFiles, exifResults, createLog, router]);

    const handleBack = useCallback(() => {
        setStep('upload');
        setExifResults([]);
        setUploadedFiles([]);
    }, []);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-white">새 다이빙 로그</h1>
                        <p className="text-xs text-slate-400">
                            {step === 'upload' && '1단계: 사진 업로드'}
                            {step === 'review' && '2단계: 정보 확인'}
                            {step === 'complete' && '완료!'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex gap-2">
                    {['upload', 'review', 'complete'].map((s, i) => (
                        <div
                            key={s}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${['upload', 'review', 'complete'].indexOf(step) >= i
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                    : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-4">
                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div className="animate-fade-in space-y-6">
                        <PhotoUploader onPhotosProcessed={handlePhotosProcessed} />

                        <div className="card p-4">
                            <h3 className="font-medium text-white mb-2">💡 팁</h3>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>• GPS 정보가 있는 사진을 업로드하면 위치가 자동으로 입력됩니다</li>
                                <li>• 여러 장의 사진을 업로드하면 다이빙 시간을 자동 계산합니다</li>
                                <li>• HEIC 형식도 지원됩니다 (iPhone)</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Review */}
                {step === 'review' && (
                    <div className="animate-fade-in">
                        <DiveLogForm
                            exifResults={exifResults}
                            onSubmit={handleSubmit}
                            onBack={handleBack}
                        />

                        {isSaving && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="card p-8 text-center">
                                    <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                                    <p className="text-white">로그 저장 중...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Complete */}
                {step === 'complete' && (
                    <div className="animate-fade-in text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse-glow">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">저장 완료!</h2>
                        <p className="text-slate-400 mb-6">다이빙 로그가 성공적으로 저장되었습니다</p>
                        <Link href="/" className="btn-primary inline-flex items-center gap-2">
                            홈으로 돌아가기
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
