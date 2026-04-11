import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, TileLayer } from 'react-leaflet';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';

/* ===== Types ===== */
interface DepartementData {
  code: string;
  nom: string;
  audios: number;
  population_totale: number;
  population_60plus: number;
  ratio_100k: number;
  rang: number;
  niveau: 'vert' | 'jaune' | 'orange' | 'rouge';
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: { code: string; nom: string };
  geometry: GeoJSON.Geometry;
}

interface DesertAuditifsMapProps {
  data: DepartementData[];
  selectedDept: string | null;
  onSelectDept: (code: string | null) => void;
}

/* ===== Colour scale ===== */
const NIVEAU_COLORS: Record<string, string> = {
  vert: '#4CAF50',
  jaune: '#FFC107',
  orange: '#FF9800',
  rouge: '#F44336',
};

const NIVEAU_LABELS: Record<string, string> = {
  rouge: '< 5 / 100k',
  orange: '5 - 7 / 100k',
  jaune: '7 - 10 / 100k',
  vert: '> 10 / 100k',
};

/* ===== Component ===== */
export default function DesertAuditifsMap({ data, selectedDept, onSelectDept }: DesertAuditifsMapProps) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const geojsonRef = useRef<L.GeoJSON | null>(null);
  const dataMap = useRef<Map<string, DepartementData>>(new Map());

  // Build lookup map
  useEffect(() => {
    const map = new Map<string, DepartementData>();
    for (const d of data) {
      map.set(d.code, d);
    }
    dataMap.current = map;
  }, [data]);

  // Fetch GeoJSON
  useEffect(() => {
    fetch('/data/departements-france.geojson')
      .then((r) => r.json())
      .then((gj) => {
        setGeojson(gj);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Style each feature
  const style = useCallback(
    (feature?: GeoJSONFeature) => {
      if (!feature) return {};
      const code = feature.properties.code;
      const dept = dataMap.current.get(code);
      const isSelected = code === selectedDept;
      return {
        fillColor: dept ? NIVEAU_COLORS[dept.niveau] : '#ccc',
        weight: isSelected ? 3 : 1,
        color: isSelected ? '#D97B3D' : '#1B2E4A',
        fillOpacity: isSelected ? 0.9 : 0.7,
      };
    },
    [selectedDept]
  );

  // Tooltip + events on each feature
  const onEachFeature = useCallback(
    (feature: GeoJSONFeature, layer: Layer) => {
      const code = feature.properties.code;
      const dept = dataMap.current.get(code);
      if (!dept) return;

      const tooltip = `<div style="font-family:Inter,sans-serif;font-size:14px;line-height:1.5">
        <strong style="color:#1B2E4A">${dept.nom} (${dept.code})</strong><br/>
        Audioprothesistes : <strong>${dept.audios}</strong><br/>
        Population : ${dept.population_totale.toLocaleString('fr-FR')}<br/>
        Ratio : <strong style="color:${NIVEAU_COLORS[dept.niveau]}">${dept.ratio_100k} / 100k</strong><br/>
        Rang : ${dept.rang}/101
      </div>`;

      layer.bindTooltip(tooltip, { sticky: true, direction: 'auto' });

      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle({ weight: 3, color: '#D97B3D', fillOpacity: 0.9 });
          target.bringToFront();
        },
        mouseout: (e: LeafletMouseEvent) => {
          if (geojsonRef.current) {
            geojsonRef.current.resetStyle(e.target);
          }
        },
        click: () => {
          onSelectDept(code === selectedDept ? null : code);
        },
      });
    },
    [selectedDept, onSelectDept]
  );

  // Re-apply styles when selection changes
  useEffect(() => {
    if (geojsonRef.current) {
      geojsonRef.current.setStyle((feature?: GeoJSONFeature) => style(feature));
    }
  }, [selectedDept, style]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-[#E8E8E8] rounded-xl"
        style={{ minHeight: 400 }}
        role="status"
        aria-label="Chargement de la carte"
      >
        <p className="text-marine font-sans text-lg">Chargement de la carte...</p>
      </div>
    );
  }

  if (!geojson) {
    return (
      <div className="flex items-center justify-center bg-[#E8E8E8] rounded-xl" style={{ minHeight: 400 }}>
        <p className="text-marine font-sans">Impossible de charger la carte.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="rounded-xl overflow-hidden border border-[#1B2E4A]/20"
        style={{ minHeight: 350 }}
        role="img"
        aria-label="Carte de France coloree selon la densite d'audioprothesistes par departement"
      >
        <MapContainer
          center={[46.8, 2.5]}
          zoom={6}
          minZoom={5}
          maxZoom={10}
          scrollWheelZoom={false}
          style={{ height: '600px', width: '100%', background: '#E8E8E8' }}
          className="map-deserts"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON
            ref={(ref) => { geojsonRef.current = ref; }}
            data={geojson}
            style={style as L.StyleFunction}
            onEachFeature={onEachFeature as (feature: GeoJSON.Feature, layer: L.Layer) => void}
          />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg px-4 py-3 shadow-md z-[1000] border border-[#1B2E4A]/10">
        <p className="font-sans text-xs font-semibold text-marine mb-2">
          Audioprothesistes / 100 000 hab.
        </p>
        {(['rouge', 'orange', 'jaune', 'vert'] as const).map((niveau) => (
          <div key={niveau} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="inline-block w-4 h-4 rounded-sm border border-[#1B2E4A]/20"
              style={{ backgroundColor: NIVEAU_COLORS[niveau] }}
            />
            <span className="font-sans text-xs text-marine">{NIVEAU_LABELS[niveau]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
