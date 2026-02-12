import React, { useState, useEffect } from "react";
import { api } from "../shared/ApiClient";
import type { PayTablesData, StripeSyncData } from "../types/pay";
import CustomersTab from "./tabs/CustomersTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";
import ChargesTab from "./tabs/ChargesTab";
import PaymentMethodsTab from "./tabs/PaymentMethodsTab";
import WebhooksTab from "./tabs/WebhooksTab";
import DataFlowTab from "./tabs/DataFlowTab";
import StripeSyncTab from "./tabs/StripeSyncTab";

const TABS = [
  { id: "customers", label: "Pay Customers" },
  { id: "subscriptions", label: "Pay Subscriptions" },
  { id: "charges", label: "Pay Charges" },
  { id: "payment_methods", label: "Payment Methods" },
  { id: "webhooks", label: "Webhook Log" },
  { id: "data_flow", label: "Data Flow" },
  { id: "stripe_sync", label: "Stripe Sync" },
];

export default function PayExplorer() {
  const [activeTab, setActiveTab] = useState("customers");
  const [data, setData] = useState<PayTablesData | null>(null);
  const [syncData, setSyncData] = useState<StripeSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPayTables();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadSyncData = async () => {
    try {
      const result = await api.getStripeSync();
      setSyncData(result);
    } catch (e) {
      setSyncData({ error: e instanceof Error ? e.message : "Failed to load" } as StripeSyncData);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "stripe_sync" && !syncData) {
      loadSyncData();
    }
  }, [activeTab]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pay Explorer</h1>
          <p className="mt-1 text-sm text-gray-600">
            Explore every Pay gem database table, webhook, and Stripe sync status
          </p>
        </div>
        <button
          onClick={() => { loadData(); setSyncData(null); }}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {data && tab.id !== "data_flow" && tab.id !== "stripe_sync" && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {getCount(data, tab.id)}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading Pay table data...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : data ? (
        <div>
          {activeTab === "customers" && <CustomersTab data={data.customers} />}
          {activeTab === "subscriptions" && <SubscriptionsTab data={data.subscriptions} />}
          {activeTab === "charges" && <ChargesTab data={data.charges} />}
          {activeTab === "payment_methods" && <PaymentMethodsTab data={data.payment_methods} />}
          {activeTab === "webhooks" && <WebhooksTab webhooks={data.webhooks} webhookLogs={data.webhook_logs} />}
          {activeTab === "data_flow" && <DataFlowTab />}
          {activeTab === "stripe_sync" && <StripeSyncTab data={syncData} onRefresh={loadSyncData} />}
        </div>
      ) : null}
    </div>
  );
}

function getCount(data: PayTablesData, tabId: string): number {
  switch (tabId) {
    case "customers": return data.customers.length;
    case "subscriptions": return data.subscriptions.length;
    case "charges": return data.charges.length;
    case "payment_methods": return data.payment_methods.length;
    case "webhooks": return data.webhooks.length + data.webhook_logs.length;
    default: return 0;
  }
}
