class WebhookLogger
  # Captures a snapshot of all Pay-related DB tables for educational comparison
  def self.snapshot
    user = User.first
    return {} unless user

    {
      pay_customers: Pay::Customer.where(owner: user).as_json,
      pay_subscriptions: Pay::Subscription.joins(:customer).where(pay_customers: { owner: user }).as_json,
      pay_charges: Pay::Charge.joins(:customer).where(pay_customers: { owner: user }).as_json,
      pay_payment_methods: Pay::PaymentMethod.joins(:customer).where(pay_customers: { owner: user }).as_json,
      pay_webhooks: Pay::Webhook.order(created_at: :desc).limit(10).as_json,
      licenses: user.licenses.as_json
    }
  end

  # Callable object that Pay::Webhooks delegator invokes
  def call(event)
    after_snapshot = self.class.snapshot

    WebhookLog.create!(
      event_type: event.try(:type) || event.class.name,
      payload: event.try(:data)&.to_hash || {},
      db_snapshot_before: {},
      db_snapshot_after: after_snapshot
    )
  rescue => e
    Rails.logger.error "WebhookLogger error: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
  end
end
