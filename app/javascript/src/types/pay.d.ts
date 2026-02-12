export interface PayCustomer {
  id: number;
  type: string | null;
  owner_type: string;
  owner_id: number;
  processor: string;
  processor_id: string | null;
  default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  stripe_dashboard_url: string | null;
}

export interface PaySubscription {
  id: number;
  type: string | null;
  customer_id: number;
  processor_id: string;
  processor_plan: string;
  name: string;
  status: string;
  quantity: number;
  trial_ends_at: string | null;
  ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  metered: boolean;
  pause_starts_at: string | null;
  pause_resumes_at: string | null;
  created_at: string;
  updated_at: string;
  active: boolean;
  on_trial: boolean;
  on_grace_period: boolean;
  stripe_dashboard_url: string | null;
}

export interface PayCharge {
  id: number;
  type: string | null;
  customer_id: number;
  subscription_id: number | null;
  processor_id: string;
  amount: number;
  amount_formatted: string;
  currency: string;
  amount_refunded: number | null;
  created_at: string;
  updated_at: string;
  stripe_dashboard_url: string | null;
}

export interface PayPaymentMethod {
  id: number;
  type: string | null;
  customer_id: number;
  processor_id: string;
  payment_method_type: string;
  default: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PayWebhook {
  id: number;
  processor: string;
  event_type: string;
  event: Record<string, unknown>;
  created_at: string;
}

export interface WebhookLogEntry {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  db_snapshot_before: Record<string, unknown[]>;
  db_snapshot_after: Record<string, unknown[]>;
  changes_summary: Record<string, { before_count: number; after_count: number }>;
  created_at: string;
}

export interface PayTablesData {
  customers: PayCustomer[];
  subscriptions: PaySubscription[];
  charges: PayCharge[];
  payment_methods: PayPaymentMethod[];
  webhooks: PayWebhook[];
  webhook_logs: WebhookLogEntry[];
}

export interface StripeSyncData {
  customer: { local: Record<string, unknown>; stripe: Record<string, unknown> };
  subscriptions: { local: Record<string, unknown>[]; stripe: Record<string, unknown>[] };
  charges: { local: Record<string, unknown>[]; stripe: Record<string, unknown>[] };
  payment_methods: { local: Record<string, unknown>[]; stripe: Record<string, unknown>[] };
  error?: string;
}

export interface LifecycleResult {
  action: string;
  result: {
    method_called?: string;
    explanation?: string;
    expected_webhooks?: string[];
    checkout_url?: string;
    error?: string;
    old_price?: string;
    new_price?: string;
  };
  before: SnapshotState;
  after: SnapshotState;
}

export interface SnapshotState {
  customer?: {
    processor_id: string;
    default: boolean;
  };
  subscription?: {
    id: number;
    processor_id: string;
    status: string;
    processor_plan: string;
    current_period_start: string | null;
    current_period_end: string | null;
    ends_at: string | null;
    active: boolean;
    on_trial: boolean;
    on_grace_period: boolean;
  } | null;
  charges_count: number;
  payment_methods_count: number;
}
