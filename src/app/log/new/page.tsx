// New Dive Log Page - Redesigned with Logbook Form
// 3-step flow: Upload photos (EXIF extraction) → Auto-fill logbook → Save

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoUploader } from '@/components/PhotoUploader';
import { LogbookForm } from '@/components/LogbookForm';
import { useDiveLog } from '@/hooks/useDiveLog';
import type { ExifResult } from '@/workers/exif-worker';
import type { DiveLogFormData } from '@/lib/types';

type Step = 'upload' | 'logbook' | 'complete';

export default function NewLogPage() {
    const router = useRouter();
    const { createLog } = useDiveLog();
    const [step, setStep] = useState<Step>('upload');
    const [exifData, setExifData] = useState<Partial<DiveLogFormData>>({});
    const [isSaving, setIsSaving] = useState(false);

    // TODO: Replace with actual auth check
    const isLoggedIn = false;

    const handlePhotosProcessed = useCallback((results: ExifResult[], files: File[]) => {
        // Extract data from EXIF - photos are NOT stored
        if (results.length > 0) {
            const firstResult = results[0];
            const lastResult = results[results.length - 1];

            // Calculate diving time from first and last photo
            let divingTime = 0;
            if (firstResult.data?.dateTaken && lastResult.data?.dateTaken) {
                const start = new Date(firstResult.data.dateTaken);
                const end = new Date(lastResult.data.dateTaken);
                divingTime = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            }

            // Auto-fill form data from EXIF
            setExifData({
                date: firstResult.data?.dateTaken
                    ? new Date(firstResult.data.dateTaken).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                timeStart: firstResult.data?.dateTaken
                    ? new Date(firstResult.data.dateTaken).toTimeString().slice(0, 5)
                    : '',
                timeEnd: lastResult.data?.dateTaken
                    ? new Date(lastResult.data.dateTaken).toTimeString().slice(0, 5)
                    : '',
                divingTime: divingTime > 0 ? divingTime : 45,
                gpsLat: firstResult.data?.gpsLat ?? undefined,
                gpsLng: firstResult.data?.gpsLng ?? undefined,
                // TODO: GPS → Dive Site matching
                diveSiteName: '',
            });

            setStep('logbook');
        }
    }, []);

    const handleSubmit = useCallback(async (formData: DiveLogFormData) => {
        setIsSaving(true);

        try {
            // Create the dive log (no photos stored by default)
            const newLog = await createLog(formData, []);

            if (newLog) {
                setStep('complete');
                setTimeout(() => router.push('/'), 2000);
            }
        } catch (error) {
            console.error('Failed to create log:', error);
        } finally {
            setIsSaving(false);
        }
    }, [createLog, router]);

    const handleBack = useCallback(() => {
        setStep('upload');
        setExifData({});
    }, []);

    const handleSkipPhotos = useCallback(() => {
        setStep('logbook');
    }, []);

    return (
        <div className="min-h-screen pb-8">
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
                            {step === 'upload' && '1단계: 사진에서 정보 추출'}
                            {step === 'logbook' && '2단계: 로그북 작성'}
                            {step === 'complete' && '완료!'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex gap-2">
                    {['upload', 'logbook', 'complete'].map((s, i) => (
                        <div
                            key={s}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${['upload', 'logbook', 'complete'].indexOf(step) >= i
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4">
                {/* Step 1: Photo Upload (for EXIF only) */}
                {step === 'upload' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Privacy Notice */}
                        <div className="card p-4 border-cyan-500/30">
                            <div className="flex gap-3">
                                <span className="text-2xl">🔒</span>
                                <div>
                                    <h3 className="font-medium text-white mb-1">프라이버시 우선</h3>
                                    <p className="text-sm text-slate-400">
                                        사진은 저장되지 않습니다. 날짜, 시간, 위치 정보만 추출한 후
                                        사진은 즉시 폐기됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <PhotoUploader onPhotosProcessed={handlePhotosProcessed} />

                        {/* Skip Photos Option */}
                        <div className="text-center">
                            <button
                                onClick={handleSkipPhotos}
                                className="text-sm text-slate-400 hover:text-white transition-colors underline"
                            >
                                사진 없이 직접 작성하기
                            </button>
                        </div>

                        <div className="card p-4">
                            <h3 className="font-medium text-white mb-2">💡 자동 추출 정보</h3>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>• 다이빙 날짜 및 시간</li>
                                <li>• GPS 위치 → 다이빙 사이트 자동 매칭</li>
                                <li>• 여러 장 업로드 시 다이빙 시간 자동 계산</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Logbook Form */}
                {step === 'logbook' && (
                    <div className="animate-fade-in">
                        <LogbookForm
                            initialData={exifData}
                            onSubmit={handleSubmit}
                            onCancel={handleBack}
                            isLoggedIn={isLoggedIn}
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
                        <h2 className="text-2xl font-bold text-white mb-2">로그 저장 완료!</h2>
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
