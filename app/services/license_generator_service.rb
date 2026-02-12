# Service for generating software licenses linked to Pay subscriptions.
#
# This service creates license records in the database, linked to users,
# subscriptions, and charges. It handles plan detection from the Stripe
# price ID and expires previous licenses atomically.
#
# Usage:
#   LicenseGeneratorService.new(user).generate_paid_license!(pay_subscription, pay_charge)
#
class LicenseGeneratorService
  def initialize(user)
    @user = user
  end

  # Generate a license for a paid subscription
  # @param pay_subscription [Pay::Subscription] the Pay subscription record
  # @param pay_charge [Pay::Charge] the Pay charge record (required for idempotency)
  def generate_paid_license!(pay_subscription, pay_charge)
    plan = plan_from_subscription(pay_subscription)
    duration = duration_for_plan(plan)

    issued_at = Time.current
    expires_at = issued_at + duration
    license_id = generate_license_id
    key = generate_license_key

    # Wrap in transaction to ensure atomicity:
    # - New license creation and old license expiration must succeed together
    # - If either fails, both are rolled back to prevent inconsistent state
    ActiveRecord::Base.transaction do
      license = @user.licenses.create!(
        license_id: license_id,
        pay_subscription: pay_subscription,
        pay_charge: pay_charge,
        key: key,
        plan: plan,
        status: "active",
        issued_at: issued_at,
        expires_at: expires_at
      )

      # Mark all previous licenses as expired
      @user.licenses.where.not(id: license.id).update_all(status: "expired")

      license
    end
  end

  private

  # Detect plan from Stripe price ID
  def plan_from_subscription(pay_subscription)
    price_id = pay_subscription.processor_plan
    quarterly_price_id = ENV["STRIPE_QUARTERLY_PRICE_ID"]
    annual_price_id = ENV["STRIPE_ANNUAL_PRICE_ID"]

    case price_id
    when quarterly_price_id then "quarterly"
    when annual_price_id then "annual"
    else
      raise ArgumentError, "Unknown Stripe price ID: #{price_id}. " \
                           "Expected #{quarterly_price_id} (quarterly) or #{annual_price_id} (annual)"
    end
  end

  def duration_for_plan(plan)
    case plan
    when "quarterly" then 3.months
    when "annual" then 1.year
    end
  end

  # Generate Stripe-style prefixed ID: lic_<24 random chars>
  def generate_license_id
    loop do
      id = "lic_#{SecureRandom.alphanumeric(24)}"
      break id unless License.exists?(license_id: id)
    end
  end

  # Generate a human-readable license key: XXXX-XXXX-XXXX-XXXX
  def generate_license_key
    4.times.map { SecureRandom.alphanumeric(4).upcase }.join("-")
  end
end
