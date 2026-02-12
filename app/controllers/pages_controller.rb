class PagesController < ApplicationController
  def home
    @quarterly_price_id = ENV["STRIPE_QUARTERLY_PRICE_ID"]
    @annual_price_id = ENV["STRIPE_ANNUAL_PRICE_ID"]
    @subscription = current_user&.payment_processor&.subscription
  end
end
