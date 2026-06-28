import {
  FiBookOpen,
  FiCheck,
  FiPlus,
  FiSettings,
  FiTag
} from "react-icons/fi";

function AiDrawer({
  aiModels,
  aiSettings,
  aiSettingsStatus,
  isAiConfigOpen,
  isAiConfigured,
  isExtractingTodos,
  isSuggestingTags,
  isSummarizingSelection,
  isTestingAiConnection,
  onAcceptSuggestedTag,
  onAcceptSuggestedTodo,
  onAiSettingsChange,
  onClearAiSettings,
  onDismissSelectionSummary,
  onExtractTodos,
  onInsertSelectionSummary,
  onSaveAiSettings,
  onSuggestTags,
  onSummarizeSelection,
  onTestAiConnection,
  onToggleConfig,
  selectionSummary,
  suggestedTags,
  suggestedTodos
}) {
  return (
    <div className="ai-settings-panel">
      <div className="ai-settings-header">
        <div>
          <h3>AI</h3>
          <p>Use your own provider key for optional actions.</p>
        </div>

        <button className="ai-config-toggle" onClick={onToggleConfig}>
          <FiSettings />
          Settings
        </button>
      </div>

      <div className="ai-actions-panel">
        <button
          className="ai-action-btn"
          onClick={onSuggestTags}
          disabled={isSuggestingTags}
        >
          <FiTag />
          {isSuggestingTags ? "Suggesting..." : "Suggest Tags"}
        </button>

        {suggestedTags.length > 0 && (
          <div className="suggested-tag-list">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onAcceptSuggestedTag(tag)}
              >
                + #{tag}
              </button>
            ))}
          </div>
        )}

        <button
          className="ai-action-btn"
          onClick={onExtractTodos}
          disabled={isExtractingTodos}
        >
          <FiCheck />
          {isExtractingTodos ? "Extracting..." : "Extract Todos"}
        </button>

        {suggestedTodos.length > 0 && (
          <div className="suggested-todo-list">
            {suggestedTodos.map((todo) => (
              <button
                key={todo}
                onClick={() => onAcceptSuggestedTodo(todo)}
              >
                <FiPlus />
                {todo}
              </button>
            ))}
          </div>
        )}

        <button
          className="ai-action-btn"
          onClick={onSummarizeSelection}
          disabled={isSummarizingSelection}
        >
          <FiBookOpen />
          {isSummarizingSelection
            ? "Summarizing..."
            : "Summarize Selection"}
        </button>

        {selectionSummary && (
          <div className="selection-summary-card">
            <p>{selectionSummary}</p>
            <div className="selection-summary-actions">
              <button onClick={onInsertSelectionSummary}>
                Insert into Notes
              </button>
              <button onClick={onDismissSelectionSummary}>Dismiss</button>
            </div>
          </div>
        )}
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
