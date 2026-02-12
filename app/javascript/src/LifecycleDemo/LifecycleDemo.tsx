import React, { useState } from "react";
import { api } from "../shared/ApiClient";
import StatusBadge from "../shared/StatusBadge";
import JsonViewer from "../shared/JsonViewer";
import Callout from "../shared/Callout";
import type { LifecycleResult } from "../types/pay";

interface Props {
  has_subscription: boolean;
  subscription_status: string | null;
  quarterly_price_id: string;
  annual_price_id: string;
}

interface ActionDef {
  id: string;
  label: string;
  description: string;
  method: string;
  color: string;
  needsSubscription: boolean;
}

const ACTIONS: ActionDef[] = [
  {
    id: "subscribe",
    label: "Subscribe",
    description: "Opens Stripe Checkout to create a new subscription",
    method: "payment_processor.checkout(mode: 'subscription')",
    color: "bg-green-600 hover:bg-green-500",
    needsSubscription: false,
  },
  {
    id: "cancel",
    label: "Cancel at Period End",
    description: "Cancels subscription but keeps access until billing period ends",
    method: "subscription.cancel",
    color: "bg-yellow-600 hover:bg-yellow-500",
    needsSubscription: true,
  },
  {
    id: "resume",
    label: "Resume",
    description: "Resumes a cancelled subscription during grace period",
    method: "subscription.resume",
    color: "bg-blue-600 hover:bg-blue-500",
    needsSubscription: true,
  },
  {
    id: "swap_plan",
    label: "Swap Plan",
    description: "Switches between quarterly and annual plans",
    method: "subscription.swap(new_price)",
    color: "bg-purple-600 hover:bg-purple-500",
    needsSubscription: true,
  },
  {
    id: "cancel_immediately",
    label: "Cancel Immediately",
    description: "Immediately cancels with no grace period",
    method: "subscription.cancel_now!",
    color: "bg-red-600 hover:bg-red-500",
    needsSubscription: true,
  },
];

export default function LifecycleDemo({ has_subscription, subscription_status, quarterly_price_id, annual_price_id }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<LifecycleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performAction = async (actionId: string) => {
    setLoading(actionId);
    setError(null);
    setResult(null);

    try {
      const params: Record<string, string> = {};
      if (actionId === "subscribe") {
        params.price_id = quarterly_price_id;
      }

      const res = await api.performLifecycleAction(actionId, params);

      // If subscribe returns a checkout URL, redirect
      if (res.result.checkout_url) {
        window.location.href = res.result.checkout_url;
        return;
      }

      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Lifecycle Demo</h1>
      <p className="text-sm text-gray-600 mb-6">
        Test every subscription action and see the before/after database state.
        Current status: {subscription_status ? <StatusBadge status={subscription_status} /> : <span className="text-gray-400">No subscription</span>}
      </p>

      <Callout title="How this works">
        <p>
          Each button calls a Pay gem method on your subscription. After the action, you'll see the exact
          method called, expected webhook events, and a diff of the database state before and after.
        </p>
      </Callout>

      {/* Action buttons */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => performAction(action.id)}
            disabled={loading !== null}
            className={`${action.color} text-white rounded-lg p-4 text-left transition-all disabled:opacity-50`}
          >
            <div className="font-semibold text-sm mb-1">{action.label}</div>
            <div className="text-xs opacity-80">{action.description}</div>
            <code className="block mt-2 text-xs opacity-70 break-all">{action.method}</code>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          Processing {loading}...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Result: <span className="text-indigo-600">{result.action}</span>
          </h3>

          {/* Method & explanation */}
          {result.result.method_called && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">Pay method called:</div>
              <code className="block bg-gray-900 text-green-400 px-4 py-2 rounded text-sm">
                {result.result.method_called}
              </code>
            </div>
          )}

          {result.result.explanation && (
            <p className="text-sm text-gray-700 mb-4 bg-blue-50 border border-blue-200 rounded p-3">
              {result.result.explanation}
            </p>
          )}

          {result.result.expected_webhooks && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">Expected webhook events:</div>
              <div className="flex flex-wrap gap-2">
                {result.result.expected_webhooks.map((event) => (
                  <code key={event} className="text-xs bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-200">
                    {event}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Before/After comparison */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2">BEFORE</h4>
              {result.before.subscription ? (
                <dl className="space-y-1 text-xs">
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Status:</dt><dd><StatusBadge status={result.before.subscription.status} /></dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Plan:</dt><dd className="font-mono">{result.before.subscription.processor_plan}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Active:</dt><dd>{result.before.subscription.active ? "Yes" : "No"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Grace period:</dt><dd>{result.before.subscription.on_grace_period ? "Yes" : "No"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Ends at:</dt><dd>{result.before.subscription.ends_at || "nil (auto-renew)"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Period end:</dt><dd>{result.before.subscription.current_period_end}</dd></div>
                </dl>
              ) : (
                <p className="text-xs text-gray-500">No subscription</p>
              )}
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-700 mb-2">AFTER</h4>
              {result.after.subscription ? (
                <dl className="space-y-1 text-xs">
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Status:</dt><dd><StatusBadge status={result.after.subscription.status} /></dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Plan:</dt><dd className="font-mono">{result.after.subscription.processor_plan}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Active:</dt><dd>{result.after.subscription.active ? "Yes" : "No"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Grace period:</dt><dd>{result.after.subscription.on_grace_period ? "Yes" : "No"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Ends at:</dt><dd className={result.after.subscription.ends_at ? "text-red-600 font-semibold" : ""}>{result.after.subscription.ends_at || "nil (auto-renew)"}</dd></div>
                  <div className="flex gap-2"><dt className="font-medium text-gray-500 w-32">Period end:</dt><dd>{result.after.subscription.current_period_end}</dd></div>
                </dl>
              ) : (
                <p className="text-xs text-gray-500">No subscription</p>
              )}
            </div>
          </div>

          {/* Full JSON diff */}
          <div className="mt-4">
            <JsonViewer data={{ before: result.before, after: result.after }} title="Full state diff (JSON)" />
          </div>
        </div>
      )}
    </div>
  );
}
