import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.send("EcoSort backend is running");
});

app.post("/api/predict", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await fetch(
      "https://serverless.roboflow.com/infer/workflows/viii-g/ecosortai2-vecosortai2-1-resnet18-t2-logic",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: process.env.ROBOFLOW_API_KEY,
          inputs: {
            image: {
              type: "base64",
              value: image
            }
          }
        })
      }
    );

    const result = await response.json();

console.log("Roboflow raw result:", JSON.stringify(result, null, 2));

const message =
  result?.outputs?.[0]?.message ||
  result?.results?.[0]?.outputs?.[0]?.message ||
  result?.results?.[0]?.output?.message ||
  result?.output?.message ||
  result?.[0]?.message ||
  result?.message ||
  result?.outputs?.message;

res.json({
  message: message || "No waste management message was returned.",
  raw: result
});

  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: "Prediction failed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
