import React from "react";
import DataTable from "../../shared/DataTable";
import Callout from "../../shared/Callout";
import type { PayCustomer } from "../../types/pay";

interface Props {
  data: PayCustomer[];
}

export default function CustomersTab({ data }: Props) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "type", label: "Type (STI)", render: (v: any) => <code className="text-xs bg-gray-100 px-1 rounded">{String(v || "nil")}</code> },
    { key: "owner_type", label: "Owner Type" },
    { key: "owner_id", label: "Owner ID" },
    { key: "processor", label: "Processor" },
    {
      key: "processor_id",
      label: "Processor ID",
      render: (v: unknown, row: any) => (
        v ? (
          <a href={row.stripe_dashboard_url as string} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-mono text-xs">
            {String(v)}
          </a>
        ) : <span className="text-gray-400">not synced</span>
      ),
    },
    { key: "default", label: "Default", render: (v: any) => v ? "Yes" : "No" },
    { key: "created_at", label: "Created", render: (v: any) => new Date(v as string).toLocaleString() },
  ];

  return (
    <div>
      <Callout title="About pay_customers">
        <p className="mb-2">
          The <code className="bg-indigo-100 px-1 rounded">pay_customers</code> table links your app's user to a payment processor customer.
          It uses a polymorphic <code className="bg-indigo-100 px-1 rounded">owner</code> association (owner_type + owner_id).
        </p>
        <p className="mb-2">
          <strong>STI (Single Table Inheritance):</strong> The <code className="bg-indigo-100 px-1 rounded">type</code> column stores
          <code className="bg-indigo-100 px-1 rounded">Pay::Stripe::Customer</code> which inherits from <code className="bg-indigo-100 px-1 rounded">Pay::Customer</code>.
          This lets Pay add Stripe-specific methods while using one table.
        </p>
        <p>
          <strong>Created when:</strong> First time <code className="bg-indigo-100 px-1 rounded">user.payment_processor</code> is called
          (lazy) or during checkout. The <code className="bg-indigo-100 px-1 rounded">processor_id</code> is the Stripe Customer ID (cus_xxx).
        </p>
      </Callout>

      <DataTable columns={columns} data={data} emptyMessage="No Pay customers yet. Subscribe to create one!" />
    </div>
  );
}
