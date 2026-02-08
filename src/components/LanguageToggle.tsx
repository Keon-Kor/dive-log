'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex p-1 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-full w-fit">
            <button
                onClick={() => setLanguage('ko')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'ko'
                        ? 'bg-toss-blue text-white shadow-lg shadow-toss-blue/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
            >
                KO
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'en'
                        ? 'bg-toss-blue text-white shadow-lg shadow-toss-blue/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
            >
                EN
            </button>
        </div>
    );
}
