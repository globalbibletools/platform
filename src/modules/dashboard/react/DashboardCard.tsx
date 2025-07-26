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
        rounded bg-brown-100 dark:bg-gray-700 flex flex-col
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-bold p-6 sm:p-7 pb-0 sm:pb-0 sm:text-lg md:text-xl">
      {children}
    </h2>
  );
}
Heading.displayName = "DashboardCard.Heading";
DashboardCard.Heading = Heading;

function Body({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-6 sm:p-7 pt-3 sm:pt-4 flex-grow ${className}`}>
      {children}
    </div>
  );
}
Body.displayName = "DashboardCard.Body";
DashboardCard.Body = Body;
