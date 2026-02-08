// Auth Callback Page - Handles OAuth redirect
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Exchange code for session
                const { error } = await supabase.auth.exchangeCodeForSession(
                    window.location.href
                );

                if (error) {
                    console.error('Auth callback error:', error);
                    router.push('/?error=auth_failed');
                    return;
                }

                // Redirect to home or previous page
                router.push('/');
            } catch (error) {
                console.error('Auth callback error:', error);
                router.push('/?error=auth_failed');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-white text-lg">로그인 처리 중...</p>
            </div>
        </div>
    );
}
