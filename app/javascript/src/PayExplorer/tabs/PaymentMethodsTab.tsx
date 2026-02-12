import React from "react";
import DataTable from "../../shared/DataTable";
import Callout from "../../shared/Callout";
import JsonViewer from "../../shared/JsonViewer";
import type { PayPaymentMethod } from "../../types/pay";

interface Props {
  data: PayPaymentMethod[];
}

export default function PaymentMethodsTab({ data }: Props) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "payment_method_type", label: "Type" },
    { key: "processor_id", label: "Stripe PM ID", render: (v: any) => <code className="text-xs font-mono">{String(v)}</code> },
    { key: "default", label: "Default", render: (v: any) => v ? <span className="text-green-600 font-semibold">Yes</span> : "No" },
    {
      key: "data",
      label: "Card Data (JSONB)",
      render: (v: any) => v ? <JsonViewer data={v} title="Card details" /> : "-",
    },
    { key: "created_at", label: "Created", render: (v: any) => new Date(v as string).toLocaleString() },
  ];

  return (
    <div>
      <Callout title="About pay_payment_methods">
        <p className="mb-2">
          Stores payment method details synced from Stripe. The <code className="bg-indigo-100 px-1 rounded">data</code> column
          (JSONB) contains card brand, last 4 digits, expiration, etc.
        </p>
        <p className="mb-2">
          <strong>Note on type column:</strong> This table has both <code className="bg-indigo-100 px-1 rounded">type</code> (STI)
          and <code className="bg-indigo-100 px-1 rounded">payment_method_type</code> (card, bank_account, etc.) -- they serve different purposes.
        </p>
        <p>
          <strong>Created by:</strong> <code className="bg-indigo-100 px-1 rounded">payment_method.attached</code> webhook.
          Updated by <code className="bg-indigo-100 px-1 rounded">payment_method.updated</code> and <code className="bg-indigo-100 px-1 rounded">payment_method.automatically_updated</code>.
        </p>
      </Callout>

      <DataTable columns={columns} data={data} emptyMessage="No payment methods yet." />
    </div>
  );
}
