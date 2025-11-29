import type { VercelRequest, VercelResponse } from "@vercel/node";

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.MISTRAL_API_KEY) {
    return res.status(500).json({ error: "Missing API KEY" });
  }
  const stations: Station[] = req.body.stations;
  if (!stations || !Array.isArray(stations)) {
    return res.status(400).json({ error: "stations array is required" });
  }

  const problematicStations = stations.filter(
    (s) =>
      s.latestReading &&
      (s.latestReading.temperature! > 30 ||
        s.latestReading.emissions! > 150 ||
        s.latestReading.noise! > 85)
  );

  if (problematicStations.length === 0) {
    return res.status(200).json([]);
  }

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

Output as a valid JSON array:
[
  {
    "stationName": "Station Name",
    "area": "Station Area",
    "parameter": "Temperature" | "PM 2.5 Emissions" | "Noise",
    "value": <reading_value>,
    "threshold": <threshold_value>,
    "suggestion": "Concise, locally applicable mitigation step."
  }
]
`;

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
            content:
              "You are an environmental specialist analyzing live sensor station data.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!apiResponse.ok)
      throw new Error(`API error ${apiResponse.status}`);

    const aiData : any = await apiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content || "";

    const cleanContent = content.replace(/```json|```/g, "").replace(/\*\*/g, "").trim();
    const suggestions: Suggestion[] = JSON.parse(cleanContent);

    return res.status(200).json(suggestions);
  } catch (error) {
    console.error("AI request failed:", error);

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
            suggestion: "Implement carbon capture or reduce operational hours.",
          };
        if (s.latestReading?.noise! > 85)
          return {
            stationName: s.info.name,
            area: s.info.area,
            parameter: "Noise",
            value: s.latestReading?.noise!,
            threshold: 85,
            suggestion:
              "Install noise barriers or schedule loud activities off-peak.",
          };
        return null;
      })
      .filter(Boolean) as Suggestion[];

    return res.status(200).json(mockSuggestions);
  }
}
