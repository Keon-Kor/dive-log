// LogCard Component
// Display card for individual dive log entries

'use client';

import { DiveLog } from '@/lib/types';

interface LogCardProps {
    log: DiveLog;
    onClick?: () => void;
}

export function LogCard({ log, onClick }: LogCardProps) {
    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
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
        group bg-gradient-to-br from-slate-800 to-slate-900 
        rounded-2xl overflow-hidden border border-slate-700
        hover:border-cyan-500/50 transition-all duration-300
        hover:shadow-lg hover:shadow-cyan-500/10
        ${onClick ? 'cursor-pointer' : ''}
      `}
        >
            {/* Photo Strip */}
            {log.photos && log.photos.length > 0 && (
                <div className="h-32 overflow-hidden relative">
                    <img
                        src={log.photos[0].thumbnailUrl}
                        alt={log.diveSiteName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {log.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                            +{log.photos.length - 1}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Location & Date */}
                <div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {log.diveSiteName || 'Unknown Location'}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {formatDate(log.date)}
                    </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                    {log.maxDepth && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-cyan-400">↓</span>
                            <span>{log.maxDepth}m</span>
                        </div>
                    )}
                    {log.divingTime && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-cyan-400">⏱</span>
                            <span>{log.divingTime}분</span>
                        </div>
                    )}
                    {log.tempAvg && log.tempAvg > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-cyan-400">🌊</span>
                            <span>{Math.round(log.tempAvg)}°C</span>
                        </div>
                    )}
                </div>

                {/* Buddy */}
                <div className="flex items-center justify-end">
                    {log.buddy && (
                        <span className="text-xs text-slate-500">
                            with {log.buddy}
                        </span>
                    )}
                </div>

                {/* Sync Status */}
                {!log.isSynced && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        동기화 대기 중
                    </div>
                )}
            </div>
        </div>
    );
}
