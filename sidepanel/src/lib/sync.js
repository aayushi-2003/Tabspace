import { getAllWorkspaces, getDomainFromUrl } from "./db";
import { supabase } from "./supabase";

function mapWorkspaceToSupabaseRow(workspace, userId) {
  const pageUrl = workspace.pageUrl;

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
    updated_at: new Date().toISOString()
  };
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
