Rails.application.routes.draw do
  root "pages#home"

  # Checkout flow
  post "checkout", to: "checkout#create"
  get "checkout/success", to: "checkout#success"
  get "checkout/cancel", to: "checkout#cancel"

  # Account & Billing
  get "account", to: "account#show"
  get "billing", to: "billing#show"

  # Educational pages (React on Rails)
  get "explorer", to: "explorer#index"
  get "lifecycle", to: "lifecycle#index"

  # API endpoints for React components
  namespace :api do
    get "pay_tables", to: "pay_tables#index"
    get "pay_tables/:table", to: "pay_tables#show", as: :pay_table
    get "stripe_sync", to: "stripe_sync#show"
    post "lifecycle/:action_name", to: "lifecycle#perform", as: :lifecycle_action
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
