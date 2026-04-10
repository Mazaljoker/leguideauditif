import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

/* ===== Types ===== */
interface Audioprothesiste {
  id: string;
  slug: string;
  nom: string;
  enseigne: string;
  adresse: string;
  cp: string;
  ville: string;
  departement: string;
  lat: number;
  lng: number;
  tel: string;
  horaires: string | null;
  site_web: string | null;
  finess: string | null;
  source: string;
  is_premium: boolean;
}

interface AudioMapProps {
  data: Audioprothesiste[];
}

/* ===== Custom marker icons ===== */
const markerIconFree = new L.Icon({
  iconUrl: '/images/marker-free.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const markerIconPremium = new L.Icon({
  iconUrl: '/images/marker-premium.svg',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  className: 'marker-premium',
});

const markerIconActive = new L.Icon({
  iconUrl: '/images/marker-premium.svg',
  iconSize: [34, 55],
  iconAnchor: [17, 55],
  popupAnchor: [1, -46],
  className: 'marker-active',
});

/* ===== Cluster icon factory ===== */
function createClusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  return new L.DivIcon({
    html: `<div style="
      background: #D97B3D;
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: ${size < 40 ? '13' : '15'}px;
      box-shadow: 0 2px 8px rgba(27,46,74,0.3);
      border: 3px solid white;
    ">${count}</div>`,
    className: 'cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ===== Premium sort (shared) ===== */
function sortPremiumFirst<T extends { is_premium: boolean }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.is_premium !== b.is_premium) return b.is_premium ? 1 : -1;
    return 0;
  });
}

/* ===== Simple clustering logic ===== */
interface Cluster {
  lat: number;
  lng: number;
  items: Audioprothesiste[];
}

function clusterMarkers(
  items: Audioprothesiste[],
  zoom: number,
): Cluster[] {
  // At high zoom, show individual markers
  if (zoom >= 13) {
    return items.map((item) => ({
      lat: item.lat,
      lng: item.lng,
      items: [item],
    }));
  }

  // Grid-based clustering
  const gridSize = 360 / Math.pow(2, zoom + 2);
  const clusters = new Map<string, Cluster>();

  for (const item of items) {
    const gridX = Math.floor(item.lng / gridSize);
    const gridY = Math.floor(item.lat / gridSize);
    const key = `${gridX}:${gridY}`;

    if (clusters.has(key)) {
      const cluster = clusters.get(key)!;
      const n = cluster.items.length;
      cluster.lat = (cluster.lat * n + item.lat) / (n + 1);
      cluster.lng = (cluster.lng * n + item.lng) / (n + 1);
      cluster.items.push(item);
    } else {
      clusters.set(key, {
        lat: item.lat,
        lng: item.lng,
        items: [item],
      });
    }
  }

  return Array.from(clusters.values()).sort((a, b) => {
    const aPrem = a.items.some((i) => i.is_premium);
    const bPrem = b.items.some((i) => i.is_premium);
    if (aPrem !== bPrem) return bPrem ? 1 : -1;
    return 0;
  });
}

/* ===== MapController: handle zoom changes + fly-to ===== */
function MapController({
  onZoomChange,
  flyTo,
}: {
  onZoomChange: (zoom: number) => void;
  flyTo: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();

  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 1.2 });
    }
  }, [flyTo, map]);

  return null;
}

