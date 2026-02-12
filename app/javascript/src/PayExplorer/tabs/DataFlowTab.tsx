import React, { useState } from "react";
import Callout from "../../shared/Callout";

interface FlowStep {
  actor: "App" | "Pay" | "Stripe" | "Webhook";
  action: string;
  detail: string;
}

interface Flow {
  name: string;
  description: string;
  steps: FlowStep[];
  webhookEvents: string[];
}

const FLOWS: Flow[] = [
  {
    name: "Subscribe (Checkout)",
    description: "User subscribes via Stripe Checkout",
    steps: [
      { actor: "App", action: "payment_processor.checkout(mode: 'subscription', line_items: [...])", detail: "Creates a Stripe Checkout Session via Pay" },
      { actor: "Stripe", action: "Redirect to checkout.stripe.com", detail: "User enters card details on Stripe-hosted page" },
      { actor: "Stripe", action: "Process payment", detail: "Stripe creates Customer, Subscription, PaymentIntent, Charge" },
      { actor: "App", action: "Pay::Stripe.sync_checkout_session(session_id)", detail: "On success redirect, sync creates local Pay records immediately" },
      { actor: "Webhook", action: "checkout.session.completed", detail: "Pay processes: creates/updates Pay::Customer, Pay::Subscription" },
      { actor: "Webhook", action: "charge.succeeded", detail: "Pay creates Pay::Charge record" },
      { actor: "Webhook", action: "customer.subscription.created", detail: "Pay creates/updates Pay::Subscription" },
      { actor: "Webhook", action: "payment_method.attached", detail: "Pay creates Pay::PaymentMethod record" },
    ],
    webhookEvents: ["checkout.session.completed", "charge.succeeded", "customer.subscription.created", "payment_method.attached", "payment_intent.succeeded", "invoice.payment_succeeded"],
  },
  {
    name: "Cancel at Period End",
    description: "User cancels but keeps access until period ends",
    steps: [
      { actor: "App", action: "subscription.cancel", detail: "Calls Pay's cancel method" },
      { actor: "Pay", action: "Stripe::Subscription.update(cancel_at_period_end: true)", detail: "Pay tells Stripe to cancel at period end" },
      { actor: "Pay", action: "Sets ends_at = current_period_end", detail: "Local record updated. subscription.on_grace_period? returns true" },
      { actor: "Webhook", action: "customer.subscription.updated", detail: "Stripe confirms the update" },
    ],
    webhookEvents: ["customer.subscription.updated"],
  },
  {
    name: "Resume (Undo Cancel)",
    description: "User resumes a cancelled subscription during grace period",
    steps: [
      { actor: "App", action: "subscription.resume", detail: "Only works if on_grace_period? is true" },
      { actor: "Pay", action: "Stripe::Subscription.update(cancel_at_period_end: false)", detail: "Pay tells Stripe to NOT cancel" },
      { actor: "Pay", action: "Clears ends_at to nil", detail: "Subscription will auto-renew again" },
      { actor: "Webhook", action: "customer.subscription.updated", detail: "Stripe confirms the update" },
    ],
    webhookEvents: ["customer.subscription.updated"],
  },
  {
    name: "Swap Plan",
    description: "User switches from quarterly to annual (or vice versa)",
    steps: [
      { actor: "App", action: "subscription.swap('price_new_id')", detail: "Changes the subscription's price" },
      { actor: "Pay", action: "Stripe::Subscription.update(items: [{price: new_price}])", detail: "Stripe prorates by default" },
      { actor: "Pay", action: "Updates processor_plan locally", detail: "Local record reflects new price ID" },
      { actor: "Webhook", action: "customer.subscription.updated", detail: "Stripe confirms the plan change" },
      { actor: "Webhook", action: "invoice.payment_succeeded (if proration)", detail: "If upgrading, Stripe may charge the difference" },
    ],
    webhookEvents: ["customer.subscription.updated", "invoice.created", "invoice.payment_succeeded"],
  },
  {
    name: "Cancel Immediately",
    description: "Immediate cancellation, no grace period",
    steps: [
      { actor: "App", action: "subscription.cancel_now!", detail: "Immediately terminates the subscription" },
      { actor: "Pay", action: "Stripe::Subscription.cancel", detail: "Pay tells Stripe to cancel right now" },
      { actor: "Pay", action: "Sets ends_at = Time.current, status = canceled", detail: "Access revoked immediately" },
      { actor: "Webhook", action: "customer.subscription.deleted", detail: "Stripe confirms deletion" },
    ],
    webhookEvents: ["customer.subscription.deleted"],
  },
  {
    name: "Auto-Renewal",
    description: "Stripe automatically renews at period end",
    steps: [
      { actor: "Stripe", action: "Creates invoice at period end", detail: "Stripe's billing engine runs automatically" },
      { actor: "Stripe", action: "Charges the default payment method", detail: "Uses saved card" },
      { actor: "Webhook", action: "invoice.payment_succeeded", detail: "Pay may update charge records" },
      { actor: "Webhook", action: "customer.subscription.updated", detail: "Pay updates current_period_start/end" },
      { actor: "Webhook", action: "charge.succeeded", detail: "Pay creates new Pay::Charge record" },
    ],
    webhookEvents: ["invoice.upcoming", "invoice.payment_succeeded", "customer.subscription.updated", "charge.succeeded"],
  },
  {
    name: "Failed Payment",
    description: "Auto-renewal payment fails",
    steps: [
      { actor: "Stripe", action: "Attempts to charge default payment method", detail: "Card declined or expired" },
      { actor: "Webhook", action: "invoice.payment_failed", detail: "Pay receives notification" },
      { actor: "Stripe", action: "Retry logic (Smart Retries)", detail: "Stripe retries up to 4 times over several weeks" },
      { actor: "Webhook", action: "customer.subscription.updated (status: past_due)", detail: "Pay updates subscription status" },
      { actor: "Webhook", action: "invoice.payment_action_required", detail: "If 3D Secure or SCA is needed" },
    ],
    webhookEvents: ["invoice.payment_failed", "customer.subscription.updated", "invoice.payment_action_required"],
  },
];

