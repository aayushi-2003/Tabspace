import {
  FiBookOpen,
  FiBriefcase,
  FiCode,
  FiHeart,
  FiStar,
  FiZap
} from "react-icons/fi";

export const WORKSPACE_COLORS = [
  "#7c3aed",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899"
];

export const WORKSPACE_ICONS = [
  { id: "briefcase", Icon: FiBriefcase },
  { id: "book", Icon: FiBookOpen },
  { id: "star", Icon: FiStar },
  { id: "zap", Icon: FiZap },
  { id: "code", Icon: FiCode },
  { id: "heart", Icon: FiHeart }
];

export function getWorkspaceColorClass(color) {
  const colorIndex = WORKSPACE_COLORS.indexOf(color);

  return `workspace-color-${colorIndex >= 0 ? colorIndex : 0}`;
}
