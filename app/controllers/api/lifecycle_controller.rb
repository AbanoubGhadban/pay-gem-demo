module Api
  class LifecycleController < ApplicationController
    skip_forgery_protection

    def perform
      action = params[:action_name]
      processor = current_user.payment_processor
      subscription = processor&.subscription

      before_state = snapshot_state(processor, subscription)

      result = case action
               when "subscribe"
                 handle_subscribe(processor)
               when "cancel"
                 handle_cancel(subscription)
               when "resume"
                 handle_resume(subscription)
               when "swap_plan"
                 handle_swap(subscription)
               when "cancel_immediately"
                 handle_cancel_immediately(subscription)
               else
                 { error: "Unknown action: #{action}" }
               end

      if result[:error]
        render json: result, status: :unprocessable_entity
        return
      end

      # Reload to get fresh state
      subscription&.reload
      processor&.reload
      after_state = snapshot_state(processor, processor&.subscription)

      render json: {
        action: action,
        result: result,
        before: before_state,
        after: after_state
      }
    end

    private

    def handle_subscribe(processor)
      price_id = params[:price_id] || ENV["STRIPE_QUARTERLY_PRICE_ID"]

      checkout_session = processor.checkout(
        mode: "subscription",
        line_items: [{ price: price_id, quantity: 1 }],
        success_url: "#{request.base_url}/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "#{request.base_url}/checkout/cancel"
      )

      { checkout_url: checkout_session.url, method_called: "payment_processor.checkout(mode: 'subscription')" }
    end

    def handle_cancel(subscription)
      return { error: "No active subscription to cancel" } unless subscription&.active?

      subscription.cancel
      {
        method_called: "subscription.cancel",
        explanation: "Sets ends_at to current_period_end. Subscription stays active until period ends.",
        expected_webhooks: ["customer.subscription.updated"]
      }
    end

    def handle_resume(subscription)
      return { error: "No cancelled subscription to resume" } unless subscription&.on_grace_period?

      subscription.resume
      {
        method_called: "subscription.resume",
        explanation: "Clears ends_at. Subscription will auto-renew at period end.",
        expected_webhooks: ["customer.subscription.updated"]
      }
    end

    def handle_swap(subscription)
      return { error: "No active subscription to swap" } unless subscription&.active?

      current_price = subscription.processor_plan
      quarterly_price = ENV["STRIPE_QUARTERLY_PRICE_ID"]
      annual_price = ENV["STRIPE_ANNUAL_PRICE_ID"]
      new_price = current_price == quarterly_price ? annual_price : quarterly_price

      subscription.swap(new_price)
      {
        method_called: "subscription.swap('#{new_price}')",
        explanation: "Changes the price/plan. Stripe prorates by default.",
        expected_webhooks: ["customer.subscription.updated", "invoice.payment_succeeded"],
        old_price: current_price,
        new_price: new_price
      }
    end

    def handle_cancel_immediately(subscription)
      return { error: "No active subscription to cancel" } unless subscription&.active? || subscription&.on_grace_period?

      subscription.cancel_now!
      {
        method_called: "subscription.cancel_now!",
        explanation: "Immediately cancels. No grace period. ends_at set to now.",
        expected_webhooks: ["customer.subscription.deleted"]
      }
    end

    def snapshot_state(processor, subscription)
      return {} unless processor

      user = processor.owner
      license = user.current_license

      {
        customer: {
          processor_id: processor.processor_id,
          default: processor.default
        },
        subscription: subscription ? {
          id: subscription.id,
          processor_id: subscription.processor_id,
          status: subscription.status,
          processor_plan: subscription.processor_plan,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          ends_at: subscription.ends_at,
          active: subscription.active?,
          on_trial: subscription.on_trial?,
          on_grace_period: subscription.on_grace_period?
        } : nil,
        license: license ? {
          id: license.id,
          license_id: license.license_id,
          plan: license.plan,
          status: license.status,
          expires_at: license.expires_at
        } : nil,
        charges_count: processor.charges.count,
        payment_methods_count: processor.payment_methods.count,
        licenses_count: user.licenses.count
      }
    end
  end
end
