import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentTabData,
  getWorkspaces,
  getAllWorkspaces,
  groupWorkspacesByDomain,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace
} from "./lib/db";
import {
  getCurrentSession,
  onAuthStateChange
} from "./lib/auth";
import {
  clearAiSettings,
  DEFAULT_AI_SETTINGS,
  getAiSettings,
  saveAiSettings
} from "./lib/aiSettings";
import {
  generateAiText,
  testAiConnection
} from "./lib/ai/aiClient";
import {
  buildExtractTodosPrompt,
  buildSuggestTagsPrompt,
  buildSummarizeSelectionPrompt,
  formatSummaryHtml
} from "./lib/ai/aiPrompts";
import {
  parseSuggestedTags,
  parseSuggestedTodos
} from "./lib/ai/aiParsers";
import {
  escapeHtml,
  getSelectedTextFromActiveTab,
  isSelectionInsideCodeSnippet
} from "./lib/htmlUtils";
import {
  getNotePreview,
  getPlainNoteText,
  getTodoProgress,
  getWorkspaceTags,
  matchesWorkspaceSearch,
  normalizeTag
} from "./lib/workspaceUtils";
import {
  deleteWorkspaceFromSupabase,
  syncBothWays,
  syncWorkspaceToSupabase
} from "./lib/sync";

import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiRefreshCw,
  FiGlobe,
  FiTag,
  FiCpu,
  FiSettings
} from "react-icons/fi";
import AiDrawer from "./components/AiDrawer";
import NotesEditor from "./components/NotesEditor";
import TagsDrawer from "./components/TagsDrawer";
import TodoList from "./components/TodoList";
import {
  WorkspaceIconGlyph
} from "./components/workspaceVisuals";
import {
  getWorkspaceColorClass,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS
} from "./lib/workspaceVisuals";

import "./App.css";

const LAST_SYNC_KEY = "tabspace:last-sync-at";

const AI_MODELS_BY_PROVIDER = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b"
  ],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"]
};

const AI_DEFAULT_MODEL_BY_PROVIDER = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash"
};

async function getLastSyncAt() {
  if (globalThis.chrome?.storage?.local) {
    const result = await globalThis.chrome.storage.local.get([
      LAST_SYNC_KEY
    ]);

    return result[LAST_SYNC_KEY] || "";
  }

  return localStorage.getItem(LAST_SYNC_KEY) || "";
}

async function setLastSyncAt(value) {
  if (globalThis.chrome?.storage?.local) {
    await globalThis.chrome.storage.local.set({
      [LAST_SYNC_KEY]: value
    });

    return;
  }

  localStorage.setItem(LAST_SYNC_KEY, value);
}

