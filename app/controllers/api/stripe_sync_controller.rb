module Api
  class StripeSyncController < ApplicationController
    skip_forgery_protection

    def show
      processor = current_user.payment_processor
      unless processor&.processor_id
        render json: { error: "No Stripe customer found. Subscribe first!" }
        return
      end

      comparison = build_comparison(processor)
      render json: comparison
    rescue Stripe::AuthenticationError => e
      render json: { error: "Stripe API key not configured: #{e.message}" }, status: :service_unavailable
    rescue Stripe::StripeError => e
      render json: { error: "Stripe API error: #{e.message}" }, status: :bad_gateway
    end

    private

    def build_comparison(processor)
      stripe_customer = Stripe::Customer.retrieve(processor.processor_id)

      stripe_subscriptions = Stripe::Subscription.list(customer: processor.processor_id).data
      local_subscriptions = processor.subscriptions

      stripe_charges = Stripe::PaymentIntent.list(customer: processor.processor_id, limit: 10).data
      local_charges = processor.charges.order(created_at: :desc).limit(10)

      stripe_payment_methods = Stripe::PaymentMethod.list(customer: processor.processor_id, type: "card").data
      local_payment_methods = processor.payment_methods

      {
        customer: {
          local: {
            id: processor.id,
            processor_id: processor.processor_id,
            type: processor.type,
            default: processor.default,
            created_at: processor.created_at
          },
          stripe: {
            id: stripe_customer.id,
            email: stripe_customer.email,
            name: stripe_customer.name,
            created: Time.at(stripe_customer.created).iso8601,
            currency: stripe_customer.currency,
            delinquent: stripe_customer.delinquent
          }
        },
        subscriptions: {
          local: local_subscriptions.map { |s| serialize_local_subscription(s) },
          stripe: stripe_subscriptions.map { |s| serialize_stripe_subscription(s) }
        },
        charges: {
          local: local_charges.map { |c| serialize_local_charge(c) },
          stripe: stripe_charges.map { |c| serialize_stripe_charge(c) }
        },
        payment_methods: {
          local: local_payment_methods.map { |pm| serialize_local_payment_method(pm) },
          stripe: stripe_payment_methods.map { |pm| serialize_stripe_payment_method(pm) }
        }
      }
    end

    def serialize_local_subscription(s)
      {
        id: s.id,
        processor_id: s.processor_id,
        processor_plan: s.processor_plan,
        status: s.status,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        ends_at: s.ends_at
      }
    end

    def serialize_stripe_subscription(s)
      {
        id: s.id,
        status: s.status,
        plan_id: s.items.data.first&.price&.id,
        current_period_start: Time.at(s.current_period_start).iso8601,
        current_period_end: Time.at(s.current_period_end).iso8601,
        cancel_at_period_end: s.cancel_at_period_end,
        cancel_at: s.cancel_at ? Time.at(s.cancel_at).iso8601 : nil
      }
    end

    def serialize_local_charge(c)
      {
        id: c.id,
        processor_id: c.processor_id,
        amount: c.amount,
        currency: c.currency,
        created_at: c.created_at
      }
    end

    def serialize_stripe_charge(pi)
      {
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        created: Time.at(pi.created).iso8601
      }
    end

    def serialize_local_payment_method(pm)
      {
        id: pm.id,
        processor_id: pm.processor_id,
        payment_method_type: pm.payment_method_type,
        default: pm.default
      }
    end

    def serialize_stripe_payment_method(pm)
      {
        id: pm.id,
        type: pm.type,
        card: pm.card ? { brand: pm.card.brand, last4: pm.card.last4, exp_month: pm.card.exp_month, exp_year: pm.card.exp_year } : nil
      }
    end
  end
end
