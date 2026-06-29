import { FiBookOpen, FiCheck, FiSettings, FiTag } from "react-icons/fi";

function AiDrawer({
  aiModels,
  aiSettings,
  aiSettingsStatus,
  isAiConfigOpen,
  isAiConfigured,
  isTestingAiConnection,
  onAiSettingsChange,
  onClearAiSettings,
  onSaveAiSettings,
  onTestAiConnection,
  onToggleConfig
}) {
  return (
    <div className="ai-settings-panel">
      <div className="ai-settings-header">
        <div>
          <h3>AI</h3>
          <p>Configure your own provider key and use AI where you work.</p>
        </div>

        <button className="ai-config-toggle" onClick={onToggleConfig}>
          <FiSettings />
          Settings
        </button>
      </div>

      <div className="ai-help-list">
        <div>
          <FiTag />
          <span>Suggest Tags appears inside the tags drawer.</span>
        </div>

        <div>
          <FiCheck />
          <span>Extract Todos reads your notes and suggests todo items.</span>
        </div>

        <div>
          <FiBookOpen />
          <span>Summarize Selection adds selected webpage text to notes.</span>
        </div>
      </div>

      {isAiConfigOpen && (
        <div className="ai-config-panel">
          <div className="ai-config-status-row">
            <span
              className={`ai-status-pill ${
                isAiConfigured ? "ai-connected" : ""
              }`}
            >
              {isAiConfigured ? "Configured" : "Not set"}
            </span>
          </div>

          <label className="ai-field">
            <span>Provider</span>
            <select
              value={aiSettings.provider}
              onChange={(e) =>
                onAiSettingsChange("provider", e.target.value)
              }
            >
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>

          <label className="ai-field">
            <span>API key</span>
            <input
              type="password"
              value={aiSettings.apiKey}
              onChange={(e) =>
                onAiSettingsChange("apiKey", e.target.value)
              }
              placeholder="Paste provider API key"
            />
          </label>

          <label className="ai-field">
            <span>Model</span>
            <select
              value={aiSettings.model}
              onChange={(e) =>
                onAiSettingsChange("model", e.target.value)
              }
            >
              {aiModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <p className="ai-privacy-note">
            Future AI actions will send selected workspace content to your
            configured provider.
          </p>

          <div className="ai-settings-actions">
            <button
              className="ai-test-btn"
              onClick={onTestAiConnection}
              disabled={isTestingAiConnection}
            >
              {isTestingAiConnection ? "Testing..." : "Test"}
            </button>

            <button className="ai-save-btn" onClick={onSaveAiSettings}>
              Save
            </button>

            <button className="ai-clear-btn" onClick={onClearAiSettings}>
              Clear
            </button>
          </div>
        </div>
      )}

      {aiSettingsStatus && (
        <p className="ai-settings-status">{aiSettingsStatus}</p>
      )}
    </div>
  );
}

export default AiDrawer;
