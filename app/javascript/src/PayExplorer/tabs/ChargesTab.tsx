import React from "react";
import DataTable from "../../shared/DataTable";
import Callout from "../../shared/Callout";
import type { PayCharge } from "../../types/pay";

interface Props {
  data: PayCharge[];
}

export default function ChargesTab({ data }: Props) {
  const columns = [
    { key: "id", label: "ID" },
    {
      key: "amount_formatted",
      label: "Amount",
      render: (v: any) => <span className="font-semibold">{String(v)}</span>,
    },
    { key: "currency", label: "Currency", render: (v: any) => String(v || "").toUpperCase() },
    {
      key: "amount_refunded",
      label: "Refunded",
      render: (v: any) => {
        const val = v as number;
        return val && val > 0 ? <span className="text-red-600">${(val / 100).toFixed(2)}</span> : "-";
      },
    },
    { key: "subscription_id", label: "Sub ID", render: (v: any) => v ? String(v) : "-" },
    {
      key: "processor_id",
      label: "Stripe ID",
      render: (v: unknown, row: any) => (
        <a href={row.stripe_dashboard_url as string} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-mono text-xs">
          {String(v)}
        </a>
      ),
    },
    { key: "created_at", label: "Date", render: (v: any) => new Date(v as string).toLocaleString() },
  ];

  return (
    <div>
      <Callout title="About pay_charges">
        <p className="mb-2">
          Each charge represents a payment. <code className="bg-indigo-100 px-1 rounded">amount</code> is stored in
          <strong> cents</strong> (e.g., 2900 = $29.00). The <code className="bg-indigo-100 px-1 rounded">subscription_id</code>
          links to the Pay subscription that generated this charge.
        </p>
        <p>
          <strong>Created by:</strong> The <code className="bg-indigo-100 px-1 rounded">charge.succeeded</code> webhook event.
          Pay automatically creates a charge record when Stripe confirms payment.
        </p>
      </Callout>

      <DataTable columns={columns} data={data} emptyMessage="No charges yet. Complete a checkout to create one!" />
    </div>
  );
}
