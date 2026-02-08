// DiveLogForm Component
// Auto-filled form with editable fields for dive log entry

'use client';

import { useState, useEffect } from 'react';
import { DiveLogFormData, WeatherData, OceanData, GeocodingResult } from '@/lib/types';
import { reverseGeocode, formatLocationName } from '@/lib/geocode';
import { getWeather } from '@/lib/weather';
import { getOceanData, formatSeaTemperature } from '@/lib/ocean';
import type { ExifResult } from '@/workers/exif-worker';

interface DiveLogFormProps {
    exifResults: ExifResult[];
    onSubmit: (data: DiveLogFormData) => void;
    onBack: () => void;
}

export function DiveLogForm({ exifResults, onSubmit, onBack }: DiveLogFormProps) {
    const [formData, setFormData] = useState<DiveLogFormData>({
        date: '',
        timeIn: '',
        gpsLat: 0,
        gpsLng: 0,
        locationName: '',
        country: '',
        isPublic: false,
    });
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [oceanData, setOceanData] = useState<OceanData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Auto-fill from EXIF data
    useEffect(() => {
        async function fillFromExif() {
            const validResults = exifResults.filter(r => r.success && r.data);
            if (validResults.length === 0) {
                setIsLoading(false);
                return;
            }

            // Get GPS and date from first photo with valid data
            const firstValid = validResults.find(r => r.data?.gpsLat && r.data?.gpsLng);
            const gpsLat = firstValid?.data?.gpsLat || 0;
            const gpsLng = firstValid?.data?.gpsLng || 0;

            // Get dates from all photos
            const dates = validResults
                .filter(r => r.data?.dateTaken)
                .map(r => new Date(r.data!.dateTaken!))
                .sort((a, b) => a.getTime() - b.getTime());

            const earliestDate = dates[0];
            const latestDate = dates[dates.length - 1];

            // Basic form data from EXIF
            const newFormData: DiveLogFormData = {
                date: earliestDate ? earliestDate.toISOString().split('T')[0] : '',
                timeIn: earliestDate ? earliestDate.toTimeString().slice(0, 5) : '',
                timeOut: latestDate && latestDate !== earliestDate
                    ? latestDate.toTimeString().slice(0, 5)
                    : undefined,
                gpsLat,
                gpsLng,
                locationName: '',
                country: '',
                isPublic: false,
            };

            setFormData(newFormData);

            // Fetch additional data if we have GPS
            if (gpsLat && gpsLng) {
                // Reverse geocode
                const geoResult = await reverseGeocode(gpsLat, gpsLng);
                if (geoResult.success && geoResult.data) {
                    newFormData.locationName = formatLocationName(geoResult.data);
                    newFormData.country = geoResult.data.country;
                }

                // Get weather
                const weatherResult = await getWeather(gpsLat, gpsLng, newFormData.date);
                if (weatherResult.success && weatherResult.data) {
                    setWeatherData(weatherResult.data);
                }

                // Get ocean data
                const oceanResult = await getOceanData(gpsLat, gpsLng, newFormData.date);
                if (oceanResult.success && oceanResult.data) {
                    setOceanData(oceanResult.data);
                }

                setFormData(newFormData);
            }

            setIsLoading(false);
        }

        fillFromExif();
    }, [exifResults]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (field: keyof DiveLogFormData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-slate-400">위치 및 날씨 정보를 가져오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto-filled Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    자동 입력된 정보
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">날짜</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => handleChange('date', e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Time In */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">입수 시간</label>
                        <input
                            type="time"
                            value={formData.timeIn}
                            onChange={e => handleChange('timeIn', e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Location */}
                    <div className="col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">위치</label>
                        <input
                            type="text"
                            value={formData.locationName}
                            onChange={e => handleChange('locationName', e.target.value)}
                            placeholder="위치를 입력하세요"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* GPS Coordinates (read-only) */}
                    {formData.gpsLat !== 0 && (
                        <div className="col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">GPS 좌표</label>
                            <p className="text-slate-300 text-sm">
                                {formData.gpsLat.toFixed(6)}, {formData.gpsLng.toFixed(6)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Weather & Ocean Info */}
                {(weatherData || oceanData) && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {weatherData && (
                                <>
                                    <div className="bg-slate-700/30 rounded-lg p-3">
                                        <p className="text-2xl">🌡️</p>
                                        <p className="text-white font-medium">{weatherData.airTemperature}°C</p>
                                        <p className="text-xs text-slate-400">기온</p>
                                    </div>
                                    <div className="bg-slate-700/30 rounded-lg p-3">
                                        <p className="text-2xl">💨</p>
                                        <p className="text-white font-medium">{weatherData.windSpeed} m/s</p>
                                        <p className="text-xs text-slate-400">바람</p>
                                    </div>
                                </>
                            )}
                            {oceanData && (
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <p className="text-2xl">🌊</p>
                                    <p className="text-white font-medium">
                                        {formatSeaTemperature(oceanData.seaTemperature)}
                                    </p>
                                    <p className="text-xs text-slate-400">수온</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* User Input Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">추가 정보 (선택)</h3>

                <div className="grid grid-cols-2 gap-4">
                    {/* Max Depth */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">최대 수심 (m)</label>
                        <input
                            type="number"
                            value={formData.maxDepth || ''}
                            onChange={e => handleChange('maxDepth', parseFloat(e.target.value) || 0)}
                            placeholder="18"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Bottom Time */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">잠수 시간 (분)</label>
                        <input
                            type="number"
                            value={formData.bottomTime || ''}
                            onChange={e => handleChange('bottomTime', parseInt(e.target.value) || 0)}
                            placeholder="45"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Buddy */}
                    <div className="col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">버디</label>
                        <input
                            type="text"
                            value={formData.buddy || ''}
                            onChange={e => handleChange('buddy', e.target.value)}
                            placeholder="함께 다이빙한 사람"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">메모</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => handleChange('notes', e.target.value)}
                            placeholder="다이빙에 대한 메모..."
                            rows={3}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Rating */}
                    <div className="col-span-2">
                        <label className="block text-sm text-slate-400 mb-2">평점</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleChange('rating', star)}
                                    className={`text-2xl transition-transform hover:scale-110 ${(formData.rating || 0) >= star ? 'text-yellow-400' : 'text-slate-600'
                                        }`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-3 px-6 border border-slate-600 text-slate-300 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                    뒤로
                </button>
                <button
                    type="submit"
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                >
                    로그 저장
                </button>
            </div>
        </form>
    );
}
