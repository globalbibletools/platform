import { ReactNode } from "react";

const colorClasses: Record<"red" | "brown", string> = {
  red: "bg-red-200 text-red-900 dark:bg-red-300 dark:text-red-950",
  brown: "bg-brown-100 text-brown-900 dark:bg-brown-200 dark:text-brown-950",
};

export default function StatusBadge({
  color,
  children,
}: {
  color: keyof typeof colorClasses;
  children: ReactNode;
}) {
  return (
    <span
      className={`
        inline-block text-xs rounded uppercase font-bold px-1 py-0.5
        ${colorClasses[color]}
      `}
    >
      {children}
    </span>
  );
}
