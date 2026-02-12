function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") || "" : "";
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRF-Token": getCsrfToken(),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

export const api = {
  getPayTables: () => request<import("../types/pay").PayTablesData>("/api/pay_tables"),
  getPayTable: (table: string) => request<{ data: unknown[]; table: string }>(`/api/pay_tables/${table}`),
  getStripeSync: () => request<import("../types/pay").StripeSyncData>("/api/stripe_sync"),
  performLifecycleAction: (action: string, params: Record<string, string> = {}) =>
    request<import("../types/pay").LifecycleResult>(`/api/lifecycle/${action}`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
