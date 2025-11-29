// src/components/RealtimeData.tsx
import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase";
import Map from "./Map";
import AiAssistant from "./AiAssistant";
import type { SensorReading } from "../types";
import { FaTemperatureHigh, FaSmog, FaVolumeUp } from "react-icons/fa";

interface Station {
  id: string;
  info: {
    area: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    name: string;
  };
  latestReading: SensorReading | null;
}

const NOISE_THRESHOLD = 55; // Change to your desired threshold

const RealtimeData = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [recentReadings, setRecentReadings] = useState<Record<string, SensorReading[]>>({});
  const [selectedArea, setSelectedArea] = useState<string>("All Areas");
  const [selectedDevice, setSelectedDevice] = useState<string>("All Devices");

  useEffect(() => {
    const stationsRef = ref(db, "stations");
    const readingsRef = ref(db, "readings");

    const fetchData = async () => {
      try {
        const [stationsSnapshot, readingsSnapshot] = await Promise.all([
          get(stationsRef),
          get(readingsRef),
        ]);

        const stationsData = stationsSnapshot.val();
        const readingsData = readingsSnapshot.val();

        if (stationsData) {
          const stationList = Object.keys(stationsData).map((id) => {
            const stationInfo = stationsData[id].info;
            const latestReadings = readingsData?.[id];

            if (!latestReadings) return null;

            const keys = Object.keys(latestReadings).map(Number).sort((a, b) => a - b);
            const latestKey = keys[keys.length - 1]?.toString();
            const latestReading = latestKey ? latestReadings[latestKey] : null;

            return {
              id,
              info: stationInfo,
              latestReading,
            };
          });

          const filteredStations = stationList.filter((s): s is Station => s !== null);
          setStations(filteredStations);

          // Update recent readings (last 5)
          setRecentReadings((prev) => {
            const updated: Record<string, SensorReading[]> = { ...prev };
            filteredStations.forEach((station) => {
              if (!station.latestReading) return;
              if (!updated[station.id]) updated[station.id] = [];
              updated[station.id] = [...updated[station.id], station.latestReading].slice(-5);
            });
            return updated;
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData(); // initial fetch
    const intervalId = setInterval(fetchData, 2000); // poll every 2 seconds

    return () => clearInterval(intervalId); // cleanup
  }, []);

  // Filters
  const filteredStations = stations
    .filter(
      (station) =>
        selectedArea === "All Areas" || station.info.area === selectedArea
    )
    .filter(
      (station) =>
        selectedDevice === "All Devices" ||
        station.info.deviceId === selectedDevice
    );

  const getCardClass = (reading: SensorReading | null) => {
    if (!reading) return "station-card";
    if (reading.temperature > 35 || reading.emissions > 200) {
      return "station-card critical";
    }
    if (reading.temperature > 30 || reading.emissions > 150) {
      return "station-card warning";
    }
    return "station-card";
  };

  const getAverageNoise = (stationId: string) => {
    const readings = recentReadings[stationId] || [];
    if (readings.length === 0) return 0;
    const total = readings.reduce((sum, r) => sum + r.noise, 0);
    return total / readings.length;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
      }}
    >
      <div className="realtime-container">
        <div className="map-pane">
          <Map stations={filteredStations} />
        </div>
        <div className="data-pane">
          <div className="selectors">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option>All Areas</option>
              {[...new Set(stations.map((s) => s.info.area))].map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option>All Devices</option>
              {[...new Set(stations.map((s) => s.info.deviceId))].map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="stations-grid">
            {filteredStations.map((station) => {
              const avgNoise = getAverageNoise(station.id);
              return (
                <div key={station.id} className={getCardClass(station.latestReading)}>
                  <h3>{station.info.name}</h3>
                  {station.latestReading ? (
                    <>
                      {selectedArea === "All Areas" && (
                        <p>
                          <strong>Location:</strong> {station.info.area}
                        </p>
                      )}
                      <p className="sensor-reading">
                        <strong>
                          <FaTemperatureHigh /> Temperature:
                        </strong>
                        <span>{station.latestReading.temperature}°C</span>
                      </p>
                      <p className="sensor-reading">
                        <strong>
                          <FaSmog /> PM 2.5 Emissions:
                        </strong>
                        <span>{station.latestReading.emissions} ppm</span>
                      </p>
                      <p className="sensor-reading">
                        <strong>
                          <FaVolumeUp /> Noise:
                        </strong>
                        <span>{station.latestReading.noise} dB</span>
                      </p>
                      {avgNoise > NOISE_THRESHOLD && (
                        <p style={{ color: "#FFFF8F", fontWeight: "bold" }}>
                           Warning! High Levels of Noise Detected.
                        </p>
                      )}
                    </>
                  ) : (
                    <p>No reading available</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "18px", width: "60%" }}>
        <AiAssistant stations={filteredStations} />
      </div>
    </div>
  );
};

export default RealtimeData;
