module Api
  class PayTablesController < ApplicationController
    skip_forgery_protection

    def index
      render json: {
        customers: formatted_customers,
        subscriptions: formatted_subscriptions,
        charges: formatted_charges,
        payment_methods: formatted_payment_methods,
        webhooks: formatted_webhooks,
        webhook_logs: formatted_webhook_logs
      }
    end

    def show
      data = case params[:table]
             when "customers" then formatted_customers
             when "subscriptions" then formatted_subscriptions
             when "charges" then formatted_charges
             when "payment_methods" then formatted_payment_methods
             when "webhooks" then formatted_webhooks
             when "webhook_logs" then formatted_webhook_logs
             else
               return render json: { error: "Unknown table: #{params[:table]}" }, status: :not_found
             end

      render json: { data: data, table: params[:table] }
    end

    private

    def formatted_customers
      Pay::Customer.all.map do |c|
        {
          id: c.id,
          type: c.type,
          owner_type: c.owner_type,
          owner_id: c.owner_id,
          processor: c.processor,
          processor_id: c.processor_id,
          default: c.default,
          deleted_at: c.deleted_at,
          created_at: c.created_at,
          updated_at: c.updated_at,
          stripe_dashboard_url: c.processor_id ? "https://dashboard.stripe.com/test/customers/#{c.processor_id}" : nil
        }
      end
    end

    def formatted_subscriptions
      Pay::Subscription.all.includes(:customer).map do |s|
        {
          id: s.id,
          type: s.type,
          customer_id: s.customer_id,
          processor_id: s.processor_id,
          processor_plan: s.processor_plan,
          name: s.name,
          status: s.status,
          quantity: s.quantity,
          trial_ends_at: s.trial_ends_at,
          ends_at: s.ends_at,
          current_period_start: s.current_period_start,
          current_period_end: s.current_period_end,
          metered: s.metered,
          pause_starts_at: s.pause_starts_at,
          pause_resumes_at: s.pause_resumes_at,
          created_at: s.created_at,
          updated_at: s.updated_at,
          active: s.active?,
          on_trial: s.on_trial?,
          on_grace_period: s.on_grace_period?,
          stripe_dashboard_url: s.processor_id ? "https://dashboard.stripe.com/test/subscriptions/#{s.processor_id}" : nil
        }
      end
    end

    def formatted_charges
      Pay::Charge.all.includes(:customer).map do |c|
        {
          id: c.id,
          type: c.type,
          customer_id: c.customer_id,
          subscription_id: c.subscription_id,
          processor_id: c.processor_id,
          amount: c.amount,
          amount_formatted: format_cents(c.amount, c.currency),
          currency: c.currency,
          amount_refunded: c.amount_refunded,
          created_at: c.created_at,
          updated_at: c.updated_at,
          stripe_dashboard_url: c.processor_id ? "https://dashboard.stripe.com/test/payments/#{c.processor_id}" : nil
        }
      end
    end

    def formatted_payment_methods
      Pay::PaymentMethod.all.includes(:customer).map do |pm|
        {
          id: pm.id,
          type: pm.type,
          customer_id: pm.customer_id,
          processor_id: pm.processor_id,
          payment_method_type: pm.payment_method_type,
          default: pm.default,
          data: pm.data,
          created_at: pm.created_at,
          updated_at: pm.updated_at
        }
      end
    end

    def formatted_webhooks
      Pay::Webhook.order(created_at: :desc).limit(50).map do |w|
        {
          id: w.id,
          processor: w.processor,
          event_type: w.event_type,
          event: w.event,
          created_at: w.created_at
        }
      end
    end

    def formatted_webhook_logs
      WebhookLog.recent.limit(50).map do |wl|
        {
          id: wl.id,
          event_type: wl.event_type,
          payload: wl.payload,
          db_snapshot_before: wl.db_snapshot_before,
          db_snapshot_after: wl.db_snapshot_after,
          changes_summary: wl.changes_summary,
          created_at: wl.created_at
        }
      end
    end

    def format_cents(amount, currency = "usd")
      return "$0.00" unless amount
      Money.new(amount, currency).format
    rescue
      "$#{'%.2f' % (amount / 100.0)}"
    end
  end
end
