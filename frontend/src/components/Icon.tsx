import type { CSSProperties } from "react";

export type IconName =
  | "dashboard"
  | "play"
  | "mic"
  | "chart"
  | "history"
  | "search"
  | "users"
  | "settings"
  | "plus"
  | "arrow-right"
  | "sparkle"
  | "filter"
  | "check"
  | "pause"
  | "stop"
  | "x"
  | "tag"
  | "code"
  | "doc"
  | "headphones"
  | "logout"
  | "kanban"
  | "upload"
  | "trash"
  | "refresh"
  | "edit"
  | "sun"
  | "moon";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({ name, size = 16, className = "", style }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "play":
      return (
        <svg {...props}>
          <polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none" />
        </svg>
      );
    case "mic":
      return (
        <svg {...props}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      );
    case "history":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="3" />
          <path d="M22 19a5 5 0 0 0-7-4.6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...props}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "filter":
      return (
        <svg {...props}>
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M5 13l4 4 10-10" />
        </svg>
      );
    case "pause":
      return (
        <svg {...props}>
          <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
          <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
        </svg>
      );
    case "stop":
      return (
        <svg {...props}>
          <rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "tag":
      return (
        <svg {...props}>
          <path d="M2 12V4a2 2 0 0 1 2-2h8l10 10-10 10z" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case "code":
      return (
        <svg {...props}>
          <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />
        </svg>
      );
    case "doc":
      return (
        <svg {...props}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M9 13h6M9 17h6" />
        </svg>
      );
    case "headphones":
      return (
        <svg {...props}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z" fill="currentColor" />
        </svg>
      );
    case "logout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    case "kanban":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18" />
        </svg>
      );
    case "upload":
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5M12 3v12" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
          <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    default:
      return null;
  }
}

export function ZebraLogo({
  size = 28,
  color = "currentColor",
  bg = "transparent",
}: {
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="Kick-off Prep"
      style={{ display: "block" }}
    >
      <rect width="64" height="64" rx="14" fill={bg} />
      <g transform="translate(8 8)" fill={color}>
        <path
          d="M24 1.5c7.5 0 14.6 3.6 16.5 11 .9 3.6.9 7.4 0 11-1 4-2.8 7.6-2.8 11.6 0 3.6 1.8 5.6 1.8 7.6s-1.6 3.5-5.5 3.5c-2.7 0-4.5-1.7-5.4-3.5-1-1.9-1.9-3.6-4.6-3.6s-3.6 1.7-4.6 3.6C18.5 44 16.7 45.7 14 45.7c-3.9 0-5.5-1.5-5.5-3.5s1.8-4 1.8-7.6c0-4-1.8-7.6-2.8-11.6-.9-3.6-.9-7.4 0-11C9.4 5.1 16.5 1.5 24 1.5z"
          fill={color}
          opacity="1"
        />
        <g fill="#000">
          <path d="M11 11l4 -2 1 6 -4 1z" />
          <path d="M16 7l5 -1 0 7 -5 1z" />
          <path d="M22 5.5l5 -0.5 0 7 -5 0.2z" />
          <path d="M28 5.5l5 0.5 -0.4 7 -4.6 -0.5z" />
          <path d="M33 6.5l5 1.5 -2 6.5 -3.4 -1z" />
          <path d="M9 19l4 0 -0.5 6.5 -4.5 -0.5z" />
          <path d="M14 19.5l5 0 -0.5 7.5 -5 -0.5z" />
          <path d="M20 19.7l4 -0.2 0 7.5 -4 0.5z" />
          <path d="M25 19.5l4 0.2 0.5 7.5 -4 0.3z" />
          <path d="M30 19.7l4 0.3 1 7 -4.5 0z" />
          <path d="M35 19.5l4.5 -0.5 -1 6.5 -4 0.5z" />
          <path d="M9 30l4.5 0 0 5.5 -4 0z" />
          <path d="M15 30.5l5 -0.3 -0.5 6 -4.5 0.3z" />
          <path d="M21 30.5l4 0 0 6 -4 0.3z" />
          <path d="M26 30.5l4 0 0.5 6 -4 0.3z" />
          <path d="M31 30.5l4.5 0.3 0 5.5 -4 0z" />
        </g>
        <circle cx="17" cy="16" r="1.6" fill="#000" />
        <circle cx="31" cy="16" r="1.6" fill="#000" />
        <ellipse cx="24" cy="40" rx="2.6" ry="1.4" fill="#000" opacity="0.85" />
      </g>
    </svg>
  );
}
