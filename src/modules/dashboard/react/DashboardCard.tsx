import { ReactNode } from "react";

export default function DashboardCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`
        rounded dark:bg-gray-700
        ${className}
      `}
    >
      {children}
    </div>
  );
}
