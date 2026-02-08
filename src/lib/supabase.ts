// Supabase Client Configuration

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Dummy subscription for fallback
const dummySubscription = {
    unsubscribe: () => { },
};

// Create a dummy client if no URL is provided (for build time)
export const supabase: SupabaseClient = supabaseUrl
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }) }),
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: dummySubscription } }),
            signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
            signOut: () => Promise.resolve({ error: null }),
        },
    } as unknown as SupabaseClient;

// Database types (will be auto-generated from Supabase schema later)
export interface Database {
    public: {
        Tables: {
            dive_logs: {
                Row: {
                    id: string;
                    user_id: string;
                    date: string;
                    time_in: string;
                    time_out: string | null;
                    gps_lat: number;
                    gps_lng: number;
                    location_name: string;
                    dive_site_name: string | null;
                    country: string;
                    weather_condition: string;
                    air_temperature: number;
                    wind_speed: number;
                    visibility: string;
                    sea_temperature: number;
                    max_depth: number | null;
                    bottom_time: number | null;
                    buddy: string | null;
                    notes: string | null;
                    rating: number | null;
                    is_public: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['dive_logs']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['dive_logs']['Insert']>;
            };
            dive_photos: {
                Row: {
                    id: string;
                    dive_log_id: string;
                    thumbnail_url: string;
                    original_url: string | null;
                    date_taken: string;
                    gps_lat: number;
                    gps_lng: number;
                    camera: string | null;
                    lens: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['dive_photos']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['dive_photos']['Insert']>;
            };
        };
    };
}
