export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isSelectionInsideCodeSnippet(editor, selection) {
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element =
    container.nodeType === Node.ELEMENT_NODE
      ? container
      : container.parentElement;

  return Boolean(
    element?.closest("pre, code") &&
      editor.contains(element.closest("pre, code"))
  );
}

export async function getSelectedTextFromActiveTab() {
  if (
    globalThis.chrome?.tabs?.query &&
    globalThis.chrome?.scripting?.executeScript
  ) {
    const tabs = await globalThis.chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const tabId = tabs[0]?.id;

    if (!tabId) return "";

    const results = await globalThis.chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() || ""
    });

    return results?.[0]?.result?.trim() || "";
  }

  return window.getSelection()?.toString().trim() || "";
}