function formatLastSyncAt(value) {
  if (!value) return "Never synced";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function App() {
  const [tabData, setTabData] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [workspaces, setWorkspaces] = useState([]);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const [view, setView] = useState("list");
  const [workspaceMode, setWorkspaceMode] = useState("current");
  const [expandedDomains, setExpandedDomains] = useState({});
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);

  const [session, setSession] = useState(null);

  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const [syncStatus, setSyncStatus] = useState("");
  const [lastSyncAt, setLastSyncAtState] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const saveTimersRef = useRef({});
  const pendingSaveIdsRef = useRef(new Set());
  const notesEditorRef = useRef(null);

  const [newTodo, setNewTodo] = useState("");
  const [newTag, setNewTag] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [aiSettingsStatus, setAiSettingsStatus] = useState("");
  const [isTestingAiConnection, setIsTestingAiConnection] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTodos, setSuggestedTodos] = useState([]);
  const [isExtractingTodos, setIsExtractingTodos] = useState(false);
  const [selectionSummary, setSelectionSummary] = useState("");
  const [isSummarizingSelection, setIsSummarizingSelection] = useState(false);
  const currentPageUrl = tabData?.url || "";
  const isAiConfigured = Boolean(aiSettings.apiKey?.trim());
  const aiModels =
    AI_MODELS_BY_PROVIDER[aiSettings.provider] ||
    AI_MODELS_BY_PROVIDER.groq;

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((workspace) =>
      matchesWorkspaceSearch(
        {
          ...workspace,
          pageUrl: currentPageUrl
        },
        workspaceSearch
      )
    );
  }, [currentPageUrl, workspaceSearch, workspaces]);

  const filteredAllWorkspaces = useMemo(() => {
    return allWorkspaces.filter((workspace) =>
      matchesWorkspaceSearch(workspace, workspaceSearch)
    );
  }, [workspaceSearch, allWorkspaces]);

  const domainGroups = useMemo(
    () => groupWorkspacesByDomain(filteredAllWorkspaces),
    [filteredAllWorkspaces]
  );

  const refreshWorkspaces = async () => {
    const data = await getWorkspaces(tabData.url);

    setWorkspaces(data);

    if (selectedWorkspace) {
      const updated = data.find((w) => w.id === selectedWorkspace.id);

      if (updated) {
        setSelectedWorkspace({
          ...updated,
          pageUrl: tabData.url
        });
      }
    }
  };

  const refreshAllWorkspaces = async () => {
    const data = await getAllWorkspaces();

    setAllWorkspaces(data);
  };

  const refreshSidepanelData = async () => {
    const currentTab = await getCurrentTabData();
    const data = await getWorkspaces(currentTab.url);
    const allData = await getAllWorkspaces();

    setTabData(currentTab);
    setWorkspaces(data);
    setAllWorkspaces(allData);
    setExpandedDomains(
      groupWorkspacesByDomain(allData).reduce(
        (domains, group) => ({
          ...domains,
          [group.domain]:
            expandedDomains[group.domain] ?? true
        }),
        {}
      )
    );

    if (selectedWorkspace) {
      const workspacePageUrl =
        selectedWorkspace.pageUrl || currentTab.url;
      const refreshedWorkspace = allData.find(
        (workspace) =>
          workspace.id === selectedWorkspace.id &&
          workspace.pageUrl === workspacePageUrl
      );

      if (refreshedWorkspace) {
        setSelectedWorkspace(refreshedWorkspace);
      }
    } else if (data.length > 0) {
      setSelectedWorkspace({
        ...data[0],
        pageUrl: currentTab.url
      });
    }
  };

  const handleCreateWorkspace = async () => {
    const workspace = await createWorkspace(
      tabData.url,
      tabData.title
    );

    const updated = await getWorkspaces(tabData.url);

    setWorkspaces(updated);

    await refreshAllWorkspaces();

    const createdWorkspace = {
      ...workspace,
      pageUrl: tabData.url
    };

    setSelectedWorkspace(createdWorkspace);

    if (session) {
      await syncWorkspaceToSupabase(session, createdWorkspace);
    }

    setView("detail");
  };

  const handleUpdateWorkspace = async (updates) => {
    if (!selectedWorkspace) return;

    setSaveStatus("Saving locally...");

    const updated = {
      ...selectedWorkspace,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setSelectedWorkspace(updated);

    if ((updated.pageUrl || tabData.url) === tabData.url) {
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === updated.id ? updated : workspace
        )
      );
    }

    if (saveTimersRef.current[updated.id]) {
      clearTimeout(saveTimersRef.current[updated.id]);
    }

    pendingSaveIdsRef.current.add(updated.id);

    saveTimersRef.current[updated.id] = setTimeout(async () => {
      let localSaveSucceeded = false;

      try {
        await updateWorkspace(
          updated.id,
          updated,
          updated.pageUrl || tabData.url
        );

        localSaveSucceeded = true;

        if (session) {
          setSaveStatus("Syncing cloud...");
          await syncWorkspaceToSupabase(session, updated);
          setSaveStatus("Synced");
        } else {
          setSaveStatus("Saved locally");
        }

        await refreshWorkspaces();
        await refreshAllWorkspaces();
      } catch (error) {
        console.error(error);
        setSaveStatus(
          localSaveSucceeded
            ? "Saved locally - cloud sync failed"
            : "Save failed"
        );
      } finally {
        delete saveTimersRef.current[updated.id];
        pendingSaveIdsRef.current.delete(updated.id);
      }
    }, 650);
  };

  const handleDeleteWorkspace = async (workspaceToDelete = selectedWorkspace) => {
    if (!workspaceToDelete) return;

    const confirmDelete = confirm(
      `Delete "${workspaceToDelete.title}" workspace?`
    );

    if (!confirmDelete) return;

    if (saveTimersRef.current[workspaceToDelete.id]) {
      clearTimeout(saveTimersRef.current[workspaceToDelete.id]);
      delete saveTimersRef.current[workspaceToDelete.id];
      pendingSaveIdsRef.current.delete(workspaceToDelete.id);

      if (pendingSaveIdsRef.current.size === 0) {
        setSaveStatus(session ? "Synced" : "Saved locally");
      }
    }

    await deleteWorkspace(
      workspaceToDelete.id,
      workspaceToDelete.pageUrl || tabData.url
    );

    if (session) {
      await deleteWorkspaceFromSupabase(session, workspaceToDelete);
    }

    const updated =
      (workspaceToDelete.pageUrl || tabData.url) === tabData.url
        ? workspaces.filter(
            (w) => w.id !== workspaceToDelete.id
          )
        : workspaces;

    setWorkspaces(updated);
    await refreshAllWorkspaces();

    if (selectedWorkspace?.id !== workspaceToDelete.id) {
      return;
    }

    setSelectedWorkspace(null);
    setView("list");
  };

  const openWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    setSaveStatus(session ? "Synced" : "Saved locally");
    setIsCustomizeOpen(false);
    setIsTagsOpen(false);
    setIsAiSettingsOpen(false);
    setIsAiConfigOpen(false);
    setSuggestedTags([]);
    setSuggestedTodos([]);
    setSelectionSummary("");
    setView("detail");
  };

  const goBackToWorkspaces = () => {
    setIsCustomizeOpen(false);
    setIsTagsOpen(false);
    setIsAiSettingsOpen(false);
    setIsAiConfigOpen(false);
    setSuggestedTags([]);
    setSuggestedTodos([]);
    setSelectionSummary("");
    setView("list");
  };

  const toggleDomain = (domain) => {
    setExpandedDomains((current) => ({
      ...current,
      [domain]: !current[domain]
    }));
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    const todos = [
      ...(selectedWorkspace.todos || []),
      {
        id: crypto.randomUUID(),
        text: newTodo.trim(),
        done: false
      }
    ];

    await handleUpdateWorkspace({ todos });

    setNewTodo("");
  };

  const toggleTodo = async (index) => {
    const todos = selectedWorkspace.todos.map((todo, todoIndex) =>
      todoIndex === index
        ? {
            ...todo,
            done: !todo.done
          }
        : todo
    );

    await handleUpdateWorkspace({ todos });
  };

  const removeTodo = async (index) => {
    const todos = selectedWorkspace.todos.filter(
      (_, i) => i !== index
    );

    await handleUpdateWorkspace({ todos });
  };

  const updateTodoText = async (index, text) => {
    const todos = selectedWorkspace.todos.map((todo, todoIndex) =>
      todoIndex === index
        ? {
            ...todo,
            text
          }
        : todo
    );

    await handleUpdateWorkspace({ todos });
  };

  const normalizeTodoText = async (index, text) => {
    const normalizedText = text.trim() || "Untitled todo";

    if (normalizedText !== text) {
      await updateTodoText(index, normalizedText);
    }
  };

  const reorderTodos = async (result) => {
    if (!result.destination || !selectedWorkspace) return;

    const todos = [...(selectedWorkspace.todos || [])];
    const [movedTodo] = todos.splice(result.source.index, 1);

    todos.splice(result.destination.index, 0, movedTodo);

    await handleUpdateWorkspace({ todos });
  };

  const updateWorkspaceColor = async (color) => {
    await handleUpdateWorkspace({ color });
  };

  const updateWorkspaceIcon = async (icon) => {
    await handleUpdateWorkspace({ icon });
  };

  const addWorkspaceTag = async () => {
    const tag = normalizeTag(newTag);

    if (!tag || !selectedWorkspace) return;

    const tags = getWorkspaceTags(selectedWorkspace);

    if (tags.includes(tag)) {
      setNewTag("");
      return;
    }

    await handleUpdateWorkspace({
      tags: [...tags, tag]
    });

    setNewTag("");
  };

  const removeWorkspaceTag = async (tagToRemove) => {
    const tags = getWorkspaceTags(selectedWorkspace).filter(
      (tag) => tag !== tagToRemove
    );

    await handleUpdateWorkspace({ tags });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addWorkspaceTag();
    }
  };

  const handleSidepanelSync = async () => {
    if (!session) {
      setSyncStatus("Sign in from the popup to sync");
      return;
    }

    setIsSyncing(true);
    setSyncStatus("Syncing...");

    try {
      const result = await syncBothWays(session);
      const syncedAt = new Date().toISOString();

      await setLastSyncAt(syncedAt);
      setLastSyncAtState(syncedAt);
      await refreshSidepanelData();

      setSyncStatus(
        `Synced ${result.uploaded} up, ${result.restored} down${
          result.conflicts
            ? `, ${result.conflicts} conflict resolved`
            : ""
        }`
      );
      setSaveStatus("Synced");
    } catch (error) {
      console.error(error);
      setSyncStatus(error.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAiSettingsChange = (field, value) => {
    setAiSettings((current) => ({
      ...current,
      [field]: value,
      ...(field === "provider"
        ? {
            model:
              AI_DEFAULT_MODEL_BY_PROVIDER[value] ||
              AI_DEFAULT_MODEL_BY_PROVIDER.groq
          }
        : {})
    }));
    setAiSettingsStatus("");
  };

  const handleSaveAiSettings = async () => {
    const savedSettings = await saveAiSettings({
      ...aiSettings,
      apiKey: aiSettings.apiKey.trim()
    });

    setAiSettings(savedSettings);
    setAiSettingsStatus("AI settings saved");
  };

  const handleClearAiSettings = async () => {
    const clearedSettings = await clearAiSettings();

    setAiSettings(clearedSettings);
    setAiSettingsStatus("AI settings cleared");
  };

  const handleTestAiConnection = async () => {
    setIsTestingAiConnection(true);
    setAiSettingsStatus("Testing AI connection...");

    try {
      const savedSettings = await saveAiSettings({
        ...aiSettings,
        apiKey: aiSettings.apiKey.trim()
      });

      setAiSettings(savedSettings);

      const isConnected = await testAiConnection(savedSettings);

      setAiSettingsStatus(
        isConnected
          ? "Connected"
          : "Provider responded, but the test response was unexpected"
      );
    } catch (error) {
      console.error(error);
      setAiSettingsStatus(error.message || "AI connection failed");
    } finally {
      setIsTestingAiConnection(false);
    }
  };

  const handleSuggestTags = async () => {
    if (!selectedWorkspace) return;

    setIsSuggestingTags(true);
    setAiSettingsStatus("Suggesting tags...");

    try {
      const savedSettings = await saveAiSettings({
        ...aiSettings,
        apiKey: aiSettings.apiKey.trim()
      });
      const existingTags = getWorkspaceTags(selectedWorkspace);
      const response = await generateAiText({
        settings: savedSettings,
        prompt: buildSuggestTagsPrompt(selectedWorkspace),
        generationConfig: {
          maxOutputTokens: 512,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0
          },
          temperature: 0.25
        }
      });

      const tags = parseSuggestedTags(response)
        .map((tag) => normalizeTag(String(tag)))
        .filter(Boolean)
        .filter((tag) => !existingTags.includes(tag))
        .filter((tag, index, tagList) => tagList.indexOf(tag) === index)
        .slice(0, 6);

      setAiSettings(savedSettings);
      setSuggestedTags(tags);
      setAiSettingsStatus(
        tags.length
          ? "Review suggested tags"
          : "No new tag suggestions"
      );
    } catch (error) {
      console.error(error);
      setAiSettingsStatus(error.message || "Unable to suggest tags");
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const acceptSuggestedTag = async (tag) => {
    if (!selectedWorkspace) return;

    const existingTags = getWorkspaceTags(selectedWorkspace);

    if (!existingTags.includes(tag)) {
      await handleUpdateWorkspace({
        tags: [...existingTags, tag]
      });
    }

    setSuggestedTags((tags) =>
      tags.filter((suggestedTag) => suggestedTag !== tag)
    );
  };

  const handleExtractTodos = async () => {
    if (!selectedWorkspace) return;

    const noteText = getPlainNoteText(selectedWorkspace.note || "");

    if (!noteText.trim()) {
      setAiSettingsStatus("Add notes before extracting todos");
      return;
    }

    setIsExtractingTodos(true);
    setAiSettingsStatus("Extracting todos...");

    try {
      const savedSettings = await saveAiSettings({
        ...aiSettings,
        apiKey: aiSettings.apiKey.trim()
      });
      const existingTodoTexts = (selectedWorkspace.todos || []).map((todo) =>
        todo.text.trim().toLowerCase()
      );
      const response = await generateAiText({
        settings: savedSettings,
        prompt: buildExtractTodosPrompt(selectedWorkspace),
        generationConfig: {
          maxOutputTokens: 512,
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      const todos = parseSuggestedTodos(response)
        .filter(
          (todo) => !existingTodoTexts.includes(todo.trim().toLowerCase())
        )
        .filter((todo, index, todoList) => todoList.indexOf(todo) === index)
        .slice(0, 8);

      setAiSettings(savedSettings);
      setSuggestedTodos(todos);
      setAiSettingsStatus(
        todos.length
          ? "Review extracted todos"
          : "No new todos found"
      );
    } catch (error) {
      console.error(error);
      setAiSettingsStatus(error.message || "Unable to extract todos");
    } finally {
      setIsExtractingTodos(false);
    }
  };

  const acceptSuggestedTodo = async (todoText) => {
    if (!selectedWorkspace) return;

    const todos = [
      ...(selectedWorkspace.todos || []),
      {
        id: crypto.randomUUID(),
        text: todoText,
        done: false
      }
    ];

    await handleUpdateWorkspace({ todos });

    setSuggestedTodos((todos) =>
      todos.filter((suggestedTodo) => suggestedTodo !== todoText)
    );
  };

  const handleSummarizeSelection = async () => {
    setIsSummarizingSelection(true);
    setSelectionSummary("");
    setAiSettingsStatus("Reading selected text...");

    try {
      const selectedText = await getSelectedTextFromActiveTab();

      if (!selectedText) {
        setAiSettingsStatus("Select text on the page first");
        return;
      }

      setAiSettingsStatus("Summarizing selection...");

      const savedSettings = await saveAiSettings({
        ...aiSettings,
        apiKey: aiSettings.apiKey.trim()
      });
      const summary = await generateAiText({
        settings: savedSettings,
        prompt: buildSummarizeSelectionPrompt(selectedText),
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.2
        }
      });

      setAiSettings(savedSettings);
      setSelectionSummary(summary.trim());
      setAiSettingsStatus("Review selection summary");
    } catch (error) {
      console.error(error);
      setAiSettingsStatus(error.message || "Unable to summarize selection");
    } finally {
      setIsSummarizingSelection(false);
    }
  };

  const insertSelectionSummary = async () => {
    if (!selectedWorkspace || !selectionSummary) return;

    const note = selectedWorkspace.note || "";
    const spacer = note.trim() ? "<p><br></p>" : "";

    await handleUpdateWorkspace({
      note: `${note}${spacer}${formatSummaryHtml(selectionSummary)}`
    });

    setSelectionSummary("");
    setAiSettingsStatus("Summary inserted into notes");
  };

  const handleTodoKeyDown = (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  const saveNoteFromEditor = () => {
    if (!notesEditorRef.current) return;

    handleUpdateWorkspace({
      note: notesEditorRef.current.innerHTML
    });
  };

  const cleanEmptyNote = () => {
    if (!notesEditorRef.current) return;

    if (!notesEditorRef.current.textContent.trim()) {
      notesEditorRef.current.innerHTML = "";
      saveNoteFromEditor();
    }
  };

  const handleNotesPaste = (e) => {
    e.preventDefault();

    const text = e.clipboardData.getData("text/plain");

    document.execCommand("insertText", false, text);
    saveNoteFromEditor();
  };

  const applyRichTextCommand = (command) => {
    if (!notesEditorRef.current) return;

    notesEditorRef.current.focus();
    document.execCommand(command, false, null);
    saveNoteFromEditor();
  };

  const insertCodeSnippet = () => {
    if (!notesEditorRef.current) return;

    notesEditorRef.current.focus();

    const selection = document.getSelection();

    if (isSelectionInsideCodeSnippet(notesEditorRef.current, selection)) {
      return;
    }

    const selectedText = selection?.toString().trim() || "code snippet";
    const codeBlock = `<pre><code>${escapeHtml(selectedText)}</code></pre><p><br></p>`;

    document.execCommand("insertHTML", false, codeBlock);
    saveNoteFromEditor();
  };

  useEffect(() => {
    let isMounted = true;
    const saveTimers = saveTimersRef.current;

    getCurrentTabData()
      .then(async (currentTab) => {
        const data = await getWorkspaces(currentTab.url);

        if (!isMounted) return;

        setTabData(currentTab);
        setWorkspaces(data);

        const allData = await getAllWorkspaces();

        if (!isMounted) return;

        setAllWorkspaces(allData);
        setExpandedDomains(
          groupWorkspacesByDomain(allData).reduce(
            (domains, group) => ({
              ...domains,
              [group.domain]: true
            }),
            {}
          )
        );

        if (data.length > 0) {
          setSelectedWorkspace({
            ...data[0],
            pageUrl: currentTab.url
          });
        }
      })
      .catch((error) => {
        if (!isMounted) return;

        setLoadError(error.message || "Unable to load sidepanel");
      });

    return () => {
      isMounted = false;

      Object.values(saveTimers).forEach((timer) =>
        clearTimeout(timer)
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
      })
      .catch((error) => {
        console.error(error);
      });

    const subscription = onAuthStateChange((currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getAiSettings()
      .then((settings) => {
        if (!isMounted) return;

        setAiSettings(settings);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getLastSyncAt()
      .then((value) => {
        if (!isMounted) return;

        setLastSyncAtState(value);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!globalThis.chrome?.runtime?.onMessage) {
      return undefined;
    }

    const handleMessage = (message) => {
      if (message?.type === "tabspace:storage-updated") {
        refreshSidepanelData();
      }
    };

    globalThis.chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      globalThis.chrome.runtime.onMessage.removeListener(handleMessage);
    };
  });

  useEffect(() => {
    const editor = notesEditorRef.current;

    if (!editor || !selectedWorkspace) {
      return;
    }

    const isEditingCurrentWorkspace =
      document.activeElement === editor &&
      editor.dataset.workspaceId === selectedWorkspace.id;

    if (isEditingCurrentWorkspace) {
      return;
    }

    editor.innerHTML = selectedWorkspace.note || "";
    editor.style.textAlign = "left";
    editor.dataset.workspaceId = selectedWorkspace.id;
  }, [selectedWorkspace]);

  if (loadError) {
    return (
      <div className="loading-state">
        <div className="loading-card">
          <h2>Tabspace could not load</h2>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!tabData) {
    return (
      <div className="loading-state">
        <div className="loading-card">
          <span className="loading-spinner" />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === "list" && (
        <div className="workspace-list-page">
          <div className="page-card">
            <div className="page-title-row">
              <h1>{tabData.title}</h1>

              <span className="workspace-count">
                {workspaces.length}{" "}
                {workspaces.length === 1
                  ? "workspace"
                  : "workspaces"}
              </span>
            </div>

            <p>{tabData.url}</p>

            <div className="page-sync-row">
              <span className="sync-summary">
                {syncStatus ||
                  (session
                    ? `Last sync: ${formatLastSyncAt(lastSyncAt)}`
                    : "Sign in from the popup to sync")}
              </span>

              <button
                className="sidepanel-sync-btn"
                onClick={handleSidepanelSync}
                disabled={isSyncing}
              >
                <FiRefreshCw
                  className={isSyncing ? "sync-spinning" : ""}
                />
                Sync
              </button>
            </div>
          </div>

          <div className="workspace-header">
            <div className="workspace-title-row">
              <h2>
                {workspaceMode === "current"
                  ? "Workspaces"
                  : "Domain Groups"}
              </h2>
            </div>

            <button
              className="new-btn"
              onClick={handleCreateWorkspace}
            >
              <FiPlus />
              New
            </button>
          </div>

          <div className="workspace-mode-tabs">
            <button
              className={`mode-tab ${
                workspaceMode === "current" ? "active-mode" : ""
              }`}
              onClick={() => setWorkspaceMode("current")}
            >
              Current Page
            </button>

            <button
              className={`mode-tab ${
                workspaceMode === "domains" ? "active-mode" : ""
              }`}
              onClick={() => setWorkspaceMode("domains")}
            >
              Domains
            </button>
          </div>

          <div className="search-row">
            <FiSearch className="search-icon" />
            <input
              type="search"
              value={workspaceSearch}
              onChange={(e) =>
                setWorkspaceSearch(e.target.value)
              }
              placeholder="Search title, notes, todos, tags..."
              className="workspace-search"
            />
          </div>

          {workspaceMode === "current" && (
            <div className="workspace-list">
              {workspaces.length === 0 && (
              <div className="workspace-empty-state">
                <h3>No workspaces yet</h3>
                <p>
                  Create a workspace to start collecting notes and todos for this page.
                </p>

                <button
                  className="empty-state-btn"
                  onClick={handleCreateWorkspace}
                >
                  <FiPlus />
                  New Workspace
                </button>
              </div>
              )}

              {workspaces.length > 0 &&
                filteredWorkspaces.map((workspace) => {
                  const workspaceWithUrl = {
                    ...workspace,
                    pageUrl: tabData.url
                  };
                  const notePreview = getNotePreview(workspace.note);
                  const todoProgress = getTodoProgress(workspace.todos);
                  const tags = getWorkspaceTags(workspace);

                  return (
                    <div
                      key={workspace.id}
                      className={`workspace-card ${getWorkspaceColorClass(
                        workspace.color
                      )} ${
                        selectedWorkspace?.id === workspace.id
                          ? "active-workspace"
                          : ""
                      }`}
                      onClick={() => openWorkspace(workspaceWithUrl)}
                    >
                      <div className="workspace-card-title">
                        <div className="workspace-card-name-icon">
                          <span className="workspace-card-icon">
                            <WorkspaceIconGlyph
                              iconId={workspace.icon}
                            />
                          </span>

                          <h3>{workspace.title}</h3>
                        </div>

                        <div className="workspace-card-actions">
                          <p>{todoProgress.label}</p>

                          <button
                            className="workspace-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(workspaceWithUrl);
                            }}
                            aria-label={`Delete ${workspace.title} workspace`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>

                      {notePreview && (
                        <p className="workspace-note-preview">
                          {notePreview}
                        </p>
                      )}

                      {tags.length > 0 && (
                        <div className="workspace-tag-row">
                          {tags.slice(0, 3).map((tag) => (
                            <span className="workspace-tag" key={tag}>
                              #{tag}
                            </span>
                          ))}

                          {tags.length > 3 && (
                            <span className="workspace-tag muted-tag">
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {workspaces.length > 0 &&
                filteredWorkspaces.length === 0 && (
                <div className="compact-empty-state">
                  <h3>No matching workspaces</h3>
                  <p>
                    Try a title, todo, note phrase, URL, or tag.
                  </p>
                </div>
              )}
            </div>
          )}

          {workspaceMode === "domains" && (
            <div className="domain-list">
              {allWorkspaces.length === 0 && (
                <div className="workspace-empty-state">
                  <h3>No domain groups yet</h3>
                  <p>
                    Create workspaces on pages to see them grouped by domain.
                  </p>
                </div>
              )}

              {domainGroups.map((group) => {
                const isExpanded =
                  expandedDomains[group.domain] ?? true;

                return (
                  <div
                    className="domain-group"
                    key={group.domain}
                  >
                    <button
                      className="domain-group-header"
                      onClick={() => toggleDomain(group.domain)}
                    >
                      <span className="domain-title">
                        {isExpanded ? (
                          <FiChevronDown />
                        ) : (
                          <FiChevronRight />
                        )}
                        <FiGlobe />
                        {group.domain}
                      </span>

                      <span className="domain-stats">
                        {group.workspaceCount}{" "}
                        {group.workspaceCount === 1
                          ? "workspace"
                          : "workspaces"}
                        {" - "}
                        {group.doneTodoCount}/{group.todoCount} done
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="domain-workspaces">
                        {group.workspaces.map((workspace) => {
                          const notePreview = getNotePreview(
                            workspace.note
                          );
                          const todoProgress = getTodoProgress(
                            workspace.todos
                          );
                          const tags = getWorkspaceTags(workspace);

                          return (
                            <div
                              key={`${workspace.pageUrl}-${workspace.id}`}
                              className={`domain-workspace-card ${getWorkspaceColorClass(
                                workspace.color
                              )}`}
                              onClick={() => openWorkspace(workspace)}
                            >
                              <div className="workspace-card-name-icon">
                                <span className="workspace-card-icon">
                                  <WorkspaceIconGlyph
                                    iconId={workspace.icon}
                                  />
                                </span>

                                <div className="domain-workspace-text">
                                  <h3>{workspace.title}</h3>
                                  <p>{workspace.pageUrl}</p>
                                  {notePreview && (
                                    <p className="domain-note-preview">
                                      {notePreview}
                                    </p>
                                  )}
                                  {tags.length > 0 && (
                                    <div className="workspace-tag-row">
                                      {tags.slice(0, 2).map((tag) => (
                                        <span
                                          className="workspace-tag"
                                          key={tag}
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className="domain-workspace-count">
                                {todoProgress.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {allWorkspaces.length > 0 &&
                domainGroups.length === 0 && (
                <div className="compact-empty-state">
                  <h3>No matching domains</h3>
                  <p>
                    Search can match domains, URLs, titles, notes, todos, or tags.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "detail" && selectedWorkspace && (
        <div className="workspace-detail-page">
          <div className="detail-header">
            <button
              className="back-btn"
              onClick={goBackToWorkspaces}
            >
              <FiArrowLeft />
              Workspaces
            </button>

            <button
              className="detail-delete-btn"
              onClick={() =>
                handleDeleteWorkspace(selectedWorkspace)
              }
              aria-label={`Delete ${selectedWorkspace.title} workspace`}
            >
              <FiTrash2 />
            </button>
          </div>

          <div
            className={`detail-title-card ${getWorkspaceColorClass(
              selectedWorkspace.color
            )}`}
          >
            <span className="detail-title-icon">
              <WorkspaceIconGlyph
                iconId={selectedWorkspace.icon}
              />
            </span>

            <input
              className="workspace-input"
              value={selectedWorkspace.title}
              onChange={(e) =>
                handleUpdateWorkspace({
                  title: e.target.value
                })
              }
              placeholder="Workspace title"
            />

            <button
              className={`title-tool-btn ${
                isTagsOpen ? "active-title-tool" : ""
              }`}
              onClick={() => {
                setIsTagsOpen((isOpen) => !isOpen);
                setIsCustomizeOpen(false);
                setIsAiSettingsOpen(false);
              }}
              title="Workspace tags"
              aria-label="Workspace tags"
            >
              <FiTag />

              {getWorkspaceTags(selectedWorkspace).length > 0 && (
                <span className="title-tool-count">
                  {getWorkspaceTags(selectedWorkspace).length}
                </span>
              )}
            </button>

            <button
              className={`title-tool-btn ${
                isAiSettingsOpen ? "active-title-tool" : ""
              }`}
              onClick={() => {
                setIsAiSettingsOpen((isOpen) => !isOpen);
                setIsTagsOpen(false);
                setIsCustomizeOpen(false);
              }}
              title="AI settings"
              aria-label="AI settings"
            >
              <FiCpu />

              {isAiConfigured && (
                <span className="title-tool-dot" />
              )}
            </button>

            <button
              className={`title-tool-btn ${
                isCustomizeOpen ? "active-title-tool" : ""
              }`}
              onClick={() => {
                setIsCustomizeOpen((isOpen) => !isOpen);
                setIsTagsOpen(false);
                setIsAiSettingsOpen(false);
              }}
              title="Customize workspace"
              aria-label="Customize workspace"
            >
              <FiSettings />
            </button>
          </div>

          {isCustomizeOpen && (
          <div className="workspace-customize-panel">
            <div className="color-options">
              {WORKSPACE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-option ${
                    getWorkspaceColorClass(color)
                  } ${
                    (selectedWorkspace.color ||
                      WORKSPACE_COLORS[0]) === color
                      ? "selected-option"
                      : ""
                  }`}
                  onClick={() => updateWorkspaceColor(color)}
                  aria-label={`Use ${color} workspace color`}
                />
              ))}
            </div>

            <div className="icon-options">
              {WORKSPACE_ICONS.map(({ id, Icon }) => (
                <button
                  key={id}
                  className={`icon-option ${
                    (selectedWorkspace.icon ||
                      WORKSPACE_ICONS[0].id) === id
                      ? "selected-option"
                      : ""
                  }`}
                  onClick={() => updateWorkspaceIcon(id)}
                  aria-label={`Use ${id} workspace icon`}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </div>
          )}

          {isAiSettingsOpen && (
          <AiDrawer
            aiModels={aiModels}
            aiSettings={aiSettings}
            aiSettingsStatus={aiSettingsStatus}
            isAiConfigOpen={isAiConfigOpen}
            isAiConfigured={isAiConfigured}
            isExtractingTodos={isExtractingTodos}
            isSuggestingTags={isSuggestingTags}
            isSummarizingSelection={isSummarizingSelection}
            isTestingAiConnection={isTestingAiConnection}
            onAcceptSuggestedTag={acceptSuggestedTag}
            onAcceptSuggestedTodo={acceptSuggestedTodo}
            onAiSettingsChange={handleAiSettingsChange}
            onClearAiSettings={handleClearAiSettings}
            onDismissSelectionSummary={() => setSelectionSummary("")}
            onExtractTodos={handleExtractTodos}
            onInsertSelectionSummary={insertSelectionSummary}
            onSaveAiSettings={handleSaveAiSettings}
            onSuggestTags={handleSuggestTags}
            onSummarizeSelection={handleSummarizeSelection}
            onTestAiConnection={handleTestAiConnection}
            onToggleConfig={() =>
              setIsAiConfigOpen((isOpen) => !isOpen)
            }
            selectionSummary={selectionSummary}
            suggestedTags={suggestedTags}
            suggestedTodos={suggestedTodos}
          />
          )}

          {isTagsOpen && (
          <TagsDrawer
            newTag={newTag}
            onAddTag={addWorkspaceTag}
            onNewTagChange={setNewTag}
            onRemoveTag={removeWorkspaceTag}
            onTagKeyDown={handleTagKeyDown}
            workspace={selectedWorkspace}
          />
          )}

          <NotesEditor
            notesEditorRef={notesEditorRef}
            onApplyRichTextCommand={applyRichTextCommand}
            onCleanEmptyNote={cleanEmptyNote}
            onInsertCodeSnippet={insertCodeSnippet}
            onNotesInput={saveNoteFromEditor}
            onNotesPaste={handleNotesPaste}
            saveStatus={saveStatus}
          />

          <TodoList
            newTodo={newTodo}
            onAddTodo={addTodo}
            onNewTodoChange={setNewTodo}
            onRemoveTodo={removeTodo}
            onReorderTodos={reorderTodos}
            onTodoInputKeyDown={handleTodoKeyDown}
            onTodoTextBlur={normalizeTodoText}
            onTodoTextChange={updateTodoText}
            onToggleTodo={toggleTodo}
            selectedWorkspace={selectedWorkspace}
          />

        </div>
      )}
    </div>
  );
}

export default App;
