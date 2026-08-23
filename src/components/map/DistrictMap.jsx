import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cx } from '../../utils/helpers';

export const STATUS_COLORS = {
  Active: '#ef4444', // red — active outbreak
  Elevated: '#f59e0b', // amber
  Low: '#22c55e', // green
};

const STATUS_ORDER = ['Active', 'Elevated', 'Low'];

/**
 * DistrictMap - an actual interactive Leaflet + OpenStreetMap view of the
 * operational villages. Each village is rendered as a colour-coded cluster
 * point (red = active outbreak, amber = elevated, green = low risk) with a
 * popup of case/population detail and a proportional impact ring for active
 * outbreaks, so the drill-down from district level to village points is clear.
 *
 * Props:
 *  - clusters: [{ village, status, cases, population, lat, lng }]
 *  - title, height
 */
export default function DistrictMap({ clusters = [], title = 'District Health Surveillance', height = 420, className }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds = [];

    clusters.forEach((c) => {
      const color = STATUS_COLORS[c.status] ?? '#64748b';
      const pt = [c.lat, c.lng];

      bounds.push(pt);

      if (c.status === 'Active' && c.cases) {
        L.circle(pt, {
          radius: c.cases * 120,
          color,
          weight: 1.5,
          dashArray: '4 4',
          fillColor: color,
          fillOpacity: 0.12,
        }).addTo(layerGroup);
      }

      const marker = L.circleMarker(pt, {
        radius: 14,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 0.85,
      }).addTo(layerGroup);

      marker.bindPopup(
        `<div class="jd-popup">
           <div class="jd-popup-title" style="color:${color}">${c.village}</div>
           <div class="jd-popup-row">Status: <b>${c.status}</b></div>
           <div class="jd-popup-row">Active cases: <b>${c.cases}</b></div>
           <div class="jd-popup-row">Population: <b>${(c.population ?? 0).toLocaleString()}</b></div>
         </div>`,
        { closeButton: true }
      );

      marker.bindTooltip(`<b>${c.village}</b>`, {
        permanent: true,
        direction: 'top',
        offset: L.point(0, -14),
        className: 'jd-map-label',
        opacity: 1,
      });
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12 });
    } else {
      map.setView([21.3, 81.3], 10);
    }

    // Ensure the marker layers render once the container is laid out.
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [clusters]);

  const legendItems = STATUS_ORDER.filter((s) => clusters.some((c) => c.status === s));

  return (
    <div
      className={cx('relative overflow-hidden rounded-xl border border-outline-variant', className)}
      style={{ height }}
    >
      <div ref={containerRef} className="w-full h-full z-0" />
      {title && (
        <div className="absolute top-0 inset-x-0 bg-surface-container-lowest/90 backdrop-blur-sm border-b border-outline-variant px-4 py-2 flex items-center justify-between z-[500]">
          <span className="font-headline font-bold text-on-surface text-label-lg">{title}</span>
        </div>
      )}

      {legendItems.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[500] bg-surface-container-lowest/95 backdrop-blur-sm rounded-xl shadow-elevation1 p-3 space-y-1.5 border border-outline-variant">
          {legendItems.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-white shadow" style={{ background: STATUS_COLORS[s] }} />
              <span className="text-label-md font-semibold text-on-surface">
                {s === 'Active' ? 'Active outbreak' : s === 'Elevated' ? 'Elevated' : 'Low risk'}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .jd-map-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #0f172a;
          font-weight: 700;
          font-size: 12px;
          text-shadow: 0 0 4px #fff, 0 0 4px #fff;
          padding: 0 2px !important;
        }
        .jd-popup { font-family: inherit; min-width: 150px; }
        .jd-popup-title { font-weight: 800; font-size: 14px; margin-bottom: 4px; }
        .jd-popup-row { font-size: 12px; color: #334155; }
      `}</style>
    </div>
  );
}