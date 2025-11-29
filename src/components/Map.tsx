
// src/components/Map.tsx
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
// leaflet-default-icon-issue-solution
interface DefaultIcon extends L.Icon.Default {
  _getIconUrl?: () => string;
}

// @ts-ignore
(delete L.Icon.Default.prototype as DefaultIcon)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Station {
  id: string;
  info: {
    latitude: number;
    longitude: number;
    name: string;
  };
  latestReading: {
    datetime: string;
    temperature: number;
    emissions: number;
    noise: number;
  } | null;
}

interface MapUpdaterProps {
  stations: Station[];
}

const MapUpdater = ({ stations }: MapUpdaterProps) => {
  const map = useMap();

  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.info.latitude, s.info.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);

  return null;
};

const Map = ({ stations }: { stations: Station[] }) => {
  const position: [number, number] = [20.5937, 78.9629]; // Default center of India

  return (
    <MapContainer
      center={position}
      zoom={5} // Initial zoom to show a broader area
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.info.latitude, station.info.longitude]}
        >
          <Popup>
            <h3>{station.info.name}</h3>
            {station.latestReading ? (
              <div>
                <p>
                  <strong>Heat:</strong> {station.latestReading.temperature}°C
                </p>
                <p>
                  <strong>Emissions:</strong> {station.latestReading.emissions} ppm
                </p>
                <p>
                  <strong>Noise:</strong> {station.latestReading.noise} dB
                </p>
                <small>Last updated: {new Date(station.latestReading.datetime).toLocaleString()}</small>
              </div>
            ) : (
              <p>No reading available</p>
            )}
          </Popup>
        </Marker>
      ))}
      <MapUpdater stations={stations} />
    </MapContainer>
  );
};

export default Map;