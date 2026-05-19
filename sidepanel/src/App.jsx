import { useEffect, useMemo, useRef, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";
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
  deleteWorkspaceFromSupabase,
  syncWorkspaceToSupabase
} from "./lib/sync";

import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiSearch,
  FiGlobe,
  FiBriefcase,
  FiBookOpen,
  FiStar,
  FiZap,
  FiCode,
  FiHeart
} from "react-icons/fi";

import "./App.css";

const WORKSPACE_COLORS = [
  "#7c3aed",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899"
];

const WORKSPACE_ICONS = [
  { id: "briefcase", Icon: FiBriefcase },
  { id: "book", Icon: FiBookOpen },
  { id: "star", Icon: FiStar },
  { id: "zap", Icon: FiZap },
  { id: "code", Icon: FiCode },
  { id: "heart", Icon: FiHeart }
];

function WorkspaceIconGlyph({ iconId }) {
  switch (iconId) {
    case "book":
      return <FiBookOpen />;
    case "star":
      return <FiStar />;
    case "zap":
      return <FiZap />;
    case "code":
      return <FiCode />;
    case "heart":
      return <FiHeart />;
    default:
      return <FiBriefcase />;
  }
}

function getWorkspaceColorClass(color) {
  const colorIndex = WORKSPACE_COLORS.indexOf(color);

  return `workspace-color-${colorIndex >= 0 ? colorIndex : 0}`;
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

  const [session, setSession] = useState(null);

  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const saveTimersRef = useRef({});
  const pendingSaveIdsRef = useRef(new Set());

  const [newTodo, setNewTodo] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");

  const filteredWorkspaces = useMemo(() => {
    const query = workspaceSearch.trim().toLowerCase();

    if (!query) return workspaces;

    return workspaces.filter((workspace) => {
      const title = workspace.title || "";
      const note = workspace.note || "";
      const todos = workspace.todos || [];

      return (
        title.toLowerCase().includes(query) ||
        note.toLowerCase().includes(query) ||
        todos.some((todo) =>
          todo.text.toLowerCase().includes(query)
        )
      );
    });
  }, [workspaceSearch, workspaces]);

  const filteredAllWorkspaces = useMemo(() => {
    const query = workspaceSearch.trim().toLowerCase();

    if (!query) return allWorkspaces;

    return allWorkspaces.filter((workspace) => {
      const title = workspace.title || "";
      const note = workspace.note || "";
      const domain = workspace.domain || "";
      const pageUrl = workspace.pageUrl || "";
      const todos = workspace.todos || [];

      return (
        title.toLowerCase().includes(query) ||
        note.toLowerCase().includes(query) ||
        domain.toLowerCase().includes(query) ||
        pageUrl.toLowerCase().includes(query) ||
        todos.some((todo) =>
          todo.text.toLowerCase().includes(query)
        )
      );
    });
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
    setView("detail");
  };

  const goBackToWorkspaces = () => {
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

  const handleTodoKeyDown = (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
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
    if (!globalThis.chrome?.runtime?.onMessage) {
      return undefined;
    }

    const handleMessage = (message) => {
      if (message?.type === "bookmark-notes:storage-updated") {
        refreshSidepanelData();
      }
    };

    globalThis.chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      globalThis.chrome.runtime.onMessage.removeListener(handleMessage);
    };
  });

  if (loadError) {
    return <div className="loading">{loadError}</div>;
  }

  if (!tabData) {
    return <div className="loading">Loading...</div>;
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
              placeholder="Search workspaces..."
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
                          <p>
                            {workspace.todos?.length || 0} todos
                          </p>

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
                    </div>
                  );
                })}

              {workspaces.length > 0 &&
                filteredWorkspaces.length === 0 && (
                <p className="empty-text">
                  No matching workspaces
                </p>
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
                        {group.todoCount} todos
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="domain-workspaces">
                        {group.workspaces.map((workspace) => (
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
                              </div>
                            </div>

                            <span className="domain-workspace-count">
                              {workspace.todos?.length || 0} todos
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {allWorkspaces.length > 0 &&
                domainGroups.length === 0 && (
                <p className="empty-text">
                  No matching domains
                </p>
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
          </div>

          <div className="workspace-customize">
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

          <div className="notes-header">
            <h2>Notes</h2>

            <span className="save-status">
              {saveStatus}
            </span>
          </div>

          <textarea
            className="notes-area"
            value={selectedWorkspace.note}
            onChange={(e) =>
              handleUpdateWorkspace({
                note: e.target.value
              })
            }
            placeholder="Write your notes here..."
          />

          <div className="todo-header">
            <h2>Todos</h2>
          </div>

          <div className="todo-input-row">
            <input
              type="text"
              placeholder="Add a todo..."
              value={newTodo}
              onChange={(e) =>
                setNewTodo(e.target.value)
              }
              onKeyDown={handleTodoKeyDown}
              className="todo-input"
            />

            <button
              className="add-todo-btn"
              onClick={addTodo}
            >
              <FiPlus />
            </button>
          </div>

          <DragDropContext onDragEnd={reorderTodos}>
            <Droppable droppableId="todo-list">
              {(provided) => (
                <div
                  className="todo-list"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {!selectedWorkspace.todos?.length && (
                    <p className="empty-text">
                      No todos yet
                    </p>
                  )}

                  {selectedWorkspace.todos?.map(
                    (todo, index) => (
                      <Draggable
                        key={
                          todo.id ||
                          `${selectedWorkspace.id}-${index}`
                        }
                        draggableId={
                          todo.id ||
                          `${selectedWorkspace.id}-${index}`
                        }
                        index={index}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`todo-item ${
                              todo.done ? "todo-done" : ""
                            } ${
                              snapshot.isDragging
                                ? "todo-dragging"
                                : ""
                            }`}
                          >
                            <button
                              className="todo-check"
                              onClick={() =>
                                toggleTodo(index)
                              }
                            >
                              {todo.done && <FiCheck />}
                            </button>

                            <span>{todo.text}</span>

                            <button
                              className="todo-delete"
                              onClick={() =>
                                removeTodo(index)
                              }
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    )
                  )}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

        </div>
      )}
    </div>
  );
}

export default App;

