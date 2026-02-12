import React, { useState } from "react";
import JsonViewer from "../../shared/JsonViewer";
import Callout from "../../shared/Callout";
import type { PayWebhook, WebhookLogEntry } from "../../types/pay";

interface Props {
  webhooks: PayWebhook[];
  webhookLogs: WebhookLogEntry[];
}

export default function WebhooksTab({ webhooks, webhookLogs }: Props) {
  const [subTab, setSubTab] = useState<"raw" | "logs">("raw");

  return (
    <div>
      <Callout title="About Webhooks">
        <p className="mb-2">
          Pay stores raw webhook events in <code className="bg-indigo-100 px-1 rounded">pay_webhooks</code>.
          Our custom <code className="bg-indigo-100 px-1 rounded">WebhookLogger</code> also captures DB snapshots after each event
          so you can see exactly what changed.
        </p>
        <p>
          <strong>Webhook flow:</strong> Stripe sends POST to <code className="bg-indigo-100 px-1 rounded">/pay/webhooks/stripe</code>
          {"\u2192"} Pay verifies signature {"\u2192"} stores in pay_webhooks {"\u2192"} processes event {"\u2192"} updates Pay tables
          {"\u2192"} our WebhookLogger captures snapshot.
        </p>
      </Callout>

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setSubTab("raw")}
          className={`px-3 py-1 rounded text-sm font-medium ${subTab === "raw" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Raw Webhooks ({webhooks.length})
        </button>
        <button
          onClick={() => setSubTab("logs")}
          className={`px-3 py-1 rounded text-sm font-medium ${subTab === "logs" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Webhook Logs ({webhookLogs.length})
        </button>
      </div>

      {subTab === "raw" ? (
        <div className="space-y-3">
          {webhooks.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No webhooks received yet. Subscribe and check back!</p>
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-900">{wh.event_type}</span>
                    <span className="text-xs text-gray-500">{wh.processor}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(wh.created_at).toLocaleString()}</span>
                </div>
                <JsonViewer data={wh.event} title="Event payload" />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {webhookLogs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No webhook logs yet.</p>
          ) : (
            webhookLogs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{log.event_type}</span>
                  <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                {Object.keys(log.changes_summary).length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600">Changes: </span>
                    {Object.entries(log.changes_summary).map(([table, counts]) => (
                      <span key={table} className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-1">
                        {table}: {counts.before_count} {"\u2192"} {counts.after_count}
                      </span>
                    ))}
                  </div>
                )}
                <JsonViewer data={log.db_snapshot_after} title="DB snapshot after webhook" />
                <div className="mt-2">
                  <JsonViewer data={log.payload} title="Webhook payload" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
