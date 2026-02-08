// New Dive Log Page - 3 Step Form
// Step 1: Photo Upload (EXIF extraction)
// Step 2: Common Info (shareable)
// Step 3: Personal Info + Save + Share URL

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { findNearestDiveSite, findDiveSitesNearby, type DiveSite, type MatchResult } from '@/lib/dive-sites';
import { PhotoUploader } from '@/components/PhotoUploader';
import { LoginButton } from '@/components/LoginButton';
import { useDiveLog } from '@/hooks/useDiveLog';
import { useAuth } from '@/hooks/useAuth';
import { APP_VERSION, type ExifResult } from '@/hooks/useExifExtractor';
import { useLanguage } from '@/contexts/LanguageContext';
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
    const { t } = useLanguage();
    const [step, setStep] = useState<Step>(1);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [savePhotos, setSavePhotos] = useState(false);
    const [savedLogId, setSavedLogId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shareUrlCopied, setShareUrlCopied] = useState(false);
    const [matchedSite, setMatchedSite] = useState<DiveSite | null>(null);
    const [siteSuggestions, setSiteSuggestions] = useState<MatchResult[]>([]);
    const [showSiteSelector, setShowSiteSelector] = useState(false);

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
        airTemp: 0,
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
    const fetchWeatherData = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error('Weather fetch failed');
            const data = await response.json();

            // Map weather condition to icon
            const mapConditionToIcon = (condition: string): WeatherIcon => {
                const c = condition.toLowerCase();
                if (c.includes('clear')) return 'sunny';
                if (c.includes('cloud')) {
                    if (c.includes('partly')) return 'partly_cloudy';
                    return 'cloudy';
                }
                if (c.includes('rain') || c.includes('drizzle')) return 'rainy';
                if (c.includes('storm')) return 'stormy';
                if (c.includes('snow')) return 'snowy';
                return 'sunny'; // Default
            };

            setCommonData(prev => ({
                ...prev,
                weather: mapConditionToIcon(data.condition),
                tempAvg: data.airTemperature,
                tempMin: data.airTemperature - 2,
                tempMax: data.airTemperature + 2,
                wind: `${data.windSpeed}m/s`,
                visibility: data.visibility ? parseInt(data.visibility) : prev.visibility,
            }));
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
        }
    };

    const handlePhotosProcessed = useCallback((results: ExifResult[], files: File[], shouldSavePhotos: boolean) => {
        setSavePhotos(shouldSavePhotos);

        if (results.length > 0) {
            const latestResult = results[0];
            const oldestResult = results[results.length - 1];

            // ... divingTime calculation remains same ...
            let divingTime = 45;
            if (latestResult.data?.dateTaken && oldestResult.data?.dateTaken) {
                const start = new Date(oldestResult.data.dateTaken);
                const end = new Date(latestResult.data.dateTaken);
                divingTime = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
            }

            const extracted: ExtractedData = {
                date: latestResult.data?.dateTaken
                    ? latestResult.data.dateTaken.split('T')[0]
                    : new Date().toISOString().split('T')[0],
                timeStart: oldestResult.data?.dateTaken
                    ? oldestResult.data.dateTaken.split('T')[1]?.slice(0, 5) || ''
                    : '',
                timeEnd: latestResult.data?.dateTaken
                    ? latestResult.data.dateTaken.split('T')[1]?.slice(0, 5) || ''
                    : '',
                gpsLat: latestResult.data?.gpsLat ?? undefined,
                gpsLng: latestResult.data?.gpsLng ?? undefined,
                divingTime,
            };

            setExtractedData(extracted);

            // Auto-match Logic Updated
            let autoMatchedSite: DiveSite | null = null;
            if (extracted.gpsLat && extracted.gpsLng) {
                // Search for sites within 10km
                const matches = findDiveSitesNearby(extracted.gpsLat, extracted.gpsLng, 10000);

                if (matches.length > 0) {
                    setSiteSuggestions(matches);
                    autoMatchedSite = matches[0].site; // Pick closest by default
                    setMatchedSite(matches[0].site);
                } else {
                    setSiteSuggestions([]);
                    setMatchedSite(null);
                }

                // Fetch weather data
                fetchWeatherData(extracted.gpsLat, extracted.gpsLng);
            }

            setCommonData(prev => ({
                ...prev,
                date: extracted.date,
                timeStart: extracted.timeStart,
                timeEnd: extracted.timeEnd,
                divingTime: extracted.divingTime,
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

    const handleSelectSite = (site: DiveSite) => {
        setMatchedSite(site);
        setCommonData(prev => ({
            ...prev,
            diveSiteName: site.name,
            country: site.country,
        }));
        setShowSiteSelector(false);
    };

    return (
        <div className="min-h-screen pb-8">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-bold text-white">
                        {step === 1 ? t('logNew.step1Title') :
                            step === 2 ? t('logNew.step2Title') :
                                step === 3 ? t('logNew.step3Title') : t('logNew.successTitle')}
                    </h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4">
                {/* Step 1: Photo Upload */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {t('logNew.newDiveLog')}
                            </h1>
                            <p className="text-slate-400">
                                {t('logNew.step1Sub')}
                            </p>
                        </div>

                        <PhotoUploader
                            onPhotosProcessed={handlePhotosProcessed}
                            isLoggedIn={isLoggedIn}
                            onLoginClick={signInWithGoogle}
                        />

                        <div className="mt-8 pt-8 border-t border-slate-700/50 text-center">
                            <button
                                onClick={handleSkipPhotos}
                                className="text-slate-500 hover:text-slate-400 text-sm underline underline-offset-4 transition-colors"
                            >
                                {t('logNew.skipPhotos')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Common Info */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-400">
                                {t('logNew.step2Sub')}
                            </p>
                        </div>

                        {/* Matched Site Banner & Selector */}
                        {matchedSite && (
                            <div className="space-y-3">
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl relative overflow-hidden">
                                    <div className="flex items-center gap-3 relative z-10">
                                        <span className="text-2xl">PD</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-green-400 font-medium mb-0.5">
                                                {t('logNew.matchedSiteTitle')}
                                            </p>
                                            <p className="text-lg text-white font-semibold truncate">
                                                {matchedSite.name}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {matchedSite.region}, {matchedSite.country}
                                            </p>
                                        </div>

                                        {siteSuggestions.length > 1 && (
                                            <button
                                                onClick={() => setShowSiteSelector(!showSiteSelector)}
                                                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                                            >
                                                {t('logNew.changeSite')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Site Selector Dropdown */}
                                {showSiteSelector && siteSuggestions.length > 1 && (
                                    <div className="animate-fade-in bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                                        <div className="p-3 bg-slate-750 border-b border-slate-700">
                                            <p className="text-xs text-slate-400">{t('logNew.nearbySites')}</p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {siteSuggestions.map((match) => (
                                                <button
                                                    key={match.site.id}
                                                    onClick={() => handleSelectSite(match.site)}
                                                    className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0 flex items-center justify-between ${matchedSite.id === match.site.id ? 'bg-slate-700/50' : ''
                                                        }`}
                                                >
                                                    <div>
                                                        <p className={`font-medium ${matchedSite.id === match.site.id ? 'text-green-400' : 'text-white'}`}>
                                                            {match.site.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {(match.distance / 1000).toFixed(1)}km • {match.site.region}
                                                        </p>
                                                    </div>
                                                    {matchedSite.id === match.site.id && (
                                                        <span className="text-green-400 text-sm">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Diving Site Form */}
                        <section className="logbook-section">
                            <h2 className="section-title">{t('logNew.sectionSite')}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="field-label">{t('logNew.siteName')}</label>
                                    <input
                                        type="text"
                                        value={commonData.diveSiteName}
                                        onChange={e => setCommonData({ ...commonData, diveSiteName: e.target.value })}
                                        className="field-input text-lg font-semibold"
                                        placeholder={t('logNew.sitePlaceholder')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.date')}</label>
                                    <input
                                        type="date"
                                        value={commonData.date}
                                        onChange={e => setCommonData({ ...commonData, date: e.target.value })}
                                        className="field-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.country')}</label>
                                    <input
                                        type="text"
                                        value={commonData.country}
                                        onChange={e => setCommonData({ ...commonData, country: e.target.value })}
                                        className="field-input"
                                        placeholder={t('logNew.countryPlaceholder')}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Time */}
                        <section className="logbook-section">
                            <h2 className="section-title">{t('logNew.sectionTime')}</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="col-span-1">
                                    <label className="field-label">
                                        {t('logNew.startTime')}
                                        <span className="block text-xs font-normal text-slate-500">{t('logNew.localTimeNote')}</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={commonData.timeStart}
                                        onChange={e => {
                                            const newStart = e.target.value;
                                            setCommonData(prev => {
                                                const newData = { ...prev, timeStart: newStart };
                                                if (newStart && prev.timeEnd) {
                                                    const start = new Date(`1970-01-01T${newStart}:00`);
                                                    const end = new Date(`1970-01-01T${prev.timeEnd}:00`);
                                                    let diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                                                    if (diff < 0) diff += 24 * 60; // Handle overnight
                                                    newData.divingTime = diff;
                                                }
                                                return newData;
                                            });
                                        }}
                                        className="field-input min-h-[44px]"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label">
                                        {t('logNew.endTime')}
                                        <span className="block text-xs font-normal text-slate-500">{t('logNew.localTimeNote')}</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={commonData.timeEnd}
                                        onChange={e => {
                                            const newEnd = e.target.value;
                                            setCommonData(prev => {
                                                const newData = { ...prev, timeEnd: newEnd };
                                                if (newEnd && prev.timeStart) {
                                                    const start = new Date(`1970-01-01T${prev.timeStart}:00`);
                                                    const end = new Date(`1970-01-01T${newEnd}:00`);
                                                    let diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                                                    if (diff < 0) diff += 24 * 60; // Handle overnight
                                                    newData.divingTime = diff;
                                                }
                                                return newData;
                                            });
                                        }}
                                        className="field-input min-h-[44px]"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label">{t('logNew.divingTime')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.divingTime || ''}
                                            onChange={e => {
                                                const newDivingTime = Number(e.target.value);
                                                setCommonData(prev => {
                                                    const newData = { ...prev, divingTime: newDivingTime };
                                                    // Optionally update End Time when Diving Time changes?
                                                    // User didn't explicitly ask for this direction but "서로 상호작용" suggests it.
                                                    // If Start exists, update End.
                                                    if (newDivingTime > 0 && prev.timeStart) {
                                                        const start = new Date(`1970-01-01T${prev.timeStart}:00`);
                                                        const end = new Date(start.getTime() + newDivingTime * 60 * 1000);
                                                        newData.timeEnd = end.toTimeString().slice(0, 5);
                                                    }
                                                    return newData;
                                                });
                                            }}
                                            className="field-input"
                                            placeholder="45"
                                            required
                                        />
                                        <span className="input-unit">min</span>
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label">{t('logNew.surfaceInterval')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.surfaceInterval || ''}
                                            onChange={e => setCommonData({ ...commonData, surfaceInterval: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="60"
                                        />
                                        <span className="input-unit">min</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Depth & Temp */}
                        <section className="logbook-section">
                            <h2 className="section-title">{t('logNew.sectionDepth')}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">{t('logNew.maxDepth')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={commonData.maxDepth || ''}
                                            onChange={e => setCommonData({ ...commonData, maxDepth: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="18"
                                        />
                                        <span className="input-unit">m</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.avgDepth')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={commonData.avgDepth || ''}
                                            onChange={e => setCommonData({ ...commonData, avgDepth: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="12"
                                        />
                                        <span className="input-unit">m</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.visibility')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.visibility || ''}
                                            onChange={e => setCommonData({ ...commonData, visibility: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="15"
                                        />
                                        <span className="input-unit">m</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                <div>
                                    <label className="field-label">{t('logNew.minTemp')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.tempMin || ''}
                                            onChange={e => setCommonData({ ...commonData, tempMin: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="20"
                                        />
                                        <span className="input-unit">°C</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.maxTemp')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.tempMax || ''}
                                            onChange={e => setCommonData({ ...commonData, tempMax: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="24"
                                        />
                                        <span className="input-unit">°C</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.avgTemp')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.tempAvg || ''}
                                            onChange={e => setCommonData({ ...commonData, tempAvg: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="22"
                                        />
                                        <span className="input-unit">°C</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Conditions */}
                        <section className="logbook-section">
                            <h2 className="section-title">{t('logNew.sectionConditions')}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">{t('logNew.weather')}</label>
                                    <select
                                        value={commonData.weather}
                                        onChange={e => setCommonData({ ...commonData, weather: e.target.value as WeatherIcon })}
                                        className="field-input min-h-[44px]"
                                    >
                                        <option value="">-</option>
                                        <option value="sunny">{t('logNew.weatherSunny')}</option>
                                        <option value="partly_cloudy">{t('logNew.weatherPartlyCloudy')}</option>
                                        <option value="cloudy">{t('logNew.weatherCloudy')}</option>
                                        <option value="rainy">{t('logNew.weatherRainy')}</option>
                                        <option value="stormy">{t('logNew.weatherStormy')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.airTemp')}</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            value={commonData.airTemp || ''}
                                            onChange={e => setCommonData({ ...commonData, airTemp: Number(e.target.value) })}
                                            className="field-input"
                                            placeholder="30"
                                        />
                                        <span className="input-unit">°C</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.current')}</label>
                                    <select
                                        value={commonData.current}
                                        onChange={e => setCommonData({ ...commonData, current: e.target.value })}
                                        className="field-input min-h-[44px]"
                                    >
                                        <option value="">-</option>
                                        <option value="none">{t('logNew.currentNone')}</option>
                                        <option value="weak">{t('logNew.currentWeak')}</option>
                                        <option value="moderate">{t('logNew.currentModerate')}</option>
                                        <option value="strong">{t('logNew.currentStrong')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.entry')}</label>
                                    <select
                                        value={commonData.entryMethod}
                                        onChange={e => setCommonData({ ...commonData, entryMethod: e.target.value as EntryMethod })}
                                        className="field-input min-h-[44px]"
                                    >
                                        <option value="">-</option>
                                        <option value="giant_stride">{t('logNew.entryGiant')}</option>
                                        <option value="back_roll">{t('logNew.entryBackRoll')}</option>
                                        <option value="controlled_seated">{t('logNew.entrySeated')}</option>
                                        <option value="shore">{t('logNew.entryShore')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.wave')}</label>
                                    <select
                                        value={commonData.wave}
                                        onChange={e => setCommonData({ ...commonData, wave: e.target.value })}
                                        className="field-input min-h-[44px]"
                                    >
                                        <option value="">-</option>
                                        <option value="calm">{t('logNew.waveCalm')}</option>
                                        <option value="slight">{t('logNew.waveSlight')}</option>
                                        <option value="moderate">{t('logNew.waveModerate')}</option>
                                        <option value="rough">{t('logNew.waveRough')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">{t('logNew.wind')}</label>
                                    <select
                                        value={commonData.wind}
                                        onChange={e => setCommonData({ ...commonData, wind: e.target.value })}
                                        className="field-input min-h-[44px]"
                                    >
                                        <option value="">-</option>
                                        <option value="calm">{t('logNew.windNone')}</option>
                                        <option value="light">{t('logNew.windLight')}</option>
                                        <option value="moderate">{t('logNew.windModerate')}</option>
                                        <option value="strong">{t('logNew.windStrong')}</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Navigation */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors text-lg"
                            >
                                {t('common.prev')}
                            </button>
                            <button
                                onClick={handleStep2Next}
                                className="flex-1 py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors text-lg"
                            >
                                {t('common.next')}
                            </button>
                        </div>
                    </div>
                )
                }

                {/* Step 3: Personal Logs */}
                {
                    step === 3 && (
                        <div className="animate-fade-in space-y-6">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-400">
                                    {t('logNew.step3Sub')}
                                </p>
                            </div>

                            {/* Air Tank */}
                            <section className="logbook-section">
                                <h2 className="section-title">{t('logNew.sectionTank')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="field-label">{t('logNew.material')}</label>
                                        <select
                                            value={personalData.tankMaterial}
                                            onChange={e => setPersonalData({ ...personalData, tankMaterial: e.target.value as TankMaterial })}
                                            className="field-input"
                                        >
                                            <option value="aluminum">{t('logNew.tankAluminum')}</option>
                                            <option value="steel">{t('logNew.tankSteel')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.config')}</label>
                                        <select
                                            value={personalData.tankConfig}
                                            onChange={e => setPersonalData({ ...personalData, tankConfig: e.target.value as TankConfig })}
                                            className="field-input"
                                        >
                                            <option value="single">{t('logNew.tankSingle')}</option>
                                            <option value="double">{t('logNew.tankDouble')}</option>
                                            <option value="sidemount">{t('logNew.tankSidemount')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    <div>
                                        <label className="field-label">{t('logNew.gas')}</label>
                                        <select
                                            value={personalData.gasMix}
                                            onChange={e => setPersonalData({ ...personalData, gasMix: e.target.value as GasMix })}
                                            className="field-input"
                                        >
                                            <option value="air">{t('logNew.gasAir')}</option>
                                            <option value="nitrox">{t('logNew.gasNitrox')}</option>
                                            <option value="trimix">{t('logNew.gasTrimix')}</option>
                                        </select>
                                    </div>
                                    {personalData.gasMix === 'nitrox' && (
                                        <div>
                                            <label className="field-label">O₂ %</label>
                                            <div className="input-group">
                                                <input
                                                    type="number"
                                                    value={personalData.nitroxPercent || ''}
                                                    onChange={e => setPersonalData({ ...personalData, nitroxPercent: Number(e.target.value) })}
                                                    className="field-input"
                                                    placeholder="32"
                                                />
                                                <span className="input-unit">%</span>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="field-label">{t('logNew.startPressure')}</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                value={personalData.pressureStart || ''}
                                                onChange={e => setPersonalData({ ...personalData, pressureStart: Number(e.target.value) })}
                                                className="field-input"
                                                placeholder="200"
                                            />
                                            <span className="input-unit">bar</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.endPressure')}</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                value={personalData.pressureEnd || ''}
                                                onChange={e => setPersonalData({ ...personalData, pressureEnd: Number(e.target.value) })}
                                                className="field-input"
                                                placeholder="50"
                                            />
                                            <span className="input-unit">bar</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Weight */}
                            <section className="logbook-section">
                                <h2 className="section-title">{t('logNew.sectionWeight')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="field-label">{t('logNew.belt')}</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                value={personalData.weightBelt || ''}
                                                onChange={e => setPersonalData({ ...personalData, weightBelt: Number(e.target.value) })}
                                                className="field-input"
                                                placeholder="4"
                                            />
                                            <span className="input-unit">kg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.pocket')}</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                value={personalData.weightPocket || ''}
                                                onChange={e => setPersonalData({ ...personalData, weightPocket: Number(e.target.value) })}
                                                className="field-input"
                                                placeholder="2"
                                            />
                                            <span className="input-unit">kg</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Instruments */}
                            <section className="logbook-section">
                                <h2 className="section-title">{t('logNew.sectionInstruments')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="field-label">{t('logNew.fins')}</label>
                                        <input
                                            type="text"
                                            value={personalData.fins}
                                            onChange={e => setPersonalData({ ...personalData, fins: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.modelPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.mask')}</label>
                                        <input
                                            type="text"
                                            value={personalData.mask}
                                            onChange={e => setPersonalData({ ...personalData, mask: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.modelPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.suit')}</label>
                                        <input
                                            type="text"
                                            value={personalData.suit}
                                            onChange={e => setPersonalData({ ...personalData, suit: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.suitPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.computer')}</label>
                                        <input
                                            type="text"
                                            value={personalData.computer}
                                            onChange={e => setPersonalData({ ...personalData, computer: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.modelPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.regulator')}</label>
                                        <input
                                            type="text"
                                            value={personalData.regulator}
                                            onChange={e => setPersonalData({ ...personalData, regulator: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.modelPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.bcd')}</label>
                                        <input
                                            type="text"
                                            value={personalData.bcd}
                                            onChange={e => setPersonalData({ ...personalData, bcd: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.modelPlaceholder')}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-4">
                                    {[
                                        { key: 'snorkel', label: t('logNew.snorkel') },
                                        { key: 'gloves', label: t('logNew.gloves') },
                                        { key: 'boots', label: t('logNew.boots') },
                                        { key: 'hood', label: t('logNew.hood') },
                                        { key: 'swimwear', label: t('logNew.swimwear') },
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
                                <h2 className="section-title">{t('logNew.sectionTeam')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="field-label">{t('logNew.instructor')}</label>
                                        <input
                                            type="text"
                                            value={personalData.instructor}
                                            onChange={e => setPersonalData({ ...personalData, instructor: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.namePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.buddy')}</label>
                                        <input
                                            type="text"
                                            value={personalData.buddy}
                                            onChange={e => setPersonalData({ ...personalData, buddy: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.namePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label">{t('logNew.guide')}</label>
                                        <input
                                            type="text"
                                            value={personalData.guide}
                                            onChange={e => setPersonalData({ ...personalData, guide: e.target.value })}
                                            className="field-input"
                                            placeholder={t('logNew.namePlaceholder')}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Notes */}
                            <section className="logbook-section">
                                <h2 className="section-title">{t('logNew.sectionNotes')}</h2>
                                <textarea
                                    value={personalData.notes}
                                    onChange={e => setPersonalData({ ...personalData, notes: e.target.value })}
                                    className="field-input min-h-[120px] resize-y"
                                    placeholder={t('logNew.notesPlaceholder')}
                                />
                            </section>

                            {/* Navigation */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-4 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors text-lg"
                                >
                                    {t('common.prev')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors disabled:opacity-50 text-lg"
                                >
                                    {isSaving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Step 4: Complete */}
                {
                    step === 4 && (
                        <div className="animate-fade-in text-center py-12 space-y-8">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse-glow">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{t('logNew.logSaved')}</h2>
                                <p className="text-slate-400">{t('logNew.logSavedSub')}</p>
                            </div>

                            {/* Navigation */}
                            <div className="flex gap-4 mb-8">
                                <Link
                                    href="/"
                                    className="flex-1 py-4 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-center transition-colors text-lg"
                                >
                                    {t('logNew.backToList')}
                                </Link>
                                {!isLoggedIn ? (
                                    <button
                                        onClick={signInWithGoogle}
                                        className="flex-1 py-4 px-4 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-lg"
                                    >
                                        {t('logNew.loginToShare')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCopyShareUrl}
                                        className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all text-lg flex items-center justify-center gap-2 ${shareUrlCopied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/30'
                                            }`}
                                    >
                                        {shareUrlCopied ? (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {t('logNew.copied')}
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                                                {t('logNew.copyLink')}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>


                        </div>
                    )
                }
            </main >

            {/* Saving Overlay */}
            {
                isSaving && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="card p-8 text-center">
                            <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-white">{t('common.saving')}</p>
                        </div>
                    </div>
                )
            }

            {/* Version Footer */}
            <div className="fixed bottom-2 right-2 text-xs text-slate-600">
                {APP_VERSION}
            </div>
        </div >
    );
}
