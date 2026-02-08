import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'DiveSnap',
        short_name: 'DiveSnap',
        description: '자동 다이빙 로그',
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
