// /api/analyzeStations.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import JSON5 from "json5";

type Station = {
  info: { name: string; area: string };
  latestReading?: { temperature?: number; emissions?: number; noise?: number };
};

type Suggestion = {
  stationName: string;
  area: string;
  parameter: "Temperature" | "PM 2.5 Emissions" | "Noise";
  value: number;
  threshold: number;
  suggestion: string;
};

// --- In-memory cache (2 minutes)
let cache: { time: number; data: Suggestion[] } | null = null;

// --- In-memory lock to prevent concurrent API calls per instance
let apiBusy = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stations: Station[] = req.body.stations;
  if (!stations || !Array.isArray(stations)) return res.status(400).json({ error: "stations array is required" });

  // --- Check cache
  if (cache && Date.now() - cache.time < 2 * 60 * 1000) {
    return res.status(200).json(cache.data);
  }

  const problematicStations = stations.filter(
    (s) =>
      s.latestReading &&
      (s.latestReading.temperature! > 30 ||
        s.latestReading.emissions! > 150 ||
        s.latestReading.noise! > 85)
  );

  if (problematicStations.length === 0) return res.status(200).json([]);

  // --- Prepare prompt
  const data = problematicStations
    .map(
      (s) => `
- Station: ${s.info.name}
- Station Area: ${s.info.area}
  - Temperature: ${s.latestReading?.temperature}°C
  - PM 2.5 Emissions: ${s.latestReading?.emissions} ppm
  - Noise: ${s.latestReading?.noise} dB
`
    )
    .join("");

  const prompt = `
You are an expert in environmental monitoring and Indian urban infrastructure.
Analyze the following **live sensor data** and provide **specific, actionable mitigation suggestions** for any parameter exceeding Indian standards.
Data:
${data}

Output as **valid JSON only** using double quotes for keys and string values. Do NOT include Markdown or extra text.
Format:
[
  {
    "stationName": "Station Name",
    "area": "Station Area",
    "parameter": "Temperature" | "PM 2.5 Emissions" | "Noise",
    "value": <number>,
    "threshold": <number>,
    "suggestion": "Concise, locally applicable mitigation step."
  }
]
`;

  // --- Mock fallback
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
          suggestion: "Implement carbon capture or reduce operational hours.",
        };
      if (s.latestReading?.noise! > 85)
        return {
          stationName: s.info.name,
          area: s.info.area,
          parameter: "Noise",
          value: s.latestReading?.noise!,
          threshold: 85,
          suggestion: "Install noise barriers or schedule loud activities off-peak.",
        };
      return null;
    })
    .filter(Boolean) as Suggestion[];

  // --- Check API key
  if (!process.env.MISTRAL_API_KEY) {
    console.warn("Missing MISTRAL_API_KEY. Returning mock data.");
    return res.status(200).json(mockSuggestions);
  }

  // --- Prevent concurrent API calls
  if (apiBusy) {
    console.warn("API busy. Returning cached or mock data.");
    if (cache) return res.status(200).json(cache.data);
    return res.status(200).json(mockSuggestions);
  }

  apiBusy = true;

  try {
    const apiResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: "You are an environmental specialist analyzing live sensor station data.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    // --- Log raw response for debugging
    const rawText = await apiResponse.text();
    console.log("=== RAW AI RESPONSE ===");
    console.log(rawText);
    console.log("======================");

    if (!apiResponse.ok) {
      console.warn(`Mistral API error: ${apiResponse.status}`);
      if (apiResponse.status === 429) console.warn("Rate limit hit!");
      return res.status(200).json(mockSuggestions);
    }

    // --- Safe JSON parse
    let suggestions: Suggestion[];
    try {
      suggestions = JSON.parse(rawText);
    } catch {
      try {
        suggestions = JSON5.parse(rawText);
      } catch (err) {
        console.error("JSON parsing failed, using mock data.", err);
        suggestions = mockSuggestions;
      }
    }

    // --- Update cache
    cache = { time: Date.now(), data: suggestions };

    return res.status(200).json(suggestions);
  } catch (err) {
    console.error("AI request failed, returning mock data.", err);
    return res.status(200).json(mockSuggestions);
  } finally {
    apiBusy = false;
  }
}
