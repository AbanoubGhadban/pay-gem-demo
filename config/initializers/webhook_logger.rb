# Subscribe to ALL Pay webhook events using Pay's delegator API.
# Use a lambda so WebhookLogger is resolved at call time (after autoload).
Pay::Webhooks.configure do |events|
  events.all ->(event) {
    WebhookLogger.new.call(event)
  }
end
