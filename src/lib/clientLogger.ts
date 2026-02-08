
interface LogPayload {
    level: 'info' | 'warn' | 'error';
    message: string;
    component?: string;
    data?: any;
    url?: string;
    userAgent?: string;
}

const IS_DEV = process.env.NODE_ENV === 'development';

export const clientLogger = {
    info: (message: string, data?: any) => log('info', message, data),
    warn: (message: string, data?: any) => log('warn', message, data),
    error: (message: string, error?: any, component?: string) => {
        // Safe error serialization
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error;

        log('error', message, { error: errorData }, component);
    },
};

async function log(level: LogPayload['level'], message: string, data?: any, component?: string) {
    // 1. Always log to console in Dev
    if (IS_DEV) {
        console[level](`[${component || 'Client'}] ${message}`, data);
        return;
    }

    // 2. In Production, send key errors to server
    // Filter out minor info logs to save bandwidth/noise, unless critical
    if (level === 'info') return;

    try {
        const payload: LogPayload = {
            level,
            message,
            component,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent,
        };

        // Fire and forget
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true, // Ensure log is sent even if page unloads
        }).catch(err => console.error('Failed to send log:', err));
    } catch (e) {
        console.error('Logger failure:', e);
    }
}
