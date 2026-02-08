// Logbook Form Component
// 전통 로그북 양식을 재현한 입력 폼

'use client';

import { useState, useEffect } from 'react';
import type { DiveLogFormData, GasMix, TankMaterial, TankConfig, EntryMethod, WeatherIcon, EquipmentChecklist } from '@/lib/types';

interface LogbookFormProps {
    initialData?: Partial<DiveLogFormData>;
    onSubmit: (data: DiveLogFormData) => void;
    onCancel?: () => void;
    isLoggedIn?: boolean;
}

export function LogbookForm({ initialData, onSubmit, onCancel, isLoggedIn = false }: LogbookFormProps) {
    const [formData, setFormData] = useState<DiveLogFormData>({
        date: initialData?.date || new Date().toISOString().split('T')[0],
        diveSiteName: initialData?.diveSiteName || '',
        gpsLat: initialData?.gpsLat,
        gpsLng: initialData?.gpsLng,
        country: initialData?.country || '',
        surfaceInterval: initialData?.surfaceInterval,
        divingTime: initialData?.divingTime || 0,
        timeStart: initialData?.timeStart || '',
        timeEnd: initialData?.timeEnd || '',
        maxDepth: initialData?.maxDepth || 0,
        avgDepth: initialData?.avgDepth,
        tempMin: initialData?.tempMin,
        tempMax: initialData?.tempMax,
        tempAvg: initialData?.tempAvg,
        tankMaterial: initialData?.tankMaterial || 'aluminum',
        tankConfig: initialData?.tankConfig || 'single',
        gasMix: initialData?.gasMix || 'air',
        nitroxPercent: initialData?.nitroxPercent,
        pressureStart: initialData?.pressureStart || 200,
        pressureEnd: initialData?.pressureEnd || 50,
        weightBelt: initialData?.weightBelt,
        weightPocket: initialData?.weightPocket,
        visibility: initialData?.visibility,
        weather: initialData?.weather,
        current: initialData?.current,
        wave: initialData?.wave,
        wind: initialData?.wind,
        entryMethod: initialData?.entryMethod,
        equipment: initialData?.equipment || {},
        instructor: initialData?.instructor,
        buddy: initialData?.buddy,
        guide: initialData?.guide,
        notes: initialData?.notes,
        isPublic: initialData?.isPublic || false,
        savePhotos: initialData?.savePhotos || false,
    });

    const updateField = <K extends keyof DiveLogFormData>(field: K, value: DiveLogFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="logbook-form space-y-6">
            {/* Section 1: 다이빙 사이트 & 기본 정보 */}
            <section className="logbook-section">
                <h2 className="section-title">🏝️ Diving Site</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="field-label">사이트명</label>
                        <input
                            type="text"
                            value={formData.diveSiteName}
                            onChange={e => updateField('diveSiteName', e.target.value)}
                            className="field-input text-lg font-semibold"
                            placeholder="다이빙 사이트 이름"
                            required
                        />
                    </div>
                    <div>
                        <label className="field-label">날짜</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => updateField('date', e.target.value)}
                            className="field-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="field-label">국가</label>
                        <input
                            type="text"
                            value={formData.country || ''}
                            onChange={e => updateField('country', e.target.value)}
                            className="field-input"
                            placeholder="Korea"
                        />
                    </div>
                </div>
            </section>

            {/* Section 2: 시간 정보 */}
            <section className="logbook-section">
                <h2 className="section-title">⏱️ Time</h2>
                <div className="grid grid-cols-4 gap-3">
                    <div>
                        <label className="field-label">Surface Interval</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.surfaceInterval || ''}
                                onChange={e => updateField('surfaceInterval', Number(e.target.value))}
                                className="field-input"
                                placeholder="60"
                            />
                            <span className="text-slate-400 text-sm">min</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Diving Time</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.divingTime || ''}
                                onChange={e => updateField('divingTime', Number(e.target.value))}
                                className="field-input"
                                placeholder="45"
                                required
                            />
                            <span className="text-slate-400 text-sm">min</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Start</label>
                        <input
                            type="time"
                            value={formData.timeStart}
                            onChange={e => updateField('timeStart', e.target.value)}
                            className="field-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="field-label">End</label>
                        <input
                            type="time"
                            value={formData.timeEnd}
                            onChange={e => updateField('timeEnd', e.target.value)}
                            className="field-input"
                            required
                        />
                    </div>
                </div>
            </section>

            {/* Section 3: 깊이 & 수온 */}
            <section className="logbook-section">
                <h2 className="section-title">📏 Depth & Temperature</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="field-label">Max Depth</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.maxDepth || ''}
                                onChange={e => updateField('maxDepth', Number(e.target.value))}
                                className="field-input"
                                placeholder="18"
                                required
                            />
                            <span className="text-slate-400 text-sm">m</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Avg Depth</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.avgDepth || ''}
                                onChange={e => updateField('avgDepth', Number(e.target.value))}
                                className="field-input"
                                placeholder="12"
                            />
                            <span className="text-slate-400 text-sm">m</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Visibility</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.visibility || ''}
                                onChange={e => updateField('visibility', Number(e.target.value))}
                                className="field-input"
                                placeholder="15"
                            />
                            <span className="text-slate-400 text-sm">m</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                        <label className="field-label">Min Temp</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.tempMin || ''}
                                onChange={e => updateField('tempMin', Number(e.target.value))}
                                className="field-input"
                                placeholder="20"
                            />
                            <span className="text-slate-400 text-sm">°C</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Max Temp</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.tempMax || ''}
                                onChange={e => updateField('tempMax', Number(e.target.value))}
                                className="field-input"
                                placeholder="24"
                            />
                            <span className="text-slate-400 text-sm">°C</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Avg Temp</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.tempAvg || ''}
                                onChange={e => updateField('tempAvg', Number(e.target.value))}
                                className="field-input"
                                placeholder="22"
                            />
                            <span className="text-slate-400 text-sm">°C</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: 탱크 & 가스 */}
            <section className="logbook-section">
                <h2 className="section-title">🛢️ Air Tank</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="field-label">Material</label>
                        <select
                            value={formData.tankMaterial}
                            onChange={e => updateField('tankMaterial', e.target.value as TankMaterial)}
                            className="field-input"
                        >
                            <option value="aluminum">Aluminum</option>
                            <option value="steel">Steel</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label">Config</label>
                        <select
                            value={formData.tankConfig}
                            onChange={e => updateField('tankConfig', e.target.value as TankConfig)}
                            className="field-input"
                        >
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="sidemount">Sidemount</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                    <div>
                        <label className="field-label">Gas Mix</label>
                        <select
                            value={formData.gasMix}
                            onChange={e => updateField('gasMix', e.target.value as GasMix)}
                            className="field-input"
                        >
                            <option value="air">Air</option>
                            <option value="nitrox">Nitrox</option>
                            <option value="trimix">Trimix</option>
                        </select>
                    </div>
                    {formData.gasMix === 'nitrox' && (
                        <div>
                            <label className="field-label">O₂ %</label>
                            <input
                                type="number"
                                value={formData.nitroxPercent || ''}
                                onChange={e => updateField('nitroxPercent', Number(e.target.value))}
                                className="field-input"
                                placeholder="32"
                            />
                        </div>
                    )}
                    <div>
                        <label className="field-label">Start</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.pressureStart || ''}
                                onChange={e => updateField('pressureStart', Number(e.target.value))}
                                className="field-input"
                                placeholder="200"
                            />
                            <span className="text-slate-400 text-sm">bar</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">End</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.pressureEnd || ''}
                                onChange={e => updateField('pressureEnd', Number(e.target.value))}
                                className="field-input"
                                placeholder="50"
                            />
                            <span className="text-slate-400 text-sm">bar</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: 웨이트 & 환경 */}
            <section className="logbook-section">
                <h2 className="section-title">⚖️ Weight & Conditions</h2>
                <div className="grid grid-cols-4 gap-3">
                    <div>
                        <label className="field-label">Belt</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.weightBelt || ''}
                                onChange={e => updateField('weightBelt', Number(e.target.value))}
                                className="field-input"
                                placeholder="4"
                            />
                            <span className="text-slate-400 text-sm">kg</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Pocket</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={formData.weightPocket || ''}
                                onChange={e => updateField('weightPocket', Number(e.target.value))}
                                className="field-input"
                                placeholder="2"
                            />
                            <span className="text-slate-400 text-sm">kg</span>
                        </div>
                    </div>
                    <div>
                        <label className="field-label">Weather</label>
                        <select
                            value={formData.weather || ''}
                            onChange={e => updateField('weather', e.target.value as WeatherIcon)}
                            className="field-input"
                        >
                            <option value="">-</option>
                            <option value="sunny">☀️ 맑음</option>
                            <option value="partly_cloudy">⛅ 구름 조금</option>
                            <option value="cloudy">☁️ 흐림</option>
                            <option value="rainy">🌧️ 비</option>
                            <option value="stormy">⛈️ 폭풍</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label">Entry</label>
                        <select
                            value={formData.entryMethod || ''}
                            onChange={e => updateField('entryMethod', e.target.value as EntryMethod)}
                            className="field-input"
                        >
                            <option value="">-</option>
                            <option value="giant_stride">Giant Stride</option>
                            <option value="back_roll">Back Roll</option>
                            <option value="controlled_seated">Controlled Seated</option>
                            <option value="shore">Shore</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                        <label className="field-label">Current</label>
                        <select
                            value={formData.current || ''}
                            onChange={e => updateField('current', e.target.value)}
                            className="field-input"
                        >
                            <option value="">-</option>
                            <option value="none">없음</option>
                            <option value="weak">약함</option>
                            <option value="moderate">보통</option>
                            <option value="strong">강함</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label">Wave</label>
                        <select
                            value={formData.wave || ''}
                            onChange={e => updateField('wave', e.target.value)}
                            className="field-input"
                        >
                            <option value="">-</option>
                            <option value="calm">잔잔</option>
                            <option value="slight">약간</option>
                            <option value="moderate">보통</option>
                            <option value="rough">거침</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label">Wind</label>
                        <select
                            value={formData.wind || ''}
                            onChange={e => updateField('wind', e.target.value)}
                            className="field-input"
                        >
                            <option value="">-</option>
                            <option value="calm">없음</option>
                            <option value="light">약함</option>
                            <option value="moderate">보통</option>
                            <option value="strong">강함</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Section 6: 팀 정보 */}
            <section className="logbook-section">
                <h2 className="section-title">👥 Team</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="field-label">Instructor</label>
                        <input
                            type="text"
                            value={formData.instructor || ''}
                            onChange={e => updateField('instructor', e.target.value)}
                            className="field-input"
                            placeholder="강사 이름"
                        />
                    </div>
                    <div>
                        <label className="field-label">Buddy</label>
                        <input
                            type="text"
                            value={formData.buddy || ''}
                            onChange={e => updateField('buddy', e.target.value)}
                            className="field-input"
                            placeholder="버디 이름"
                        />
                    </div>
                    <div>
                        <label className="field-label">Guide</label>
                        <input
                            type="text"
                            value={formData.guide || ''}
                            onChange={e => updateField('guide', e.target.value)}
                            className="field-input"
                            placeholder="가이드 이름"
                        />
                    </div>
                </div>
            </section>

            {/* Section 7: 노트 */}
            <section className="logbook-section">
                <h2 className="section-title">📝 Notes</h2>
                <textarea
                    value={formData.notes || ''}
                    onChange={e => updateField('notes', e.target.value)}
                    className="field-input min-h-[120px] resize-y"
                    placeholder="다이빙 중 관찰한 생물, 특이사항, 느낀점 등을 기록하세요..."
                />
            </section>

            {/* Section 8: 사진 저장 옵션 */}
            <section className="logbook-section">
                <h2 className="section-title">📷 Photo Options</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">사진 저장</p>
                        <p className="text-slate-400 text-xs">사진을 압축하여 클라우드에 저장합니다</p>
                    </div>
                    {isLoggedIn ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.savePhotos}
                                onChange={e => updateField('savePhotos', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    ) : (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
                            로그인 필요
                        </span>
                    )}
                </div>
            </section>

            {/* Section 9: 공개 설정 */}
            <section className="logbook-section">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">공개 로그</p>
                        <p className="text-slate-400 text-xs">URL을 통해 다른 사람과 공유할 수 있습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isPublic}
                            onChange={e => updateField('isPublic', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                </div>
            </section>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                    >
                        취소
                    </button>
                )}
                <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors"
                >
                    저장하기
                </button>
            </div>
        </form>
    );
}
