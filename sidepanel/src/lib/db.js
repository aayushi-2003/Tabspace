const DEV_TAB_DATA = {
  url: "https://example.com/dev-preview",
  title: "Bookmark Notes Preview"
};

const hasChromeExtensionApis = () =>
  typeof globalThis.chrome !== "undefined" &&
  Boolean(globalThis.chrome.tabs?.query) &&
  Boolean(globalThis.chrome.storage?.local);

async function getActiveTab() {
  if (!hasChromeExtensionApis()) {
    return DEV_TAB_DATA;
  }

  const tabs = await globalThis.chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const tab = tabs[0];

  return {
    url: tab.url,
    title: tab.title
  };
}

function getDevStorageKey(url) {
  return `bookmark-notes:${url}`;
}

async function readWorkspaces(url) {
  if (hasChromeExtensionApis()) {
    const result = await globalThis.chrome.storage.local.get([url]);

    return result[url] || [];
  }

  const saved = localStorage.getItem(getDevStorageKey(url));

  return saved ? JSON.parse(saved) : [];
}

async function writeWorkspaces(url, workspaces) {
  if (hasChromeExtensionApis()) {
    await globalThis.chrome.storage.local.set({
      [url]: workspaces
    });

    return;
  }

  localStorage.setItem(
    getDevStorageKey(url),
    JSON.stringify(workspaces)
  );
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

export async function getCurrentTabData() {
  return getActiveTab();
}

export async function getWorkspaces(url) {
  return readWorkspaces(url);
}

export async function getAllWorkspaces() {
  if (hasChromeExtensionApis()) {
    const storageData = await globalThis.chrome.storage.local.get(null);

    return flattenWorkspaceStorage(storageData);
  }

  const storageData = Object.keys(localStorage).reduce((data, key) => {
    if (!key.startsWith("bookmark-notes:")) {
      return data;
    }

    const url = key.replace("bookmark-notes:", "");
    const saved = localStorage.getItem(key);

    return {
      ...data,
      [url]: saved ? JSON.parse(saved) : []
    };
  }, {});

  return flattenWorkspaceStorage(storageData);
}

function flattenWorkspaceStorage(storageData) {
  return Object.entries(storageData).flatMap(([pageUrl, workspaces]) => {
    if (!Array.isArray(workspaces)) {
      return [];
    }

    const domain = getDomainFromUrl(pageUrl);

    return workspaces.map((workspace) => ({
      ...workspace,
      pageUrl,
      domain
    }));
  });
}

function getStoredWorkspaceUpdates(updates) {
  const storedUpdates = { ...updates };

  delete storedUpdates.pageUrl;
  delete storedUpdates.domain;

  return storedUpdates;
}

export function groupWorkspacesByDomain(workspaces) {
  const groups = workspaces.reduce((domainGroups, workspace) => {
    const domain = workspace.domain || getDomainFromUrl(workspace.pageUrl);
    const existingGroup = domainGroups[domain] || {
      domain,
      workspaceCount: 0,
      todoCount: 0,
      workspaces: []
    };

    const todos = workspace.todos || [];

    return {
      ...domainGroups,
      [domain]: {
        ...existingGroup,
        workspaceCount: existingGroup.workspaceCount + 1,
        todoCount: existingGroup.todoCount + todos.length,
        workspaces: [...existingGroup.workspaces, workspace]
      }
    };
  }, {});

  return Object.values(groups).sort((a, b) =>
    a.domain.localeCompare(b.domain)
  );
}

export async function createWorkspace(url, pageTitle) {
  const workspaces = await getWorkspaces(url);

  const newWorkspace = {
    id: Date.now().toString(),

    title: "New Workspace",

    pageTitle,

    color: "#7c3aed",

    icon: "briefcase",

    note: "",

    todos: [],

    createdAt: new Date().toISOString()
  };

  workspaces.unshift(newWorkspace);

  await writeWorkspaces(url, workspaces);

  return newWorkspace;
}

export async function updateWorkspace(id, updates, pageUrl) {
  const { url } = pageUrl ? { url: pageUrl } : await getActiveTab();
  const storedUpdates = getStoredWorkspaceUpdates(updates);

  const workspaces = await getWorkspaces(url);

  const updated = workspaces.map((workspace) => {
    if (workspace.id === id) {
      return {
        ...workspace,
        ...storedUpdates
      };
    }

    return workspace;
  });

  await writeWorkspaces(url, updated);
}

export async function deleteWorkspace(id, pageUrl) {
  const { url } = pageUrl ? { url: pageUrl } : await getActiveTab();

  const workspaces = await getWorkspaces(url);

  const filtered = workspaces.filter(
    (workspace) => workspace.id !== id
  );

  await writeWorkspaces(url, filtered);
}