const ACTOR_COLORS = {
  App: "bg-blue-100 text-blue-800 border-blue-300",
  Pay: "bg-green-100 text-green-800 border-green-300",
  Stripe: "bg-purple-100 text-purple-800 border-purple-300",
  Webhook: "bg-orange-100 text-orange-800 border-orange-300",
};

export default function DataFlowTab() {
  const [activeFlow, setActiveFlow] = useState(0);
  const flow = FLOWS[activeFlow];

  return (
    <div>
      <Callout title="Data Flow Diagrams">
        <p>
          These diagrams show exactly what happens at each step of common subscription actions.
          Each step shows who acts (your App, Pay gem, Stripe API, or Webhook) and what they do.
        </p>
      </Callout>

      {/* Flow selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FLOWS.map((f, i) => (
          <button
            key={i}
            onClick={() => setActiveFlow(i)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activeFlow === i ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Flow detail */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{flow.name}</h3>
        <p className="text-sm text-gray-600 mb-6">{flow.description}</p>

        {/* Steps */}
        <div className="space-y-4">
          {flow.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex-shrink-0 flex flex-col items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 text-sm font-bold">
                  {i + 1}
                </span>
                {i < flow.steps.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ACTOR_COLORS[step.actor]}`}>
                    {step.actor}
                  </span>
                </div>
                <code className="text-sm text-gray-900 block mb-1">{step.action}</code>
                <p className="text-xs text-gray-500">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expected webhook events */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Expected Webhook Events</h4>
          <div className="flex flex-wrap gap-2">
            {flow.webhookEvents.map((event) => (
              <code key={event} className="text-xs bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-200">
                {event}
              </code>
            ))}
          </div>
        </div>
      </div>

      {/* All webhook events Pay handles */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All 21 Webhook Events Pay Handles</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Charges</h4>
            <ul className="space-y-1">
              {["charge.succeeded", "charge.refunded", "charge.updated"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Checkout</h4>
            <ul className="space-y-1">
              {["checkout.session.completed", "checkout.session.async_payment_succeeded"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Subscriptions</h4>
            <ul className="space-y-1">
              {["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.trial_will_end"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer</h4>
            <ul className="space-y-1">
              {["customer.updated", "customer.deleted"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Methods</h4>
            <ul className="space-y-1">
              {["payment_method.attached", "payment_method.updated", "payment_method.automatically_updated", "payment_method.detached"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Invoices & Other</h4>
            <ul className="space-y-1">
              {["payment_intent.succeeded", "invoice.upcoming", "invoice.payment_action_required", "invoice.payment_failed", "account.updated"].map((e) => (
                <li key={e}><code className="text-xs bg-white px-2 py-0.5 rounded border">{e}</code></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
