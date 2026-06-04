const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqErrorMessage(error, fallbackMessage) {
  return (
    error?.error?.message ||
    error?.message ||
    fallbackMessage ||
    "Groq request failed"
  );
}

function extractGroqText(data) {
  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  return text;
}

export async function generateGroqText({
  apiKey,
  model,
  prompt,
  generationConfig = {},
  includeRawResponse = false
}) {
  if (!apiKey?.trim()) {
    throw new Error("Add a Groq API key before using AI.");
  }

  if (!model?.trim()) {
    throw new Error("Select a Groq model before using AI.");
  }

  if (!prompt?.trim()) {
    throw new Error("Add a prompt before using AI.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a concise productivity assistant. Follow output format instructions exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: generationConfig.maxOutputTokens || 512,
      stream: false,
      temperature: generationConfig.temperature ?? 0.2
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getGroqErrorMessage(data, "Groq request failed."));
  }

  const text = extractGroqText(data);

  if (includeRawResponse) {
    return {
      raw: data,
      text
    };
  }

  return text;
}

export async function testGroqConnection(settings) {
  const text = await generateGroqText({
    ...settings,
    prompt: "Reply with exactly one word: connected",
    generationConfig: {
      maxOutputTokens: 16,
      temperature: 0
    }
  });

  return text.toLowerCase().includes("connected");
}
