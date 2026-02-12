class CheckoutController < ApplicationController
  def create
    price_id = params[:price_id]
    unless price_id.present?
      redirect_to root_path, alert: "No plan selected"
      return
    end

    checkout_session = current_user.payment_processor.checkout(
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: checkout_success_url + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: checkout_cancel_url
    )

    redirect_to checkout_session.url, allow_other_host: true, status: :see_other
  end

  def success
    if params[:session_id].present?
      # Sync the checkout session to create local Pay records immediately
      # (webhooks will also arrive, but this ensures immediate data availability)
      Pay::Stripe.sync_checkout_session(params[:session_id])
    end

    redirect_to account_path, notice: "Subscription activated! Check the Explorer to see what happened in the database."
  end

  def cancel
    redirect_to root_path, notice: "Checkout cancelled. No charge was made."
  end

  private

  def checkout_success_url
    URI.join(request.base_url, "/checkout/success").to_s
  end

  def checkout_cancel_url
    URI.join(request.base_url, "/checkout/cancel").to_s
  end
end
