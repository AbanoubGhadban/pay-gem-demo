class ApplicationController < ActionController::Base
  allow_browser versions: :modern

  private

  def current_user
    @current_user ||= User.first
  end
  helper_method :current_user
end
