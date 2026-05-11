document.getElementById("open").addEventListener("click", () => {
  chrome.sidePanel.open({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  });
});