import { FiCpu, FiPlus, FiTag, FiX } from "react-icons/fi";

import {
  getWorkspaceTags
} from "../lib/workspaceUtils";

function TagsDrawer({
  aiStatus,
  isSuggestingTags,
  newTag,
  onAddTag,
  onAcceptSuggestedTag,
  onNewTagChange,
  onRemoveTag,
  onSuggestTags,
  onTagKeyDown,
  suggestedTags,
  workspace
}) {
  const tags = getWorkspaceTags(workspace);

  return (
    <div className="tag-editor">
      <div className="tag-list">
        {tags.map((tag) => (
          <span className="editable-tag" key={tag}>
            #{tag}
            <button
              onClick={() => onRemoveTag(tag)}
              aria-label={`Remove ${tag} tag`}
            >
              <FiX />
            </button>
          </span>
        ))}

        {tags.length === 0 && (
          <span className="tag-placeholder">No tags yet</span>
        )}
      </div>

      <div className="tag-input-row">
        <FiTag />
        <input
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={onTagKeyDown}
          placeholder="Add tag..."
        />
        <button onClick={onAddTag}>
          <FiPlus />
        </button>
      </div>

      <button
        className="inline-ai-btn"
        onClick={onSuggestTags}
        disabled={isSuggestingTags}
      >
        <FiCpu />
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

      {aiStatus && <p className="inline-ai-status">{aiStatus}</p>}
    </div>
  );
}

export default TagsDrawer;
