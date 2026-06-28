import { FiPlus, FiTag, FiX } from "react-icons/fi";

import {
  getWorkspaceTags
} from "../lib/workspaceUtils";

function TagsDrawer({
  newTag,
  onAddTag,
  onNewTagChange,
  onRemoveTag,
  onTagKeyDown,
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
    </div>
  );
}

export default TagsDrawer;
