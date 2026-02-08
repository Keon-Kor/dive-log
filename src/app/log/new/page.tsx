// New Dive Log Page - 3 Step Form
// Step 1: Photo Upload (EXIF extraction)
// Step 2: Common Info (shareable)
// Step 3: Personal Info + Save + Share URL

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoUploader } from '@/components/PhotoUploader';
import { LoginButton } from '@/components/LoginButton';
import { useDiveLog } from '@/hooks/useDiveLog';
import { useAuth } from '@/hooks/useAuth';
import { findNearestDiveSite, type DiveSite } from '@/lib/dive-sites';
import type { ExifResult } from '@/workers/exif-worker';
import type { DiveLogFormData, WeatherIcon, EntryMethod, TankMaterial, TankConfig, GasMix } from '@/lib/types';

type Step = 1 | 2 | 3 | 4; // 4 = complete

interface ExtractedData {
    date: string;
    timeStart: string;
    timeEnd: string;
    gpsLat?: number;
    gpsLng?: number;
    divingTime: number;
}

export default function NewLogPage() {
    const router = useRouter();
    const { createLog } = useDiveLog();
    const { isLoggedIn, user, signInWithGoogle } = useAuth();
    const [step, setStep] = useState<Step>(1);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [savePhotos, setSavePhotos] = useState(false);
    const [savedLogId, setSavedLogId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shareUrlCopied, setShareUrlCopied] = useState(false);
    const [matchedSite, setMatchedSite] = useState<DiveSite | null>(null);
    const [siteSuggestions, setSiteSuggestions] = useState<DiveSite[]>([]);

    // Form State - Step 2 (Common/Shareable)
    const [commonData, setCommonData] = useState({
        diveSiteName: '',
        country: '',
        date: '',
        surfaceInterval: 0,
        divingTime: 45,
        timeStart: '',
        timeEnd: '',
        maxDepth: 0,
        avgDepth: 0,
        tempMin: 0,
        tempMax: 0,
        tempAvg: 0,
        visibility: 0,
        weather: '' as WeatherIcon | '',
        current: '',
        wave: '',
        wind: '',
        entryMethod: '' as EntryMethod | '',
    });

    // Form State - Step 3 (Personal)
    const [personalData, setPersonalData] = useState({
        tankMaterial: 'aluminum' as TankMaterial,
        tankConfig: 'single' as TankConfig,
        gasMix: 'air' as GasMix,
        nitroxPercent: 32,
        pressureStart: 200,
        pressureEnd: 50,
        weightBelt: 0,
        weightPocket: 0,
        fins: '',
        mask: '',
        suit: '',
        snorkel: false,
        undersuit: '',
        computer: '',
        camera: '',
        gloves: false,
        boots: false,
        accessories: '',
        regulator: '',
        hood: false,
        bcd: '',
        swimwear: false,
        instructor: '',
        buddy: '',
        guide: '',
        notes: '',
    });

    // Step 1: Handle photos processed
    const handlePhotosProcessed = useCallback((results: ExifResult[], files: File[], shouldSavePhotos: boolean) => {
        setSavePhotos(shouldSavePhotos);

        if (results.length > 0) {
            // Results are already sorted with latest first
            const latestResult = results[0];
            const oldestResult = results[results.length - 1];

            // Calculate diving time from oldest to latest
            let divingTime = 45;
            if (latestResult.data?.dateTaken && oldestResult.data?.dateTaken) {
                const start = new Date(oldestResult.data.dateTaken);
                const end = new Date(latestResult.data.dateTaken);
                divingTime = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
            }

            // Use LATEST photo's date/time/location
            const extracted: ExtractedData = {
                date: latestResult.data?.dateTaken
                    ? new Date(latestResult.data.dateTaken).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                timeStart: oldestResult.data?.dateTaken
                    ? new Date(oldestResult.data.dateTaken).toTimeString().slice(0, 5)
                    : '',
                timeEnd: latestResult.data?.dateTaken
                    ? new Date(latestResult.data.dateTaken).toTimeString().slice(0, 5)
                    : '',
                gpsLat: latestResult.data?.gpsLat ?? undefined,
                gpsLng: latestResult.data?.gpsLng ?? undefined,
                divingTime,
            };

            setExtractedData(extracted);

            // Auto-match dive site from GPS
            let autoMatchedSite: DiveSite | null = null;
            if (extracted.gpsLat && extracted.gpsLng) {
                const matchResult = findNearestDiveSite(extracted.gpsLat, extracted.gpsLng, 10000); // 10km radius
                if (matchResult) {
                    autoMatchedSite = matchResult.site;
                    setMatchedSite(matchResult.site);
                }
            }

            // Pre-fill common data
            setCommonData(prev => ({
                ...prev,
                date: extracted.date,
                timeStart: extracted.timeStart,
                timeEnd: extracted.timeEnd,
                divingTime: extracted.divingTime,
                // Auto-fill from matched site
                diveSiteName: autoMatchedSite?.name || '',
                country: autoMatchedSite?.country || '',
            }));

            setStep(2);
        }
    }, []);

    // Skip photos
    const handleSkipPhotos = useCallback(() => {
        setCommonData(prev => ({
            ...prev,
            date: new Date().toISOString().split('T')[0],
        }));
        setStep(2);
    }, []);

    // Step 2 -> Step 3
    const handleStep2Next = () => {
        setStep(3);
    };

    // Step 3: Save
    const handleSave = useCallback(async () => {
        setIsSaving(true);

        try {
            const formData: DiveLogFormData = {
                ...commonData,
                ...personalData,
                weather: commonData.weather || undefined,
                entryMethod: commonData.entryMethod || undefined,
                gpsLat: extractedData?.gpsLat,
                gpsLng: extractedData?.gpsLng,
                isPublic: false,
                savePhotos,
                equipment: {
                    fins: personalData.fins,
                    mask: personalData.mask,
                    suit: personalData.suit,
                    snorkel: personalData.snorkel,
                    undersuit: personalData.undersuit,
                    computer: personalData.computer,
                    camera: personalData.camera,
                    gloves: personalData.gloves,
                    boots: personalData.boots,
                    accessories: personalData.accessories,
                    regulator: personalData.regulator,
                    hood: personalData.hood,
                    bcd: personalData.bcd,
                    swimwear: personalData.swimwear,
                },
            };

            const newLog = await createLog(formData, []);

            if (newLog) {
                setSavedLogId(newLog.id);
                setStep(4);
            }
        } catch (error) {
            console.error('Failed to create log:', error);
        } finally {
            setIsSaving(false);
        }
    }, [commonData, personalData, extractedData, savePhotos, createLog]);

    // Copy share URL
    const handleCopyShareUrl = () => {
        if (!savedLogId) return;
        const shareUrl = `${window.location.origin}/log/${savedLogId}`;
        navigator.clipboard.writeText(shareUrl);
        setShareUrlCopied(true);
        setTimeout(() => setShareUrlCopied(false), 2000);
    };

    const stepTitles = {
        1: '사진 업로드',
        2: '다이빙 정보',
        3: '개인 정보',
        4: '완료!',
    };

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
                            {step}단계: {stepTitles[step]}
                        </p>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4">
                {/* Step 1: Photo Upload */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <PhotoUploader
                            onPhotosProcessed={handlePhotosProcessed}
                            isLoggedIn={isLoggedIn}
                            onLoginClick={signInWithGoogle}
                        />

                        <div className="text-center">
                            <button
                                onClick={handleSkipPhotos}
                                className="text-sm text-slate-400 hover:text-white transition-colors underline"
                            >
                                사진 없이 직접 작성하기
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Common Info (Shareable) */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-400">
                                🌊 다른 다이버와 공유할 수 있는 정보입니다
                            </p>
                        </div>

                        {/* Auto-matched Site Banner */}
                        {matchedSite && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📍</span>
                                    <div>
                                        <p className="text-sm text-green-300 font-medium">
                                            GPS 기반 자동 매칭됨
                                        </p>
                                        <p className="text-lg text-white font-semibold">
                                            {matchedSite.name} {matchedSite.nameLocal && `(${matchedSite.nameLocal})`}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {matchedSite.region}, {matchedSite.country}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Diving Site */}
                        <section className="logbook-section">
                            <h2 className="section-title">🏝️ Diving Site</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="field-label">사이트명</label>
                                    <input
                                        type="text"
                                        value={commonData.diveSiteName}
                                        onChange={e => setCommonData({ ...commonData, diveSiteName: e.target.value })}
                                        className="field-input text-lg font-semibold"
                                        placeholder="다이빙 사이트 이름"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label">날짜</label>
                                    <input
                                        type="date"
                                        value={commonData.date}
                                        onChange={e => setCommonData({ ...commonData, date: e.target.value })}
                                        className="field-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label">국가</label>
                                    <input
                                        type="text"
                                        value={commonData.country}
                                        onChange={e => setCommonData({ ...commonData, country: e.target.value })}
                                        className="field-input"
                                        placeholder="Korea"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Time */}
                        <section className="logbook-section">
                            <h2 className="section-title">⏱️ Time</h2>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="field-label">Surface Interval</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.surfaceInterval || ''}
                                            onChange={e => setCommonData({ ...commonData, surfaceInterval: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="60"
                                        />
                                        <span className="text-slate-400 text-sm">min</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Diving Time</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.divingTime || ''}
                                            onChange={e => setCommonData({ ...commonData, divingTime: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="45"
                                            required
                                        />
                                        <span className="text-slate-400 text-sm">min</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Start</label>
                                    <input
                                        type="time"
                                        value={commonData.timeStart}
                                        onChange={e => setCommonData({ ...commonData, timeStart: e.target.value })}
                                        className="field-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label">End</label>
                                    <input
                                        type="time"
                                        value={commonData.timeEnd}
                                        onChange={e => setCommonData({ ...commonData, timeEnd: e.target.value })}
                                        className="field-input"
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Depth & Temp */}
                        <section className="logbook-section">
                            <h2 className="section-title">📏 Depth & Temperature</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">Max Depth</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={commonData.maxDepth || ''}
                                            onChange={e => setCommonData({ ...commonData, maxDepth: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="18"
                                        />
                                        <span className="text-slate-400 text-sm">m</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Avg Depth</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={commonData.avgDepth || ''}
                                            onChange={e => setCommonData({ ...commonData, avgDepth: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="12"
                                        />
                                        <span className="text-slate-400 text-sm">m</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Visibility</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.visibility || ''}
                                            onChange={e => setCommonData({ ...commonData, visibility: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="15"
                                        />
                                        <span className="text-slate-400 text-sm">m</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3">
                                <div>
                                    <label className="field-label">Min Temp</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.tempMin || ''}
                                            onChange={e => setCommonData({ ...commonData, tempMin: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="20"
                                        />
                                        <span className="text-slate-400 text-sm">°C</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Max Temp</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.tempMax || ''}
                                            onChange={e => setCommonData({ ...commonData, tempMax: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="24"
                                        />
                                        <span className="text-slate-400 text-sm">°C</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Avg Temp</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={commonData.tempAvg || ''}
                                            onChange={e => setCommonData({ ...commonData, tempAvg: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="22"
                                        />
                                        <span className="text-slate-400 text-sm">°C</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Conditions */}
                        <section className="logbook-section">
                            <h2 className="section-title">🌊 Conditions</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">Weather</label>
                                    <select
                                        value={commonData.weather}
                                        onChange={e => setCommonData({ ...commonData, weather: e.target.value as WeatherIcon })}
                                        className="field-input"
                                    >
                                        <option value="">-</option>
                                        <option value="sunny">☀️ 맑음</option>
                                        <option value="partly_cloudy">⛅ 구름 조금</option>
                                        <option value="cloudy">☁️ 흐림</option>
                                        <option value="rainy">🌧️ 비</option>
                                        <option value="stormy">⛈️ 폭풍</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Current</label>
                                    <select
                                        value={commonData.current}
                                        onChange={e => setCommonData({ ...commonData, current: e.target.value })}
                                        className="field-input"
                                    >
                                        <option value="">-</option>
                                        <option value="none">없음</option>
                                        <option value="weak">약함</option>
                                        <option value="moderate">보통</option>
                                        <option value="strong">강함</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Entry</label>
                                    <select
                                        value={commonData.entryMethod}
                                        onChange={e => setCommonData({ ...commonData, entryMethod: e.target.value as EntryMethod })}
                                        className="field-input"
                                    >
                                        <option value="">-</option>
                                        <option value="giant_stride">Giant Stride</option>
                                        <option value="back_roll">Back Roll</option>
                                        <option value="controlled_seated">Controlled Seated</option>
                                        <option value="shore">Shore</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="field-label">Wave</label>
                                    <select
                                        value={commonData.wave}
                                        onChange={e => setCommonData({ ...commonData, wave: e.target.value })}
                                        className="field-input"
                                    >
                                        <option value="">-</option>
                                        <option value="calm">잔잔</option>
                                        <option value="slight">약간</option>
                                        <option value="moderate">보통</option>
                                        <option value="rough">거침</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Wind</label>
                                    <select
                                        value={commonData.wind}
                                        onChange={e => setCommonData({ ...commonData, wind: e.target.value })}
                                        className="field-input"
                                    >
                                        <option value="">-</option>
                                        <option value="calm">없음</option>
                                        <option value="light">약함</option>
                                        <option value="moderate">보통</option>
                                        <option value="strong">강함</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Navigation */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                            >
                                이전
                            </button>
                            <button
                                onClick={handleStep2Next}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Personal Info */}
                {step === 3 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-400">
                                🔒 개인 장비 및 팀 정보 (비공개)
                            </p>
                        </div>

                        {/* Air Tank */}
                        <section className="logbook-section">
                            <h2 className="section-title">🛢️ Air Tank</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="field-label">Material</label>
                                    <select
                                        value={personalData.tankMaterial}
                                        onChange={e => setPersonalData({ ...personalData, tankMaterial: e.target.value as TankMaterial })}
                                        className="field-input"
                                    >
                                        <option value="aluminum">Aluminum</option>
                                        <option value="steel">Steel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Config</label>
                                    <select
                                        value={personalData.tankConfig}
                                        onChange={e => setPersonalData({ ...personalData, tankConfig: e.target.value as TankConfig })}
                                        className="field-input"
                                    >
                                        <option value="single">Single</option>
                                        <option value="double">Double</option>
                                        <option value="sidemount">Sidemount</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mt-3">
                                <div>
                                    <label className="field-label">Gas</label>
                                    <select
                                        value={personalData.gasMix}
                                        onChange={e => setPersonalData({ ...personalData, gasMix: e.target.value as GasMix })}
                                        className="field-input"
                                    >
                                        <option value="air">Air</option>
                                        <option value="nitrox">Nitrox</option>
                                        <option value="trimix">Trimix</option>
                                    </select>
                                </div>
                                {personalData.gasMix === 'nitrox' && (
                                    <div>
                                        <label className="field-label">O₂ %</label>
                                        <input
                                            type="number"
                                            value={personalData.nitroxPercent || ''}
                                            onChange={e => setPersonalData({ ...personalData, nitroxPercent: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="32"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="field-label">Start</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={personalData.pressureStart || ''}
                                            onChange={e => setPersonalData({ ...personalData, pressureStart: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="200"
                                        />
                                        <span className="text-slate-400 text-sm">bar</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">End</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={personalData.pressureEnd || ''}
                                            onChange={e => setPersonalData({ ...personalData, pressureEnd: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="50"
                                        />
                                        <span className="text-slate-400 text-sm">bar</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Weight */}
                        <section className="logbook-section">
                            <h2 className="section-title">⚖️ Weight</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="field-label">Belt</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={personalData.weightBelt || ''}
                                            onChange={e => setPersonalData({ ...personalData, weightBelt: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="4"
                                        />
                                        <span className="text-slate-400 text-sm">kg</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">Pocket</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={personalData.weightPocket || ''}
                                            onChange={e => setPersonalData({ ...personalData, weightPocket: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="2"
                                        />
                                        <span className="text-slate-400 text-sm">kg</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Instruments */}
                        <section className="logbook-section">
                            <h2 className="section-title">🔧 Instruments</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">Fins</label>
                                    <input
                                        type="text"
                                        value={personalData.fins}
                                        onChange={e => setPersonalData({ ...personalData, fins: e.target.value })}
                                        className="field-input"
                                        placeholder="모델명"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Mask</label>
                                    <input
                                        type="text"
                                        value={personalData.mask}
                                        onChange={e => setPersonalData({ ...personalData, mask: e.target.value })}
                                        className="field-input"
                                        placeholder="모델명"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Suit</label>
                                    <input
                                        type="text"
                                        value={personalData.suit}
                                        onChange={e => setPersonalData({ ...personalData, suit: e.target.value })}
                                        className="field-input"
                                        placeholder="5mm/3mm"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Computer</label>
                                    <input
                                        type="text"
                                        value={personalData.computer}
                                        onChange={e => setPersonalData({ ...personalData, computer: e.target.value })}
                                        className="field-input"
                                        placeholder="모델명"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Regulator</label>
                                    <input
                                        type="text"
                                        value={personalData.regulator}
                                        onChange={e => setPersonalData({ ...personalData, regulator: e.target.value })}
                                        className="field-input"
                                        placeholder="모델명"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">BCD</label>
                                    <input
                                        type="text"
                                        value={personalData.bcd}
                                        onChange={e => setPersonalData({ ...personalData, bcd: e.target.value })}
                                        className="field-input"
                                        placeholder="모델명"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-4">
                                {[
                                    { key: 'snorkel', label: 'Snorkel' },
                                    { key: 'gloves', label: 'Gloves' },
                                    { key: 'boots', label: 'Boots' },
                                    { key: 'hood', label: 'Hood' },
                                    { key: 'swimwear', label: 'Swimwear' },
                                ].map(item => (
                                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={personalData[item.key as keyof typeof personalData] as boolean}
                                            onChange={e => setPersonalData({ ...personalData, [item.key]: e.target.checked })}
                                            className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                        />
                                        <span className="text-sm text-slate-300">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Team */}
                        <section className="logbook-section">
                            <h2 className="section-title">👥 Team</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">Instructor</label>
                                    <input
                                        type="text"
                                        value={personalData.instructor}
                                        onChange={e => setPersonalData({ ...personalData, instructor: e.target.value })}
                                        className="field-input"
                                        placeholder="강사 이름"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Buddy</label>
                                    <input
                                        type="text"
                                        value={personalData.buddy}
                                        onChange={e => setPersonalData({ ...personalData, buddy: e.target.value })}
                                        className="field-input"
                                        placeholder="버디 이름"
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Guide</label>
                                    <input
                                        type="text"
                                        value={personalData.guide}
                                        onChange={e => setPersonalData({ ...personalData, guide: e.target.value })}
                                        className="field-input"
                                        placeholder="가이드 이름"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Notes */}
                        <section className="logbook-section">
                            <h2 className="section-title">📝 Notes</h2>
                            <textarea
                                value={personalData.notes}
                                onChange={e => setPersonalData({ ...personalData, notes: e.target.value })}
                                className="field-input min-h-[120px] resize-y"
                                placeholder="다이빙 중 관찰한 생물, 특이사항, 느낀점 등을 기록하세요..."
                            />
                        </section>

                        {/* Navigation */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                            >
                                이전
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors disabled:opacity-50"
                            >
                                {isSaving ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === 4 && (
                    <div className="animate-fade-in text-center py-12 space-y-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse-glow">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">로그 저장 완료!</h2>
                            <p className="text-slate-400">다이빙 로그가 성공적으로 저장되었습니다</p>
                        </div>

                        {/* Share URL Copy */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-w-sm mx-auto">
                            <p className="text-sm text-slate-400 mb-3">🔗 로그 공유하기</p>
                            <button
                                onClick={handleCopyShareUrl}
                                className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${shareUrlCopied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                                    }`}
                            >
                                {shareUrlCopied ? '✓ 복사됨!' : 'URL 복사하기'}
                            </button>
                        </div>

                        <Link href="/" className="btn-primary inline-flex items-center gap-2">
                            홈으로 돌아가기
                        </Link>
                    </div>
                )}
            </main>

            {/* Saving Overlay */}
            {isSaving && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card p-8 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-white">로그 저장 중...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
