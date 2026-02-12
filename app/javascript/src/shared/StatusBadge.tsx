import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  canceled: "bg-red-100 text-red-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-yellow-100 text-yellow-800",
  incomplete: "bg-orange-100 text-orange-800",
  incomplete_expired: "bg-gray-100 text-gray-800",
  paused: "bg-purple-100 text-purple-800",
  unpaid: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors} ${className}`}
    >
      {status}
    </span>
  );
}
