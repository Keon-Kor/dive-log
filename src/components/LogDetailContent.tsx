'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShareButton } from '@/components/ShareButton';
import type { DiveLog } from '@/lib/types';

interface LogDetailContentProps {
    log: DiveLog;
}

export function LogDetailContent({ log }: LogDetailContentProps) {
    const { t, language } = useLanguage();

    // Helper to format time
    const formatTime = (time: string) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    };

    return (
        <div className="min-h-screen bg-background text-text-primary pb-safe">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <Link
                        href="/"
                        className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                        aria-label={t('logDetail.backToList')}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <span className="font-semibold text-body opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                        {formatDate(log.date)}
                    </span>
                    <ShareButton logId={log.id} />
                </div>
            </header>

            <main className="max-w-md mx-auto px-5 py-6 space-y-8 animate-slide-up-fade">
                {/* Hero / Site Info */}
                <section className="text-center space-y-2">
                    <h1 className="text-h1 leading-tight">{log.diveSiteName}</h1>
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-body">
                        <span>📍</span>
                        <span>{log.country || 'Location Unknown'}</span>
                        {log.gpsLat && log.gpsLng && (
                            <a
                                href={`https://www.google.com/maps?q=${log.gpsLat},${log.gpsLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-toss-blue ml-1 text-sm font-medium hover:underline"
                            >
                                {t('logDetail.viewMap')}
                            </a>
                        )}
                    </div>
                </section>

                {/* Key Stats Cards */}
                <section className="grid grid-cols-3 gap-3">
                    <div className="card-toss p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-slate-400 mb-1">{t('logDetail.maxDepth')}</span>
                        <div>
                            <span className="text-xl font-bold text-toss-blue">{log.maxDepth}</span>
                            <span className="text-xs text-slate-500 ml-0.5">m</span>
                        </div>
                    </div>
                    <div className="card-toss p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-slate-400 mb-1">{t('logDetail.divingTime')}</span>
                        <div>
                            <span className="text-xl font-bold text-white">{log.divingTime}</span>
                            <span className="text-xs text-slate-500 ml-0.5">{t('logCard.min')}</span>
                        </div>
                    </div>
                    <div className="card-toss p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-slate-400 mb-1">{t('logDetail.avgTemp')}</span>
                        <div>
                            <span className="text-xl font-bold text-white">{log.tempAvg || '-'}</span>
                            <span className="text-xs text-slate-500 ml-0.5">°C</span>
                        </div>
                    </div>
                </section>

                {/* Photos */}
                {log.photos && log.photos.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-h3">{t('logDetail.photos')}</h2>
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-hide snap-x">
                            {log.photos.map((photo: any) => (
                                <div key={photo.id} className="flex-none w-64 aspect-[4/3] relative rounded-2xl overflow-hidden bg-slate-800 snap-center shadow-lg">
                                    <img
                                        src={photo.thumbnailUrl}
                                        alt="Dive photo"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Dive Details */}
                <section className="space-y-3">
                    <h2 className="text-h3">{t('logDetail.details')}</h2>
                    <div className="card-toss space-y-5">
                        {/* Time */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('logDetail.sectionTime')}</h4>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex gap-8">
                                    <div>
                                        <span className="text-slate-400 block text-xs mb-0.5">{t('logDetail.timeIn')}</span>
                                        <span className="font-mono text-white text-base">{formatTime(log.timeStart)}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-xs mb-0.5">{t('logDetail.timeOut')}</span>
                                        <span className="font-mono text-white text-base">{formatTime(log.timeEnd)}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs mb-0.5 text-right">{t('logDetail.surfaceInterval')}</span>
                                    <span className="font-mono text-white text-base">{log.surfaceInterval || '-'} {t('logCard.min')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800" />

                        {/* Conditions */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('logDetail.sectionConditions')}</h4>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.weather')}</span>
                                    <div className="text-white capitalize mt-0.5">
                                        {log.weather ? t(`logNew.weather${log.weather.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.visibility')}</span>
                                    <div className="text-white mt-0.5">{log.visibility ? `${log.visibility}m` : '-'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.current')}</span>
                                    <div className="text-white capitalize mt-0.5">
                                        {log.current ? t(`logNew.current${log.current.charAt(0).toUpperCase() + log.current.slice(1)}`) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.entry')}</span>
                                    <div className="text-white capitalize mt-0.5">
                                        {log.entryMethod ? t(`logNew.entry${log.entryMethod.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`) : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800" />

                        {/* Gear */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('logDetail.sectionGear')}</h4>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.suit')}</span>
                                    <div className="text-white mt-0.5">{log.equipment?.suit || log.equipment?.undersuit || '-'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">{t('logDetail.weight')}</span>
                                    <div className="text-white mt-0.5">{(log.weightBelt || 0) + (log.weightPocket || 0)} kg</div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 text-xs">{t('logDetail.tank')}</span>
                                    <div className="text-white mt-0.5 flex items-center justify-between">
                                        <span className="capitalize">
                                            {log.tankMaterial ? t(`logNew.tank${log.tankMaterial.charAt(0).toUpperCase() + log.tankMaterial.slice(1)}`) : '-'} / {t(`logNew.gas${log.gasMix.charAt(0).toUpperCase() + log.gasMix.slice(1)}`)}
                                        </span>
                                        <span className="font-mono text-sm text-slate-400">
                                            {log.pressureStart || '-'} → {log.pressureEnd || '-'} bar
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notes */}
                {log.notes && (
                    <section className="space-y-3">
                        <h2 className="text-h3">{t('logDetail.sectionNotes')}</h2>
                        <div className="card-toss">
                            <p className="text-body whitespace-pre-wrap text-slate-300">
                                {log.notes}
                            </p>
                        </div>
                    </section>
                )}

                {/* Team */}
                {(log.buddy || log.instructor || log.guide) && (
                    <section className="space-y-3">
                        <h2 className="text-h3">{t('logDetail.sectionTeam')}</h2>
                        <div className="card-toss space-y-3">
                            {log.buddy && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{t('logDetail.buddy')}</span>
                                    <span className="font-medium text-white">{log.buddy}</span>
                                </div>
                            )}
                            {log.instructor && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{t('logDetail.instructor')}</span>
                                    <span className="font-medium text-white">{log.instructor}</span>
                                </div>
                            )}
                            {log.guide && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{t('logDetail.guide')}</span>
                                    <span className="font-medium text-white">{log.guide}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
