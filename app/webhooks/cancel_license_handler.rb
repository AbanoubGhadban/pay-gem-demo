# Handles stripe.customer.subscription.deleted webhook event.
# Marks active licenses as cancelled when a subscription is fully deleted.
#
# Note: This fires when a subscription is *deleted* (final cancellation),
# not when it's set to cancel at period end. Pay's Subscription.sync
# handles the status update to "canceled" for cancel-at-period-end.
#
class CancelLicenseHandler
  def call(event)
    stripe_subscription = event.data.object

    # Pay::Stripe::Subscription.sync already ran before our handler
    pay_subscription = Pay::Subscription.find_by_processor_and_id(
      "stripe", stripe_subscription.id
    )
    return unless pay_subscription

    # Mark all active licenses for this subscription as cancelled
    License.where(pay_subscription: pay_subscription, status: "active")
           .update_all(status: "cancelled")
  end
end
