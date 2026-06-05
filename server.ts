import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API endpoint for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API endpoint for AI Operations Analysis
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { logs, prompt } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Logs array is required for analysis." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured in secrets." });
    }

    const aiPrompt = `You are the AI Operations Analyst for the "Daily Monitoring V1" Google Sheet Dashboard.
Your job is to analyze the following operational daily logs and respond to the request.

User Request/Question: 
"${prompt || 'Summarize current daily logs, highlight main metrics, note any performance concerns, and provide actionable tips.'}"

Below is the structured daily logs data (JSON):
${JSON.stringify(logs, null, 2)}

Please write a highly professional, beautifully formatted Operational Report in Markdown.
Ensure you cover:
1. **Executive Highlights**: Key KPIs calculated from the data (e.g., Average Achievement Rate, Total Target vs Actual, Shift Performance, Status distribution of Tasks). Keep these numbers bolded.
2. **Shift Insights**: Compare the performance of the 'Morning' vs 'Evening' or other shifts if applicable. Are there bottlenecks?
3. **Anomalies / Concerns**: Point out any logs with low achievements (<80%), delayed statuses, or critical comments in remarks.
4. **Actionable Recommendations**: Clear, specific recommendations addressed to **John Diraya** and **sir Resti** to enhance and optimize operations.

Make the output structured and engaging with clean Markdown headers, bullet points, and dynamic callouts. Maintain a professional, positive, and constructive tone.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: aiPrompt,
    });

    const report = response.text || "No report generated.";
    res.json({ report });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI analysis." });
  }
});

// Start the server after configuring static files / Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
