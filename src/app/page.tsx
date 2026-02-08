// Main Dashboard Page
// Shows map with dive sites and recent dive logs

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDiveLog } from '@/hooks/useDiveLog';
import { LogCard } from '@/components/LogCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const MapLoading = () => {
  const { t } = useLanguage();
  return (
    <div className="h-[400px] bg-slate-800/50 rounded-2xl animate-pulse flex items-center justify-center">
      <p className="text-slate-400">{t('home.loadingMap')}</p>
    </div>
  );
};

// Dynamic import for map (no SSR)
const DiveMap = dynamic(
  () => import('@/components/DiveMap').then(mod => ({ default: mod.DiveMap })),
  {
    ssr: false,
    loading: MapLoading
  }
);

export default function Home() {
  const { logs, isLoading, fetchLogs } = useDiveLog();
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Calculate stats
  const totalDives = logs.length;
  const totalCountries = new Set(logs.map(l => l.country).filter(Boolean)).size;
  const avgDepth = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.maxDepth || 0), 0) / logs.filter(l => l.maxDepth).length) || 0
    : 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-xl">🤿</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{t('home.heroTitle')}</h1>
              <p className="text-xs text-slate-400">{t('home.heroSub')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link
              href="/log/new"
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">{t('nav.newLog')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold gradient-text">{totalDives}</p>
            <p className="text-sm text-slate-400 mt-1">{t('home.totalDives')}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold gradient-text">{totalCountries}</p>
            <p className="text-sm text-slate-400 mt-1">{t('home.countries')}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold gradient-text">{avgDepth}m</p>
            <p className="text-sm text-slate-400 mt-1">{t('home.avgDepth')}</p>
          </div>
        </section>

        {/* Map Section */}
        <section className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{t('home.mapTitle')}</h2>
            <span className="text-sm text-slate-400">{logs.length} {t('home.mapPoints')}</span>
          </div>
          <DiveMap logs={logs} height="350px" />
        </section>

        {/* Recent Dives */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{t('home.recentDives')}</h2>
            {/* TODO: Create /logs archive page */}
            {/* {logs.length > 0 && (
              <Link href="/logs" className="text-sm text-cyan-400 hover:text-cyan-300">
                전체 보기 →
              </Link>
            )} */}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card h-48 animate-pulse" />
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(
                logs.reduce((groups: { [key: string]: typeof logs }, log) => {
                  const date = log.date;
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(log);
                  return groups;
                }, {})
              )
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dateLogs]) => (
                  <div key={date} className="space-y-4">
                    <h3 className="text-sm font-semibold text-toss-grey-500 flex items-center gap-2 px-1">
                      <span className="w-1 h-4 bg-toss-blue rounded-full" />
                      {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
                        year: 'numeric',
                        month: language === 'ko' ? 'long' : 'short',
                        day: 'numeric',
                        weekday: 'short'
                      }).format(new Date(date))}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dateLogs.map(log => (
                        <Link key={log.id} href={`/log/${log.id}`} className="block">
                          <LogCard log={log} onClick={() => { }} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-3xl">🌊</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {t('home.emptyTitle')}
              </h3>
              <p className="text-slate-400 mb-6">
                {t('home.emptySub')}
              </p>
              <Link href="/log/new" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('home.createFirst')}
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 glass sm:hidden">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 text-cyan-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">{t('nav.home')}</span>
          </Link>
          <Link href="/log/new" className="flex flex-col items-center gap-1 text-slate-400 hover:text-cyan-400">
            <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-cyan-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">{t('nav.profile')}</span>
          </Link>
        </div>
      </nav>

      {/* Version Footer */}
      <div className="fixed bottom-2 right-2 text-[10px] text-slate-700 pointer-events-none">
        v1.3.9
      </div>
    </div>
  );
}
