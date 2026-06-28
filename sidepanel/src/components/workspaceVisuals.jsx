import {
  FiBookOpen,
  FiBriefcase,
  FiCode,
  FiHeart,
  FiStar,
  FiZap
} from "react-icons/fi";

export function WorkspaceIconGlyph({ iconId }) {
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
