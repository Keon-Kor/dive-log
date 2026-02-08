import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'DiveSnap',
        short_name: 'DiveSnap',
        description: '사진으로 쉬운 로그 기록과 공유',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#06b6d4',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };
}
