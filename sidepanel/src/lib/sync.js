import {
  getAllWorkspaces,
  getDomainFromUrl,
  getWorkspaces,
  setWorkspaces
} from "./db";
import { supabase } from "./supabase";

function mapWorkspaceToSupabaseRow(workspace, userId) {
  const pageUrl = workspace.pageUrl;
  const updatedAt = workspace.updatedAt || new Date().toISOString();

  return {
    local_id: workspace.id,
    user_id: userId,
    page_url: pageUrl,
    domain: workspace.domain || getDomainFromUrl(pageUrl),
    title: workspace.title || "New Workspace",
    note: workspace.note || "",
    todos: workspace.todos || [],
    color: workspace.color || "#7c3aed",
    icon: workspace.icon || "briefcase",
    created_at: workspace.createdAt || new Date().toISOString(),
    updated_at: updatedAt
  };
}

export async function syncWorkspaceToSupabase(session, workspace) {
  if (!session?.user?.id || !workspace?.pageUrl) {
    return;
  }

  const { error } = await supabase
    .from("workspaces")
    .upsert(mapWorkspaceToSupabaseRow(workspace, session.user.id), {
      onConflict: "user_id,local_id"
    });

  if (error) {
    throw error;
  }
}

export async function deleteWorkspaceFromSupabase(session, workspace) {
  if (!session?.user?.id || !workspace?.id) {
    return;
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("user_id", session.user.id)
    .eq("local_id", workspace.id);

  if (error) {
    throw error;
  }
}

export async function syncLocalWorkspacesToSupabase(session) {
  if (!session?.user?.id) {
    throw new Error("Sign in before syncing.");
  }

  const localWorkspaces = await getAllWorkspaces();

  if (localWorkspaces.length === 0) {
    return {
      count: 0
    };
  }

  const rows = localWorkspaces.map((workspace) =>
    mapWorkspaceToSupabaseRow(workspace, session.user.id)
  );

  const { error } = await supabase
    .from("workspaces")
    .upsert(rows, {
      onConflict: "user_id,local_id"
    });

  if (error) {
    throw error;
  }

  return {
    count: rows.length
  };
}

function mapSupabaseRowToLocalWorkspace(row) {
  return {
    id: row.local_id || row.id,
    title: row.title || "New Workspace",
    pageTitle: row.page_title || "",
    note: row.note || "",
    todos: row.todos || [],
    color: row.color || "#7c3aed",
    icon: row.icon || "briefcase",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

function getWorkspaceTimestamp(workspace) {
  return new Date(
    workspace.updatedAt ||
      workspace.updated_at ||
      workspace.createdAt ||
      workspace.created_at ||
      0
  ).getTime();
}

function mergeWorkspaceLists(localWorkspaces, cloudWorkspaces) {
  const mergedById = new Map();

  localWorkspaces.forEach((workspace) => {
    mergedById.set(workspace.id, workspace);
  });

  cloudWorkspaces.forEach((workspace) => {
    const existingWorkspace = mergedById.get(workspace.id);

    if (
      !existingWorkspace ||
      getWorkspaceTimestamp(workspace) >=
        getWorkspaceTimestamp(existingWorkspace)
    ) {
      mergedById.set(workspace.id, workspace);
    }
  });

  return Array.from(mergedById.values()).sort(
    (a, b) => getWorkspaceTimestamp(b) - getWorkspaceTimestamp(a)
  );
}

function groupRowsByPageUrl(rows) {
  return rows.reduce((groups, row) => {
    const pageUrl = row.page_url;

    return {
      ...groups,
      [pageUrl]: [
        ...(groups[pageUrl] || []),
        mapSupabaseRowToLocalWorkspace(row)
      ]
    };
  }, {});
}

export async function restoreSupabaseWorkspacesToLocal(session) {
  if (!session?.user?.id) {
    throw new Error("Sign in before restoring.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", session.user.id);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return {
      count: 0
    };
  }

  const workspacesByPageUrl = groupRowsByPageUrl(data);

  await Promise.all(
    Object.entries(workspacesByPageUrl).map(
      async ([pageUrl, cloudWorkspaces]) => {
        const localWorkspaces = await getWorkspaces(pageUrl);
        const mergedWorkspaces = mergeWorkspaceLists(
          localWorkspaces,
          cloudWorkspaces
        );

        await setWorkspaces(pageUrl, mergedWorkspaces);
      }
    )
  );

  return {
    count: data.length
  };
}

export async function syncBothWays(session) {
  const restoreResult = await restoreSupabaseWorkspacesToLocal(session);
  const uploadResult = await syncLocalWorkspacesToSupabase(session);

  return {
    uploaded: uploadResult.count,
    restored: restoreResult.count
  };
}
