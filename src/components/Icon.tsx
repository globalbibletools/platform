import { useState, useEffect } from "react";
import { SPRITE_URL } from "virtual:icon-sprite-url";

const iconNames = [
  "add",
  "align-left",
  "align-right",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-rotate-left",
  "arrows-rotate",
  "arrow-up",
  "backward-step",
  "bars",
  "bold",
  "book-open",
  "caret-down",
  "caret-up",
  "check",
  "check-circle",
  "clipboard-check",
  "chevron-down",
  "chevron-up",
  "chart-line",
  "circle",
  "circle-hollow",
  "circle-play",
  "close",
  "database",
  "download",
  "ellipsis",
  "envelope",
  "exclamation-circle",
  "exclamation-triangle",
  "external-link",
  "maximize",
  "magnifying-glass",
  "feather",
  "file-arrow-down",
  "file-export",
  "file-import",
  "forward-step",
  "gear",
  "github",
  "google",
  "indent",
  "italic",
  "language",
  "link",
  "list-ol",
  "list-ul",
  "outdent",
  "pause",
  "play",
  "plus",
  "question-circle",
  "right-from-bracket",
  "robot",
  "save",
  "share-from-square",
  "sliders",
  "sticky-note",
  "strikethrough",
  "trash",
  "triangle-exclamation",
  "unlink",
  "user",
  "xmark",
] as const;

export type IconType = (typeof iconNames)[number];

const fallbackIcon: IconType = "question-circle";

const sizeMap: Record<string, string> = {
  xs: "0.75em",
  sm: "0.875em",
  lg: "1.25em",
  xl: "1.5em",
  "2xl": "2em",
};

interface IconProps {
  icon: IconType;
  size?: "1x" | "xs" | "sm" | "lg" | "xl" | "2xl";
  fixedWidth?: boolean;
  className?: string;
  title?: string;
}

export function Icon({ icon, size, fixedWidth, className, title }: IconProps) {
  const iconName = iconNames.includes(icon) ? icon : fallbackIcon;
  const emSize = size ? (sizeMap[size] ?? size) : "1em";

  return (
    <svg
      className={`icon ${className}`}
      style={{
        width: fixedWidth ? "1.25em" : emSize,
        height: emSize,
      }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
    >
      <use href={`${SPRITE_URL}#${iconName}`} />
    </svg>
  );
}
