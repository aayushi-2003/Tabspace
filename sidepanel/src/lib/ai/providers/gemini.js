const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

function getGeminiErrorMessage(error, fallbackMessage) {
  return (
    error?.error?.message ||
    error?.message ||
    fallbackMessage ||
    "Gemini request failed"
  );
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function generateGeminiText({
  apiKey,
  model,
  prompt,
  generationConfig = {},
  includeRawResponse = false
}) {
  if (!apiKey?.trim()) {
    throw new Error("Add a Gemini API key before using AI.");
  }

  if (!model?.trim()) {
    throw new Error("Select a Gemini model before using AI.");
  }

  if (!prompt?.trim()) {
    throw new Error("Add a prompt before using AI.");
  }

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          ...generationConfig
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      getGeminiErrorMessage(data, "Gemini request failed.")
    );
  }

  const text = extractGeminiText(data);

  if (includeRawResponse) {
    return {
      raw: data,
      text
    };
  }

  return text;
}

export async function testGeminiConnection(settings) {
  const text = await generateGeminiText({
    ...settings,
    prompt: "Reply with exactly one word: connected",
    generationConfig: {
      maxOutputTokens: 8,
      temperature: 0
    }
  });

  return text.toLowerCase().includes("connected");
}
