import React from "react";
import ComparisonPanel from "../../shared/ComparisonPanel";
import Callout from "../../shared/Callout";
import type { StripeSyncData } from "../../types/pay";

interface Props {
  data: StripeSyncData | null;
  onRefresh: () => void;
}

export default function StripeSyncTab({ data, onRefresh }: Props) {
  if (!data) {
    return <div className="text-center py-12 text-gray-500">Loading Stripe sync data...</div>;
  }

  if (data.error) {
    return (
      <div>
        <Callout title="About Stripe Sync" variant="warning">
          <p>
            This tab fetches live data from the Stripe API and compares it side-by-side with your local Pay database.
            It helps you understand how Pay keeps data in sync and spot any discrepancies.
          </p>
        </Callout>
        <div className="text-center py-12">
          <p className="text-amber-600 mb-4">{data.error}</p>
          <button
            onClick={onRefresh}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Callout title="About Stripe Sync">
        <p className="mb-2">
          This tab fetches live data from the Stripe API and compares it with your local Pay database records.
          The left column shows what Pay has stored locally, the right shows what Stripe has.
        </p>
        <p>
          <strong>Key insight:</strong> Pay syncs data via webhooks and the <code className="bg-indigo-100 px-1 rounded">sync_checkout_session</code> method.
          If data differs, it usually means a webhook hasn't been processed yet or you need to run
          <code className="bg-indigo-100 px-1 rounded">Pay::Stripe::Subscription.sync(stripe_id)</code> manually.
        </p>
      </Callout>

      <div className="flex justify-end mb-4">
        <button
          onClick={onRefresh}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Refresh Stripe Data
        </button>
      </div>

      <ComparisonPanel
        title="Customer"
        localData={data.customer.local}
        stripeData={data.customer.stripe}
      />

      <ComparisonPanel
        title="Subscriptions"
        localData={data.subscriptions.local}
        stripeData={data.subscriptions.stripe}
      />

      <ComparisonPanel
        title="Charges / Payment Intents"
        localData={data.charges.local}
        stripeData={data.charges.stripe}
      />

      <ComparisonPanel
        title="Payment Methods"
        localData={data.payment_methods.local}
        stripeData={data.payment_methods.stripe}
      />
    </div>
  );
}
