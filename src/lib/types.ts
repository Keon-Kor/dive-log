// Dive Log Types and Interfaces - Logbook Format

// ============================================
// 전통 로그북 양식 기반 타입 정의
// ============================================

// 탱크 종류
export type TankMaterial = 'aluminum' | 'steel';
export type TankConfig = 'single' | 'double' | 'sidemount';
export type GasMix = 'air' | 'nitrox' | 'trimix';

// 입수 방법
export type EntryMethod = 'giant_stride' | 'back_roll' | 'controlled_seated' | 'shore';

// 날씨 아이콘
export type WeatherIcon = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';

// ============================================
// 메인 다이브 로그 인터페이스
// ============================================
export interface DiveLog {
    id: string;
    logNumber?: number;        // 로그북 번호
    userId?: string;

    // === 기본 정보 (자동 입력 가능) ===
    date: string;              // 날짜
    diveSiteName: string;      // 다이빙 사이트명 (GPS 매칭)
    gpsLat?: number;
    gpsLng?: number;
    country?: string;
    region?: string;

    // === 시간 정보 ===
    surfaceInterval?: number;  // 수면 휴식 (분)
    divingTime: number;        // 잠수 시간 (분)
    timeStart: string;         // 입수 시간
    timeEnd: string;           // 출수 시간

    // === 깊이 정보 ===
    maxDepth: number;          // 최대 수심 (m)
    avgDepth?: number;         // 평균 수심 (m)

    // === 수온 정보 ===
    tempMin?: number;          // 최저 수온 (°C)
    tempMax?: number;          // 최고 수온 (°C)
    tempAvg?: number;          // 평균 수온 (°C)

    // === 탱크/가스 정보 ===
    tankMaterial?: TankMaterial;
    tankConfig?: TankConfig;
    gasMix: GasMix;
    nitroxPercent?: number;    // Nitrox 산소 %
    pressureStart?: number;    // 시작 압력 (bar)
    pressureEnd?: number;      // 종료 압력 (bar)

    // === 웨이트 정보 ===
    weightBelt?: number;       // 벨트 웨이트 (kg)
    weightPocket?: number;     // 포켓 웨이트 (kg)

    // === 환경 조건 ===
    visibility?: number;       // 시야 (m)
    weather?: WeatherIcon;
    current?: string;          // 조류 (없음/약함/보통/강함)
    wave?: string;             // 파도
    wind?: string;             // 바람
    entryMethod?: EntryMethod;

    // === 장비 체크리스트 ===
    equipment?: EquipmentChecklist;

    // === 팀 정보 ===
    instructor?: string;
    buddy?: string;
    guide?: string;

    // === 노트 ===
    notes?: string;

    // === 사진 (선택적, 로그인 필수) ===
    photos?: DivePhoto[];
    savePhotos?: boolean;      // 사진 저장 여부 토글

    // === 메타데이터 ===
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    isSynced: boolean;
    shareUrl?: string;         // 공유 URL
}

// 장비 체크리스트
export interface EquipmentChecklist {
    fins?: string;
    mask?: string;
    suit?: string;
    snorkel?: boolean;
    undersuit?: string;
    computer?: string;
    camera?: string;
    gloves?: boolean;
    boots?: boolean;
    accessories?: string;
    regulator?: string;
    hood?: boolean;
    bcd?: string;
    swimwear?: boolean;
}

// 사진 (압축 저장)
export interface DivePhoto {
    id: string;
    thumbnailUrl?: string;      // 압축된 썸네일
    exifExtracted: boolean;     // EXIF 추출 완료 여부
    // 원본은 저장하지 않음!
}

// ============================================
// 다이빙 사이트 DB
// ============================================
export interface DiveSite {
    id: string;
    name: string;
    nameLocal?: string;         // 현지 이름
    gpsLat: number;
    gpsLng: number;
    country: string;
    region: string;
    maxDepth?: number;
    avgDepth?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    description?: string;
    features?: string[];        // 특징 (벽다이빙, 난파선 등)
}

// ============================================
// API 관련 타입
// ============================================
export interface WeatherData {
    condition: string;
    icon: WeatherIcon;
    airTemperature: number;
    windSpeed: number;
    visibility: string;
    humidity: number;
    pressure: number;
}

export interface OceanData {
    seaTemperature: number;
    waveHeight?: number;
    swellDirection?: string;
    currentStrength?: string;
}

export interface GeocodingResult {
    locationName: string;
    country: string;
    region?: string;
    city?: string;
}

// ============================================
// 폼 데이터 타입
// ============================================
export interface DiveLogFormData {
    // 기본 (자동)
    date: string;
    diveSiteName: string;
    gpsLat?: number;
    gpsLng?: number;
    country?: string;

    // 시간
    surfaceInterval?: number;
    divingTime: number;
    timeStart: string;
    timeEnd: string;

    // 깊이/수온
    maxDepth: number;
    avgDepth?: number;
    tempMin?: number;
    tempMax?: number;
    tempAvg?: number;

    // 탱크/가스
    tankMaterial?: TankMaterial;
    tankConfig?: TankConfig;
    gasMix: GasMix;
    nitroxPercent?: number;
    pressureStart?: number;
    pressureEnd?: number;

    // 웨이트
    weightBelt?: number;
    weightPocket?: number;

    // 환경
    visibility?: number;
    weather?: WeatherIcon;
    current?: string;
    wave?: string;
    wind?: string;
    entryMethod?: EntryMethod;

    // 장비
    equipment?: EquipmentChecklist;

    // 팀
    instructor?: string;
    buddy?: string;
    guide?: string;

    // 노트/공개
    notes?: string;
    isPublic: boolean;
    savePhotos: boolean;
}

// API Response
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
