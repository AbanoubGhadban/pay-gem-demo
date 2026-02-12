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
