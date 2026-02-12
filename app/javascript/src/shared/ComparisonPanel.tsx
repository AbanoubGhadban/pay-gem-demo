import React from "react";

interface ComparisonPanelProps {
  title: string;
  localData: Record<string, unknown> | Record<string, unknown>[];
  stripeData: Record<string, unknown> | Record<string, unknown>[];
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderObject(data: Record<string, unknown>) {
  return (
    <dl className="space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="text-xs font-medium text-gray-500 min-w-[120px]">{key}:</dt>
          <dd className="text-xs text-gray-900 font-mono break-all">{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ComparisonPanel({ title, localData, stripeData }: ComparisonPanelProps) {
  const localArray = Array.isArray(localData) ? localData : [localData];
  const stripeArray = Array.isArray(stripeData) ? stripeData : [stripeData];

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-xs font-semibold text-blue-700 mb-2 uppercase">Local (Pay DB)</h5>
          {localArray.length === 0 ? (
            <p className="text-xs text-gray-500">No records</p>
          ) : (
            localArray.map((item, i) => (
              <div key={i} className="mb-3 last:mb-0">
                {renderObject(item)}
              </div>
            ))
          )}
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h5 className="text-xs font-semibold text-purple-700 mb-2 uppercase">Stripe (Live API)</h5>
          {stripeArray.length === 0 ? (
            <p className="text-xs text-gray-500">No records</p>
          ) : (
            stripeArray.map((item, i) => (
              <div key={i} className="mb-3 last:mb-0">
                {renderObject(item)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
