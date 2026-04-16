import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';

type CentrePlan = 'rpps' | 'claimed' | 'premium';

interface Centre {
  id: string;
  slug: string;
  nom: string;
  adresse: string;
  cp: string;
  ville: string;
  lat: number;
  lng: number;
  tel: string | null;
  plan?: CentrePlan;
}

interface MiniMapProps {
  centres: Centre[];
  label?: string;
}

const iconFree = new L.Icon({
  iconUrl: '/images/marker-free.svg',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30],
});

const iconClaimed = new L.Icon({
  iconUrl: '/images/marker-claimed.svg',
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -34],
});

const iconPremium = new L.Icon({
  iconUrl: '/images/marker-premium.svg',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [1, -38],
});

function getIcon(plan: CentrePlan | undefined): L.Icon {
  if (plan === 'premium') return iconPremium;
  if (plan === 'claimed') return iconClaimed;
  return iconFree;
}

export default function MiniMap({ centres, label = 'Carte des centres' }: MiniMapProps) {
  const validCentres = useMemo(
    () => centres.filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number'),
    [centres]
  );

  const center = useMemo<[number, number]>(() => {
    if (validCentres.length === 0) return [46.5, 2.5]; // centre France
    const sumLat = validCentres.reduce((s, c) => s + c.lat, 0);
    const sumLng = validCentres.reduce((s, c) => s + c.lng, 0);
    return [sumLat / validCentres.length, sumLng / validCentres.length];
  }, [validCentres]);

  const bounds = useMemo(() => {
    if (validCentres.length < 2) return undefined;
    return L.latLngBounds(validCentres.map((c) => [c.lat, c.lng] as [number, number]));
  }, [validCentres]);

  if (validCentres.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(27,46,74,0.05)]"
      style={{ height: '400px' }}
      aria-label={label}
    >
      <MapContainer
        center={center}
        zoom={12}
        bounds={bounds}
        boundsOptions={{ padding: [30, 30], maxZoom: 14 }}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validCentres.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={getIcon(c.plan)}>
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <strong style={{ fontSize: '14px', color: '#1B2E4A' }}>{c.nom}</strong>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#5F5E56' }}>
                  {c.adresse}
                  <br />
                  {c.cp} {c.ville}
                </p>
                {c.tel && (
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <a href={`tel:${c.tel}`} style={{ color: '#D97B3D', fontWeight: 500 }}>
                      {c.tel}
                    </a>
                  </p>
                )}
                <a
                  href={`/centre/${c.slug}/`}
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '6px 12px',
                    background: '#D97B3D',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Voir la fiche
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
