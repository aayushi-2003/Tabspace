import { escapeHtml } from "../htmlUtils";
import {
  getPlainNoteText,
  getWorkspaceTags
} from "../workspaceUtils";

export function buildSuggestTagsPrompt(workspace) {
  const todos = workspace.todos || [];

  return `
You are a tag generator for a Chrome productivity extension.
Generate 3 to 6 useful tags for the workspace below.

Rules:
- Return a JSON array of strings only.
- Do not use markdown.
- Do not wrap the response in a code block.
- Do not add any explanation.
- Do not say "here is".
- Use lowercase.
- Use short tags, 1 to 3 words.
- Do not include #.
- Prefer useful organization labels over generic words.
- Avoid tags already present.

Existing tags:
${getWorkspaceTags(workspace).join(", ") || "none"}

Workspace:
Title: ${workspace.title || ""}
Page title: ${workspace.pageTitle || ""}
URL: ${workspace.pageUrl || ""}
Notes: ${getPlainNoteText(workspace.note || "") || "none"}
Todos: ${
    todos.map((todo) => todo.text).join("; ") || "none"
  }

Example response:
["research","frontend","bug-fix"]
`.trim();
}

export function buildExtractTodosPrompt(workspace) {
  return `
Extract concise todo items only from these workspace notes.

Rules:
- Return a JSON array of strings only.
- Do not use markdown.
- Do not add explanation.
- Each todo should be actionable and short.
- Avoid duplicates.
- Only use information present in the notes.
- Do not infer todos from the workspace title or any existing todo list.
- If there are no actionable todos, return [].

Workspace title: ${workspace.title || ""}
Notes:
${getPlainNoteText(workspace.note || "") || "none"}

Example response:
["review documentation","compare pricing options"]
`.trim();
}

export function buildSummarizeSelectionPrompt(selectedText) {
  return `
Summarize the selected webpage text for a personal workspace note.

Rules:
- Keep it concise.
- Use 2 to 4 bullet points when useful.
- Do not add information that is not in the selected text.
- Do not mention that you are an AI.

Selected text:
${selectedText}
`.trim();
}

export function formatSummaryHtml(summary) {
  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const body = lines
    .map((line) => `<p>${escapeHtml(line.replace(/^[-*]\s*/, ""))}</p>`)
    .join("");

  return `<p><strong>Selected text summary</strong></p>${body}`;
}
