import { getAiSettings } from "../aiSettings";
import {
  generateGeminiText,
  testGeminiConnection
} from "./providers/gemini";
import {
  generateGroqText,
  testGroqConnection
} from "./providers/groq";

function assertAiConfigured(settings) {
  if (!settings?.apiKey?.trim()) {
    throw new Error("Add an API key in AI Settings first.");
  }

  if (!settings?.provider) {
    throw new Error("Choose an AI provider first.");
  }
}

async function getResolvedSettings(settingsOverride) {
  return settingsOverride || getAiSettings();
}

export async function generateAiText({
  prompt,
  generationConfig,
  settings,
  includeRawResponse = false
}) {
  const resolvedSettings = await getResolvedSettings(settings);

  assertAiConfigured(resolvedSettings);

  switch (resolvedSettings.provider) {
    case "groq":
      return generateGroqText({
        apiKey: resolvedSettings.apiKey,
        model: resolvedSettings.model,
        prompt,
        generationConfig,
        includeRawResponse
      });
    case "gemini":
      return generateGeminiText({
        apiKey: resolvedSettings.apiKey,
        model: resolvedSettings.model,
        prompt,
        generationConfig,
        includeRawResponse
      });
    default:
      throw new Error(
        `${resolvedSettings.provider} is not supported yet.`
      );
  }
}

export async function testAiConnection(settings) {
  const resolvedSettings = await getResolvedSettings(settings);

  assertAiConfigured(resolvedSettings);

  switch (resolvedSettings.provider) {
    case "groq":
      return testGroqConnection(resolvedSettings);
    case "gemini":
      return testGeminiConnection(resolvedSettings);
    default:
      throw new Error(
        `${resolvedSettings.provider} is not supported yet.`
      );
  }
}
