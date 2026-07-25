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

function getWastePractice(label) {
  const key = String(label || "").toLowerCase();

  if (key.includes("plastic") || key.includes("bottle") || key.includes("container")) {
    return "Rinse it, remove leftover food or liquid, flatten it if possible, and place it in the recycling bin. If it is very dirty or greasy, put it in general waste.";
  }

  if (key.includes("paper") || key.includes("cardboard") || key.includes("carton")) {
    return "Keep it dry and clean, flatten cardboard boxes, and place it in the paper recycling bin. Wet or food-stained paper should go to general waste or compost if accepted locally.";
  }

  if (key.includes("metal") || key.includes("can") || key.includes("tin") || key.includes("aluminium") || key.includes("aluminum")) {
    return "Empty and rinse it, then place it in metal recycling. Do not crush aerosol cans unless your local rules allow it.";
  }

  if (key.includes("glass") || key.includes("jar")) {
    return "Empty and rinse it, then place it in glass recycling. Broken glass should be wrapped safely and handled according to local rules.";
  }

  if (key.includes("organic") || key.includes("food") || key.includes("fruit") || key.includes("vegetable") || key.includes("compost")) {
    return "Put it in the compost or organic waste bin. Avoid adding plastic packaging, stickers, or non-compostable materials.";
  }

  if (key.includes("battery") || key.includes("electronic") || key.includes("e waste") || key.includes("charger")) {
    return "Do not put this in regular trash. Take it to an e-waste or hazardous waste collection point for safe recycling.";
  }

  if (key.includes("trash") || key.includes("general") || key.includes("landfill") || key.includes("non recyclable")) {
    return "Place it in general waste. Before throwing it away, check whether any clean parts can be separated for recycling.";
  }

  return "Check your local waste rules for this item. If it is clean and accepted locally, recycle it; otherwise place it in general waste.";
}

function extractRoboflowOutput(result) {
  return (
    result?.outputs?.[0] ||
    result?.results?.[0]?.outputs?.[0] ||
    result?.results?.[0]?.output ||
    result?.output ||
    result?.[0] ||
    result
  );
}

function createMessageFromResult(result) {
  const output = extractRoboflowOutput(result);

  const existingMessage =
    output?.message ||
    result?.message ||
    result?.outputs?.[0]?.message ||
    result?.results?.[0]?.outputs?.[0]?.message;

  if (existingMessage) {
    return existingMessage;
  }

  const predictionsData =
    output?.predictions ||
    output?.model_predictions ||
    result?.predictions ||
    result?.outputs?.[0]?.predictions;

  const label =
    predictionsData?.top ||
    predictionsData?.class ||
    predictionsData?.class_name ||
    predictionsData?.predictions?.[0]?.class ||
    predictionsData?.predictions?.[0]?.class_name;

  const confidence =
    predictionsData?.confidence ||
    predictionsData?.predictions?.[0]?.confidence;

  if (!label) {
    return "I could not identify the waste item clearly. Try another photo with better lighting and place the item in the center of the image.";
  }

  const cleanLabel = String(label).replaceAll("_", " ").replaceAll("-", " ");
  const titleLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);

  let confidenceText = "";
  if (typeof confidence === "number") {
    const percent = confidence <= 1 ? confidence * 100 : confidence;
    confidenceText = ` (${percent.toFixed(1)}% confidence)`;
  }

  const practice = getWastePractice(label);

  return `Detected: ${titleLabel}${confidenceText}. Waste management practice: ${practice}`;
}

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

    const message = createMessageFromResult(result);

    res.json({
      message,
      raw: result
    });
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({
      error: "Prediction failed",
      message: "Prediction failed. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
