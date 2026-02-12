Rails.application.config.after_initialize do
  Stripe.api_key = ENV["STRIPE_PRIVATE_KEY"]
end
