class GeneratePaidLicenseJob < ApplicationJob
  queue_as :default

  # Retry on transient failures (database issues, network, etc.)
  retry_on StandardError, wait: :polynomially_longer, attempts: 5 do |job, error|
    user_id, pay_subscription_id, pay_charge_id = job.arguments
    Rails.logger.error(
      "[GeneratePaidLicenseJob] FAILED after 5 attempts. " \
      "user_id=#{user_id} subscription_id=#{pay_subscription_id} charge_id=#{pay_charge_id} " \
      "error=#{error.class}: #{error.message}"
    )
  end

  def perform(user_id, pay_subscription_id, pay_charge_id = nil, is_renewal: false)
    # Use find_by - records might be deleted between enqueue and execution
    user = User.find_by(id: user_id)
    return unless user

    pay_subscription = Pay::Subscription.find_by(id: pay_subscription_id)
    return unless pay_subscription

    # Find the charge - either by ID passed in, or look it up from subscription.
    # Dashboard uses sync_checkout_session which syncs both subscription AND charge,
    # so the charge should always exist by now.
    pay_charge = if pay_charge_id
      Pay::Charge.find_by(id: pay_charge_id)
    else
      pay_subscription.charges.order(created_at: :desc).first
    end

    # Charge is required - provides idempotency and audit trail.
    # If charge is nil, something went wrong with sync - retry will find it.
    return unless pay_charge

    # === IDEMPOTENCY CHECKS ===
    #
    # Primary check: one license per charge (most specific).
    # Each Stripe charge produces exactly one license.
    # The unique index on pay_charge_id is the database-level safety net.
    return if License.exists?(pay_charge_id: pay_charge.id)

    # Secondary check for initial subscriptions: prevent duplicates from webhook/redirect race.
    # Renewals skip this because they reuse subscription_id but create new licenses per charge.
    unless is_renewal
      return if License.exists?(user_id: user.id, pay_subscription_id: pay_subscription.id)
    end

    # Generate the license
    LicenseGeneratorService.new(user).generate_paid_license!(
      pay_subscription,
      pay_charge
    )
  end
end
