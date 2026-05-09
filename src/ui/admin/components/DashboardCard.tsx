import { ReactNode } from "react";

export function DashboardCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`
        ${className}
        rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700
        flex flex-col
      `}
    >
      {children}
    </section>
  );
}

export function DashboardCardHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700 flex items-center gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
        {title}
      </h2>
      {actions && <div className="ms-auto">{actions}</div>}
    </div>
  );
}

export function DashboardCardEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      {children}
    </div>
  );
}
