class LifecycleController < ApplicationController
  def index
    @subscription = current_user.payment_processor&.subscription
  end
end
