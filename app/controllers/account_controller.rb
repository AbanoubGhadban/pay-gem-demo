class AccountController < ApplicationController
  def show
    @user = current_user
    @payment_processor = @user.payment_processor
    @subscription = @payment_processor&.subscription
    @charges = @payment_processor&.charges&.order(created_at: :desc) || []
  end
end
