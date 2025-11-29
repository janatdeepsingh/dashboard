// src/components/AiAssistantChat.tsx
import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { SensorReading } from "../types";

interface Station {
  id: string | number;
  info: {
    name: string;
    latitude: number;
    longitude: number;
    area: string;
  };
  latestReading: SensorReading | null;
}

interface Suggestion {
  stationName: string;
  area: string;
  parameter: "Temperature" | "PM 2.5 Emissions" | "Noise";
  value: number;
  threshold: number;
  suggestion: string;
}

const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

interface AiAssistantChatProps {
  stations: Station[];
}

const AiAssistantChat: React.FC<AiAssistantChatProps> = ({ stations }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setChatOpen((prev) => !prev);

  const analyzeStationsWithAI = async (stations: Station[]) => {
    setLoading(true);
    setSuggestions([]);
  
    // Filter only problematic stations
    const problematicStations = stations.filter(
      (s) =>
        s.latestReading &&
        (s.latestReading.temperature! > 30 ||
          s.latestReading.emissions! > 150 ||
          s.latestReading.noise! > 85)
    );
  
    if (problematicStations.length === 0) {
      setLoading(false);
      return;
    }
  
    try {
      // Call serverless function
      const response = await fetch("/api/analyzeStations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stations: problematicStations }),
      });
  
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
  
      const suggestions: Suggestion[] = await response.json();
  
      if (suggestions.length > 0) {
        setSuggestions(suggestions);
      } else {
        console.warn("No suggestions returned from AI.");
      }
    } catch (error) {
      console.error("Error fetching AI suggestions, using fallback:", error);
  
      // Fallback: generate mock suggestions
      const mockSuggestions: Suggestion[] = problematicStations
        .map((s) => {
          if (s.latestReading?.temperature! > 30)
            return {
              stationName: s.info.name,
              area: s.info.area,
              parameter: "Temperature",
              value: s.latestReading?.temperature!,
              threshold: 30,
              suggestion: "Deploy cooling systems or improve ventilation.",
            };
          if (s.latestReading?.emissions! > 150)
            return {
              stationName: s.info.name,
              area: s.info.area,
              parameter: "PM 2.5 Emissions",
              value: s.latestReading?.emissions!,
              threshold: 150,
              suggestion:
                "Implement carbon capture technologies or reduce operational hours.",
            };
          if (s.latestReading?.noise! > 85)
            return {
              stationName: s.info.name,
              area: s.info.area,
              parameter: "Noise",
              value: s.latestReading?.noise!,
              threshold: 85,
              suggestion:
                "Install noise barriers or schedule loud activities during off-peak hours.",
            };
          return null;
        })
        .filter(Boolean) as Suggestion[];
  
      setSuggestions(mockSuggestions);
    }
  
    setLoading(false);
  };

  return (
    <>
      {/* Floating Get Assistance Button */}
      {!chatOpen && (
        <Button
          variant="contained"
          onClick={toggleChat}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            borderRadius: "50px",
            backgroundColor: "#2ecc71",
            "&:hover": { backgroundColor: "#27ae60" },
            zIndex: 1000,
          }}
        >
          Get Assistance
        </Button>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <Box
          sx={{
    position: "fixed",
    bottom: 0,
    right: 24,
    width: suggestions.length > 0 ? 480 : 360, // wider if we have responses
    maxHeight: suggestions.length > 0 ? "100vh" : "70vh", // taller with responses
    bgcolor: "#1f1f1f",
    borderRadius: "12px 12px 0 0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    transition: "all 0.3s ease-in-out", // smooth resize
  }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: "1px solid #333",
            }}
          >
            <Typography sx={{ fontWeight: "bold", color: "#2ecc71" }}>
              AI Assistant
            </Typography>
            <IconButton size="small" onClick={toggleChat}>
              <CloseIcon sx={{ color: "#fff" }} />
            </IconButton>
          </Box>

          {/* Chat Content */}
          <Box
            sx={{
              p: 2,
              overflowY: "auto",
              flexGrow: 1,
              color: "#fff",
            }}
          >
            {suggestions.length === 0 && !loading && (
              <Typography sx={{ color: "#ccc" }}>
                Click "Analyze" to get mitigation strategies and suggestions.
              </Typography>
            )}

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <CircularProgress color="inherit" size={24} />
              </Box>
            )}

            {suggestions.length > 0 &&
              Object.entries(
                suggestions.reduce((acc: Record<string, Suggestion[]>, curr) => {
                  if (!acc[curr.stationName]) acc[curr.stationName] = [];
                  acc[curr.stationName].push(curr);
                  return acc;
                }, {})
              ).map(([stationName, stationSuggestions]) => {
                const area = stationSuggestions[0]?.area || "";
                return (
                  <Box
                    key={stationName}
                    sx={{
                      mt: 2,
                      p: 1,
                      backgroundColor: "#2a2a2a",
                      borderRadius: "8px",
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {stationName} {area && `- ${area}`}
                    </Typography>

                    {stationSuggestions.map((s, idx) => (
                      <Box key={idx} sx={{ mt: 0.5 }}>
                        <Typography>
                          <strong>Parameter:</strong> {s.parameter}
                        </Typography>
                        <Typography>
                          <strong>Value:</strong> {s.value} (Threshold: {s.threshold})
                        </Typography>
                        <Typography>
                          <strong>Suggestion:</strong> {s.suggestion}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
          </Box>

          {/* Analyze Button */}
          <Box sx={{ p: 2, borderTop: "1px solid #333" }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => analyzeStationsWithAI(stations)}
              disabled={loading}
              sx={{
                backgroundColor: "#2ecc71",
                "&:hover": { backgroundColor: "#27ae60" },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Analyze"}
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
};

export default AiAssistantChat;
