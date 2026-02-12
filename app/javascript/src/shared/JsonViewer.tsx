import React, { useState } from "react";

interface JsonViewerProps {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
}

export default function JsonViewer({ data, title, defaultExpanded = false }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <span className="font-medium">{title || "JSON Data"}</span>
        <span className="text-gray-400">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <pre className="px-3 py-2 text-xs bg-gray-900 text-green-400 overflow-x-auto rounded-b-md max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
