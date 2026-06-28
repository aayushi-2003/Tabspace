function stripJsonFence(text) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseJsonArray(text, objectKey) {
  const cleanedText = stripJsonFence(text);

  try {
    const parsed = JSON.parse(cleanedText);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed[objectKey])) {
      return parsed[objectKey];
    }
  } catch {
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
  }

  return null;
}

export function parseSuggestedTags(text) {
  const parsedTags = parseJsonArray(text, "tags");

  const normalizeSuggestedTagList = (tagList) =>
    tagList
      .map((tag) =>
        typeof tag === "string" ? tag : tag?.tag || tag?.name || ""
      )
      .filter(Boolean);

  if (parsedTags) {
    return normalizeSuggestedTagList(parsedTags);
  }

  const cleanedText = stripJsonFence(text);
  const quotedTags = Array.from(
    cleanedText.matchAll(/"([^"]+)"/g),
    (match) => match[1]
  );

  if (quotedTags.length) {
    return normalizeSuggestedTagList(quotedTags);
  }

  return cleanedText
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line && !/\b(json|here is|requested)\b/i.test(line));
}

export function parseSuggestedTodos(text) {
  const parsedTodos = parseJsonArray(text, "todos");

  const normalizeTodoList = (todoList) =>
    todoList
      .map((todo) =>
        typeof todo === "string" ? todo : todo?.text || todo?.todo || ""
      )
      .map((todo) => todo.trim())
      .filter(Boolean);

  if (parsedTodos) {
    return normalizeTodoList(parsedTodos);
  }

  return stripJsonFence(text)
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line && !/\b(json|here is|requested)\b/i.test(line));
}
