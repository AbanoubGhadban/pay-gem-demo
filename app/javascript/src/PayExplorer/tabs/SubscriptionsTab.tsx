import React from "react";
import DataTable from "../../shared/DataTable";
import StatusBadge from "../../shared/StatusBadge";
import Callout from "../../shared/Callout";
import type { PaySubscription } from "../../types/pay";

interface Props {
  data: PaySubscription[];
}

export default function SubscriptionsTab({ data }: Props) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "status", label: "Status", render: (v: any) => <StatusBadge status={String(v)} /> },
    { key: "name", label: "Name" },
    {
      key: "processor_plan",
      label: "Price ID",
      render: (v: any) => <code className="text-xs bg-gray-100 px-1 rounded">{String(v)}</code>,
    },
    {
      key: "processor_id",
      label: "Stripe Sub ID",
      render: (v: unknown, row: Record<string, unknown>) => (
        <a href={row.stripe_dashboard_url as string} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-mono text-xs">
          {String(v)}
        </a>
      ),
    },
    {
      key: "current_period_end",
      label: "Period End",
      render: (v: any) => v ? new Date(v as string).toLocaleDateString() : "-",
    },
    {
      key: "ends_at",
      label: "Ends At",
      render: (v: any) => v ? <span className="text-red-600">{new Date(v as string).toLocaleString()}</span> : <span className="text-green-600">Auto-renew</span>,
    },
    {
      key: "active",
      label: "Flags",
      render: (_v: any, row: any) => (
        <div className="flex gap-1">
          {row.active && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">active</span>}
          {row.on_trial && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">trial</span>}
          {row.on_grace_period && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">grace</span>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Callout title="About pay_subscriptions">
        <p className="mb-2">
          Tracks subscription state. Key columns: <code className="bg-indigo-100 px-1 rounded">status</code> mirrors Stripe
          (active, canceled, past_due, etc.), <code className="bg-indigo-100 px-1 rounded">ends_at</code> is set when cancelled
          (grace period until this date).
        </p>
        <p className="mb-2">
          <strong>Status lifecycle:</strong> active {"\u2192"} canceled (with ends_at = period end) {"\u2192"} actually ends when period expires.
          Use <code className="bg-indigo-100 px-1 rounded">subscription.active?</code>, <code className="bg-indigo-100 px-1 rounded">.on_grace_period?</code>,
          <code className="bg-indigo-100 px-1 rounded">.on_trial?</code> helper methods.
        </p>
        <p>
          <strong>Key difference:</strong> <code className="bg-indigo-100 px-1 rounded">cancel</code> sets ends_at (grace period),
          while <code className="bg-indigo-100 px-1 rounded">cancel_now!</code> immediately terminates.
        </p>
      </Callout>

      <DataTable columns={columns} data={data} emptyMessage="No subscriptions yet. Subscribe to create one!" />
    </div>
  );
}
