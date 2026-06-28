export function getTodoProgress(todos = []) {
  const total = todos.length;
  const done = todos.filter((todo) => todo.done).length;

  if (!total) {
    return {
      done,
      total,
      label: "No todos"
    };
  }

  return {
    done,
    total,
    label: `${done}/${total} done`
  };
}

export function getPlainNoteText(note = "") {
  if (typeof document === "undefined") {
    return note.replace(/<[^>]+>/g, "");
  }

  const container = document.createElement("div");
  container.innerHTML = note;

  return container.textContent || "";
}

export function getWorkspaceTags(workspace) {
  return Array.isArray(workspace?.tags) ? workspace.tags : [];
}

export function getNotePreview(note = "") {
  const preview = getPlainNoteText(note)
    .replace(/[#*_`~>-]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return preview || "";
}

function getWorkspaceSearchText(workspace) {
  const todos = workspace.todos || [];
  const tags = getWorkspaceTags(workspace);

  return [
    workspace.title,
    workspace.pageTitle,
    workspace.pageUrl,
    workspace.domain,
    getPlainNoteText(workspace.note),
    ...tags,
    ...todos.map((todo) => todo.text)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesWorkspaceSearch(workspace, query) {
  const tokens = query
    .trim()
    .toLowerCase()
    .replace(/#/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return true;

  const searchText = getWorkspaceSearchText(workspace);

  return tokens.every((token) => searchText.includes(token));
}

export function normalizeTag(tag) {
  return tag
    .trim()
    .replace(/^#/, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
