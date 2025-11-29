import { useEffect, useState } from "react";

const MAX_TEMP = 200;
const MAX_NOISE = 120;
const MAX_EMISSIONS = 500;

const circumference = 2 * Math.PI * 84;

const getColor = (value: number, max: number): string => {
  const percentage = (value / max) * 100;

  if (percentage < 50) return "#48bb78";
  if (percentage < 80) return "#ecc94b";
  return "#e53e3e";
};

interface GaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: string | React.ReactNode;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, max, unit, icon }) => {
  const [offset, setOffset] = useState<number>(circumference);

  useEffect(() => {
    const progress = circumference - (value / max) * circumference;
    setOffset(progress);
  }, [value, max]);

  const color = getColor(value, max);

  return (
    <div className="gauge-card">
      <div className="gauge-icon">{icon}</div>
      <div className="gauge-title">{label}</div>

      <div className="gauge-container">
        <svg className="gauge-svg" viewBox="0 0 200 200">
          <circle
            className="gauge-background"
            cx={100}
            cy={100}
            r={84}
            strokeDasharray={circumference}
          />
          <circle
            className="gauge-progress"
            cx={100}
            cy={100}
            r={84}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke={color}
          />
        </svg>

        <div className="gauge-center-content">
          <div className="gauge-value">{value}</div>
          <div className="gauge-unit">{unit}</div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------
// Types for your station object
// -------------------------------

interface LatestReading {
  temperature: number;
  noise: number;
  emissions: number;
}

interface StationInfo {
  name: string;
  area?: string;
}

interface Station {
  id: string | number;
  info: StationInfo;
  latestReading?: LatestReading | null;
}

interface StationGaugeCardProps {
  station: Station;
}

const StationGaugeCard: React.FC<StationGaugeCardProps> = ({ station }) => {
  if (!station.latestReading) {
    return <div className="gauge-card">No reading available</div>;
  }

  const { temperature, noise, emissions } = station.latestReading;

  return (
    <div className="station-gauge-wrapper">

      <div className="gauge-row">
        <Gauge
          label="Temperature"
          value={temperature}
          max={MAX_TEMP}
          unit="°C"
          icon="🌡️"
        />

        <Gauge
          label="Noise Level"
          value={noise}
          max={MAX_NOISE}
          unit="dB"
          icon="🔊"
        />

        <Gauge
          label="PM2.5 Emissions"
          value={emissions}
          max={MAX_EMISSIONS}
          unit="ppm"
          icon="♨️"
        />
      </div>
    </div>
  );
};

export default StationGaugeCard;
