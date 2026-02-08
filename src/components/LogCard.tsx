// LogCard Component
// Display card for individual dive log entries

'use client';

import { DiveLog } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface LogCardProps {
    log: DiveLog;
    onClick?: () => void;
}

export function LogCard({ log, onClick }: LogCardProps) {
    const { t, language } = useLanguage();
    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
            year: 'numeric',
            month: language === 'ko' ? 'long' : 'short',
            day: 'numeric',
        }).format(date);
    };

    // Render stars
    const renderRating = (rating?: number) => {
        if (!rating) return null;
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <span
                        key={star}
                        className={star <= rating ? 'text-yellow-400' : 'text-slate-600'}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };


    return (
        <div
            onClick={onClick}
            className={`
        group card-toss p-0 overflow-hidden border-none
        hover:scale-[1.02] active:scale-[0.98] transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
      `}
        >
            {/* Photo Strip */}
            {log.photos && log.photos.length > 0 && (
                <div className="h-40 overflow-hidden relative">
                    <img
                        src={log.photos[0].thumbnailUrl}
                        alt={log.diveSiteName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {log.photos.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-xs text-white font-medium border border-white/10">
                            +{log.photos.length - 1}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-toss-bg/60 via-transparent to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-3">
                {/* Location & Date */}
                <div>
                    <h3 className="text-h3 text-white group-hover:text-toss-blue transition-colors truncate">
                        {log.diveSiteName || 'Unknown Location'}
                    </h3>
                    <p className="text-sm text-toss-grey-500 mt-1">
                        {formatDate(log.date)}
                    </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm font-medium">
                    {log.timeStart && (
                        <div className="flex items-center gap-1.5 text-toss-grey-300">
                            <span className="text-toss-blue">🕐</span>
                            <span>{log.timeStart}</span>
                        </div>
                    )}
                    {log.maxDepth && (
                        <div className="flex items-center gap-1.5 text-toss-grey-300">
                            <span className="text-toss-blue">↓</span>
                            <span>{log.maxDepth}m</span>
                        </div>
                    )}
                    {log.divingTime && (
                        <div className="flex items-center gap-1.5 text-toss-grey-300">
                            <span className="text-toss-blue">⏱</span>
                            <span>{log.divingTime} {t('logCard.min')}</span>
                        </div>
                    )}
                    {log.tempAvg && log.tempAvg > 0 && (
                        <div className="flex items-center gap-1.5 text-toss-grey-300">
                            <span className="text-toss-blue">🌊</span>
                            <span>{Math.round(log.tempAvg)}°C</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    {/* Buddy */}
                    <div className="text-xs text-toss-grey-500 truncate max-w-[150px]">
                        {log.buddy && `${t('logCard.with')} ${log.buddy}`}
                    </div>

                    {/* Sync Status */}
                    {!log.isSynced && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            {t('logCard.unsynced')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
