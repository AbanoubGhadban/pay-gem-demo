Pay.setup do |config|
  config.business_name = "Pay Gem Demo"
  config.business_address = "123 Demo St, San Francisco, CA 94105"
  config.application_name = "Pay Gem Educational Demo"
  config.support_email = "support@example.com"

  config.default_product_name = "Software License"
  config.default_plan_name = "Quarterly"

  config.automount_routes = true
  config.routes_path = "/pay"
end

# Subscribe to Stripe webhook events for license generation.
# Pay handles webhook verification and syncs data to DB first,
# then our handlers add custom business logic on top.
ActiveSupport.on_load(:pay) do
  # Generate license when checkout completes (new subscription)
  Pay::Webhooks.delegator.subscribe "stripe.checkout.session.completed", GeneratePaidLicenseHandler.new

  # Generate new license on subscription renewal
  Pay::Webhooks.delegator.subscribe "stripe.charge.succeeded", RenewLicenseHandler.new

  # Mark licenses as cancelled when subscription is deleted
  Pay::Webhooks.delegator.subscribe "stripe.customer.subscription.deleted", CancelLicenseHandler.new
end
