import { ReactNode } from "react";

export interface ViewTitleProps {
  className?: string;
  children?: ReactNode;
}

export default function ViewTitle({
  className = "",
  children,
}: ViewTitleProps) {
  return (
    <h1 className={`text-2xl font-bold pb-2 capitalize ${className}`}>
      {children}
    </h1>
  );
}
