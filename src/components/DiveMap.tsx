// DiveMap Component
// Interactive map showing dive sites with Leaflet

'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DiveLog } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const diveIcon = L.divIcon({
  html: `
    <div class="dive-marker">
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    </div>
  `,
  className: 'custom-dive-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface DiveMapProps {
  logs: DiveLog[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (log: DiveLog) => void;
  height?: string;
}

export function DiveMap({
  logs,
  center = [33.5, 126.5], // Default: Jeju Island
  zoom = 6,
  onMarkerClick,
  height = '400px'
}: DiveMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add dark theme tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  // Add/update markers when logs change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for each log
    logs.forEach((log) => {
      if (log.gpsLat && log.gpsLng) {
        const marker = L.marker([log.gpsLat, log.gpsLng], {
          icon: diveIcon
        });

        // Create popup content using DOM API to prevent XSS
        const popupEl = document.createElement('div');
        popupEl.className = 'dive-popup';

        const h4 = document.createElement('h4');
        h4.className = 'font-semibold';
        h4.textContent = log.diveSiteName || 'Unknown Location';
        popupEl.appendChild(h4);

        const pDate = document.createElement('p');
        pDate.className = 'text-sm text-slate-400';
        pDate.textContent = log.date;
        popupEl.appendChild(pDate);

        if (log.maxDepth) {
          const pDepth = document.createElement('p');
          pDepth.className = 'text-sm';
          pDepth.textContent = `${t('logDetail.maxDepth')}: ${log.maxDepth}m`;
          popupEl.appendChild(pDepth);
        }

        marker.bindPopup(popupEl);

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(log));
        }

        marker.addTo(map);
      }
    });

    // If we have logs, fit bounds to show all markers
    if (logs.length > 0) {
      const validLogs = logs.filter(log => log.gpsLat && log.gpsLng);
      if (validLogs.length > 0) {
        const bounds = L.latLngBounds(
          validLogs.map(log => [log.gpsLat, log.gpsLng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [logs, onMarkerClick]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700">
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full"
      />

      {/* Custom marker styles */}
      <style jsx global>{`
        .custom-dive-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .dive-marker {
          position: relative;
          width: 24px;
          height: 24px;
        }
        
        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.5);
        }
        
        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: rgba(6, 182, 212, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        
        .leaflet-popup-content-wrapper {
          background: var(--surface) !important;
          color: white !important;
          border-radius: 16px !important;
          border: 1px solid var(--border-color) !important;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5) !important;
        }
        
        .leaflet-popup-tip {
          background: var(--surface) !important;
          border: 1px solid var(--border-color) !important;
          border-top: none;
          border-left: none;
        }
        
        .dive-popup h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
        }
        
        .dive-popup p {
          margin: 2px 0;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
