import React from "react";

interface CalloutProps {
  title: string;
  children: React.ReactNode;
  variant?: "info" | "success" | "warning";
}

const VARIANTS = {
  info: "bg-indigo-50 border-indigo-200 text-indigo-900",
  success: "bg-green-50 border-green-200 text-green-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
};

export default function Callout({ title, children, variant = "info" }: CalloutProps) {
  return (
    <div className={`rounded-lg border p-4 mb-4 ${VARIANTS[variant]}`}>
      <h4 className="text-sm font-semibold mb-1">{title}</h4>
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}
