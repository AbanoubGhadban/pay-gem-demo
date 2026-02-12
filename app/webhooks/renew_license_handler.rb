# Handles stripe.charge.succeeded webhook event for subscription renewals.
#
# NOTE: This handler subscribes to ALL charge.succeeded events because
# Stripe doesn't provide a subscription-renewal-specific event.
# We filter for renewals using invoice.billing_reason == "subscription_cycle".
# Most charges will exit early after the first database query (indexed lookup).
#
# Flow:
#   1. Stripe charges customer for subscription renewal
#   2. Pay gem syncs the charge (including invoice data) then delegates to handlers
#   3. This handler checks if it's a renewal charge and enqueues GeneratePaidLicenseJob
#   4. The job creates a new license and expires the old one
#
class RenewLicenseHandler
  def call(event)
    charge = event.data.object

    # Pay::Stripe::Charge.sync already ran before our handler.
    # It fetched the invoice and associated the subscription.
    pay_charge = Pay::Charge.find_by_processor_and_id("stripe", charge.id)
    return unless pay_charge

    # Access the cached invoice (no API call - Pay already fetched it during sync)
    invoice = pay_charge.stripe_invoice
    return unless invoice&.billing_reason == "subscription_cycle"

    # Pay already associated the subscription during sync
    pay_subscription = pay_charge.subscription
    return unless pay_subscription

    user = pay_charge.customer.owner

    # Enqueue license generation with is_renewal flag.
    # Renewals skip the subscription-level idempotency check since they
    # reuse the same subscription_id but should create new licenses per charge.
    GeneratePaidLicenseJob.perform_later(
      user.id, pay_subscription.id, pay_charge.id, is_renewal: true
    )
  end
end
