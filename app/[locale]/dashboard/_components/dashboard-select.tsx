import type { SelectHTMLAttributes } from "react";

type DashboardSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function DashboardSelect({
  className,
  children,
  ...props
}: DashboardSelectProps) {
  return (
    <span className="dashboard-select-control">
      <select
        {...props}
        className={["dashboard-select", className].filter(Boolean).join(" ")}
      >
        {children}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
        <path
          d="M5 7.5l5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}