/* ===== Search bar with autocompletion ===== */
function SearchBar({
  onSelect,
}: {
  onSelect: (lat: number, lng: number, label: string, postcode: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    { label: string; lat: number; lng: number; postcode: string }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&type=municipality&limit=5`,
          );
          if (!res.ok) throw new Error('API error');
          const data = await res.json();
          const results = data.features.map(
            (f: {
              properties: { label: string; postcode: string };
              geometry: { coordinates: [number, number] };
            }) => ({
              label: f.properties.label,
              lng: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
              postcode: f.properties.postcode || '',
            }),
          );
          setSuggestions(results);
          setIsOpen(results.length > 0);
        } catch {
          setSuggestions([]);
          setIsOpen(false);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [],
  );

  return (
    <div ref={wrapperRef} className="search-bar-wrapper">
      <label htmlFor="audio-search" className="sr-only">
        Rechercher par ville ou code postal
      </label>
      <div className="search-input-container">
        <svg
          className="search-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="audio-search"
          type="search"
          placeholder="Ville ou code postal..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          role="combobox"
        />
        {loading && <span className="search-spinner" aria-hidden="true" />}
      </div>

      {isOpen && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="search-suggestions"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={false}
              tabIndex={0}
              onClick={() => {
                onSelect(s.lat, s.lng, s.label, s.postcode);
                setQuery(s.label);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSelect(s.lat, s.lng, s.label, s.postcode);
                  setQuery(s.label);
                  setIsOpen(false);
                }
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ===== Results sidebar list ===== */
function ResultsList({
  items,
  selectedId,
  onSelect,
}: {
  items: Audioprothesiste[];
  selectedId: string | null;
  onSelect: (item: Audioprothesiste) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (selectedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-id="${selectedId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  if (items.length === 0) {
    return (
      <div className="results-empty">
        <p>Aucun audioprothesiste trouve dans cette zone.</p>
        <p className="results-empty-hint">
          Essayez de zoomer ou de chercher une autre ville.
        </p>
      </div>
    );
  }

  const sorted = sortPremiumFirst(items);

  return (
    <ul ref={listRef} className="results-list" role="list">
      {sorted.map((item) => (
        <li
          key={item.id}
          data-id={item.id}
          className={`result-card ${selectedId === item.id ? 'result-card--active' : ''} ${item.is_premium ? 'result-card--premium' : ''}`}
          onClick={() => onSelect(item)}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(item)}
          tabIndex={0}
          role="button"
          aria-label={`${item.nom}, ${item.ville}`}
        >
          <div className="result-card-header">
            <span className="result-enseigne">{item.enseigne}</span>
            {item.is_premium && (
              <span className="result-badge-premium">Centre verifie</span>
            )}
          </div>
          <h3 className="result-nom">{item.nom}</h3>
          <p className="result-adresse">
            {item.adresse}, {item.cp} {item.ville}
          </p>
          {item.is_premium && item.tel ? (
            <a
              href={`tel:${item.tel.replace(/\s/g, '')}`}
              className="result-tel"
              onClick={(e) => e.stopPropagation()}
            >
              {item.tel}
            </a>
          ) : !item.is_premium ? (
            <span className="result-cta">Demander un devis gratuit</span>
          ) : null}
          <a
            href={`/centre/${item.slug}/`}
            className="result-link"
            onClick={(e) => e.stopPropagation()}
          >
            Voir la fiche
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ===== Popup content ===== */
function CentrePopup({ centre }: { centre: Audioprothesiste }) {
  return (
    <div className="popup-content">
      {centre.is_premium && (
        <span className="popup-badge-premium">Centre verifie</span>
      )}
      <span className="popup-enseigne">{centre.enseigne}</span>
      <h3 className="popup-nom">{centre.nom}</h3>
      <p className="popup-adresse">
        {centre.adresse}
        <br />
        {centre.cp} {centre.ville}
      </p>
      {centre.is_premium ? (
        <>
          {centre.tel && (
            <a
              href={`tel:${centre.tel.replace(/\s/g, '')}`}
              className="popup-tel"
            >
              {centre.tel}
            </a>
          )}
          {centre.horaires && (
            <p className="popup-horaires">
              <strong>Horaires :</strong> {centre.horaires}
            </p>
          )}
          {centre.site_web && (
            <a
              href={centre.site_web}
              target="_blank"
              rel="noopener"
              className="popup-web"
            >
              Visiter le site web
            </a>
          )}
        </>
      ) : (
        <a href={`/centre/${centre.slug}/`} className="popup-cta">
          Prendre RDV
        </a>
      )}
      <a href={`/centre/${centre.slug}/`} className="popup-link">
        Voir la fiche
      </a>
    </div>
  );
}

/* ===== Filter hook: CP search or map bounds ===== */
function useMapFilter(data: Audioprothesiste[], mapRef: React.RefObject<L.Map | null>) {
  const [visibleItems, setVisibleItems] = useState<Audioprothesiste[]>(data);
  const [postcode, setPostcode] = useState('');
  const postcodeRef = useRef('');

  const filterByPostcode = useCallback((cp: string) => {
    postcodeRef.current = cp;
    setPostcode(cp);
    if (cp) {
      setVisibleItems(data.filter((item) => item.cp === cp));
    }
  }, [data]);

  const clearPostcodeFilter = useCallback(() => {
    postcodeRef.current = '';
    setPostcode('');
  }, []);

  const updateFromBounds = useCallback(() => {
    if (postcodeRef.current) {
      setVisibleItems(data.filter((item) => item.cp === postcodeRef.current));
      return;
    }
    if (!mapRef.current) {
      setVisibleItems(data);
      return;
    }
    const bounds = mapRef.current.getBounds();
    setVisibleItems(data.filter((item) => bounds.contains([item.lat, item.lng])));
  }, [data, mapRef]);

  return { visibleItems, postcode, filterByPostcode, clearPostcodeFilter, updateFromBounds };
}

/* ===== Main AudioMap component ===== */
export default function AudioMap({ data }: AudioMapProps) {
  const [zoom, setZoom] = useState(6);
  const [flyTo, setFlyTo] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  const { visibleItems, postcode, filterByPostcode, clearPostcodeFilter, updateFromBounds } =
    useMapFilter(data, mapRef);

  const clusters = useMemo(
    () => clusterMarkers(visibleItems, zoom),
    [visibleItems, zoom],
  );

  const handleSearchSelect = useCallback(
    (lat: number, lng: number, label: string, cp: string) => {
      filterByPostcode(cp);
      setFlyTo({ lat, lng, zoom: 14 });
      setSearchLocation(label);
    },
    [filterByPostcode],
  );

  const handleCentreSelect = useCallback((item: Audioprothesiste) => {
    setSelectedId(item.id);
    setFlyTo({ lat: item.lat, lng: item.lng, zoom: 15 });
  }, []);

  return (
    <div className="audiomap-container">
      {/* Search bar */}
      <div className="audiomap-search">
        <SearchBar onSelect={handleSearchSelect} />
        {searchLocation && (
          <p className="audiomap-location-label">
            {visibleItems.length} centre{visibleItems.length > 1 ? 's' : ''}{' '}
            {postcode ? `a ${searchLocation} (${postcode})` : `pres de ${searchLocation}`}
          </p>
        )}
      </div>

      <div className="audiomap-layout">
        {/* Sidebar results */}
        <aside className="audiomap-sidebar" aria-label="Liste des audioprothesistes">
          <div className="audiomap-sidebar-header">
            <h2>{visibleItems.length} audioprothesiste{visibleItems.length > 1 ? 's' : ''}</h2>
          </div>
          <ResultsList
            items={visibleItems.slice(0, 50)}
            selectedId={selectedId}
            onSelect={handleCentreSelect}
          />
        </aside>

        {/* Map */}
        <div className="audiomap-map">
          <MapContainer
            center={[46.603354, 1.888334]}
            zoom={6}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            whenReady={() => {
              setTimeout(updateFromBounds, 100);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              onZoomChange={(z) => {
                setZoom(z);
                if (!flyTo) {
                  clearPostcodeFilter();
                }
                updateFromBounds();
              }}
              flyTo={flyTo}
            />

            {clusters.map((cluster, idx) =>
              cluster.items.length === 1 ? (
                <Marker
                  key={cluster.items[0].id}
                  position={[cluster.lat, cluster.lng]}
                  icon={
                    selectedId === cluster.items[0].id
                      ? markerIconActive
                      : cluster.items[0].is_premium
                        ? markerIconPremium
                        : markerIconFree
                  }
                  zIndexOffset={cluster.items[0].is_premium ? 1000 : 0}
                  eventHandlers={{
                    click: () => handleCentreSelect(cluster.items[0]),
                  }}
                >
                  <Popup maxWidth={300} minWidth={220}>
                    <CentrePopup centre={cluster.items[0]} />
                  </Popup>
                </Marker>
              ) : (
                <Marker
                  key={`cluster-${idx}`}
                  position={[cluster.lat, cluster.lng]}
                  icon={createClusterIcon(cluster.items.length)}
                  eventHandlers={{
                    click: () => {
                      setFlyTo({
                        lat: cluster.lat,
                        lng: cluster.lng,
                        zoom: Math.min(zoom + 3, 18),
                      });
                    },
                  }}
                />
              ),
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}