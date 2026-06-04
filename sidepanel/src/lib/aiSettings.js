const AI_SETTINGS_KEY = "tabspace:ai-settings";

export const DEFAULT_AI_SETTINGS = {
  provider: "groq",
  apiKey: "",
  model: "llama-3.3-70b-versatile"
};

function hasChromeStorage() {
  return Boolean(globalThis.chrome?.storage?.local);
}

function normalizeAiSettings(settings = {}) {
  const normalizedSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...settings
  };

  if (normalizedSettings.provider === "grok") {
    return {
      ...normalizedSettings,
      provider: "groq",
      model: "llama-3.3-70b-versatile"
    };
  }

  return normalizedSettings;
}

export async function getAiSettings() {
  if (hasChromeStorage()) {
    const result = await globalThis.chrome.storage.local.get([
      AI_SETTINGS_KEY
    ]);

    return normalizeAiSettings(result[AI_SETTINGS_KEY]);
  }

  const saved = localStorage.getItem(AI_SETTINGS_KEY);

  return normalizeAiSettings(saved ? JSON.parse(saved) : {});
}

export async function saveAiSettings(settings) {
  const nextSettings = normalizeAiSettings(settings);

  if (hasChromeStorage()) {
    await globalThis.chrome.storage.local.set({
      [AI_SETTINGS_KEY]: nextSettings
    });

    return nextSettings;
  }

  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(nextSettings));

  return nextSettings;
}

export async function clearAiSettings() {
  if (hasChromeStorage()) {
    await globalThis.chrome.storage.local.remove([AI_SETTINGS_KEY]);

    return DEFAULT_AI_SETTINGS;
  }

  localStorage.removeItem(AI_SETTINGS_KEY);

  return DEFAULT_AI_SETTINGS;
}
