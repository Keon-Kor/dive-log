'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ShareButton({ logId }: { logId: string }) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/log/${logId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleShare}
            className={`p-2 rounded-full transition-all ${copied
                ? 'bg-green-500/20 text-green-500'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            aria-label={t('logNew.copyLink')}
        >
            {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
            )}
        </button>
    );
}
