# Handles stripe.checkout.session.completed webhook event.
# Enqueues license generation for new subscriptions.
#
# Flow:
#   1. Stripe sends checkout.session.completed webhook
#   2. Pay gem verifies signature, syncs data, then delegates to handlers
#   3. This handler finds the Pay records and enqueues GeneratePaidLicenseJob
#   4. The job performs idempotency checks and calls LicenseGeneratorService
#
class GeneratePaidLicenseHandler
  def call(event)
    checkout_session = event.data.object

    # Only handle subscription checkouts that are paid
    return unless checkout_session.mode == "subscription"
    return unless checkout_session.payment_status == "paid"

    # Find the Pay customer
    pay_customer = Pay::Customer.find_by(
      processor: :stripe,
      processor_id: checkout_session.customer
    )
    return unless pay_customer

    # Find the Pay subscription (Pay syncs this automatically before our handler runs)
    pay_subscription = Pay::Subscription.find_by_processor_and_id(
      "stripe", checkout_session.subscription
    )
    return unless pay_subscription

    # Find the Pay charge for idempotency tracking
    pay_charge = find_checkout_charge(checkout_session, pay_customer)

    user = pay_customer.owner

    # Enqueue license generation (async for reliability).
    # If charge not found yet (rare race condition), job will look it up via subscription.
    GeneratePaidLicenseJob.perform_later(user.id, pay_subscription.id, pay_charge&.id)
  end

  private

  # Find the charge associated with this checkout session.
  # Pay stores the Stripe charge with a nested payment_intent object in JSONB.
  def find_checkout_charge(checkout_session, pay_customer)
    return nil unless checkout_session.payment_intent

    pay_customer.charges.find_by(
      "object->'payment_intent'->>'id' = ?",
      checkout_session.payment_intent
    )
  end
end
