# Pay Gem + Stripe Educational Demo

An interactive Rails application for learning every concept of the [Pay gem](https://github.com/pay-rails/pay) with Stripe. The demo sells software licenses with quarterly ($29/quarter) and annual ($99/year) plans, demonstrating real-world patterns from a production app.

## Tech Stack

- Ruby 3.3+ / Rails 7.2
- PostgreSQL
- [Pay](https://github.com/pay-rails/pay) ~> 11 with [Stripe](https://stripe.com) ~> 18
- [React on Rails](https://github.com/shakacode/react_on_rails) ~> 15 with [Shakapacker](https://github.com/shakacode/shakapacker) ~> 8
- Tailwind CSS v4
- TypeScript

## What the Demo Does

### Stripe Checkout Flow
Subscribe to a plan via Stripe Checkout, then see how Pay syncs the data back to your Rails database. The account page shows your subscription status, charges, and generated license.

### Pay Explorer Dashboard
A 7-tab React dashboard that lets you inspect every Pay gem database table in real time:
- **Customers** — `Pay::Customer` records linked to your User model
- **Subscriptions** — `Pay::Subscription` with status, plan, period dates
- **Charges** — `Pay::Charge` with amount, currency, payment method details
- **Payment Methods** — `Pay::PaymentMethod` with card brand and last4
- **Webhooks** — Raw `Pay::Webhook` events as they arrive from Stripe
- **Data Flow** — Visual diagram of how data flows between Stripe and Pay
- **Stripe Sync** — Side-by-side comparison of local Pay records vs live Stripe API

### Lifecycle Demo
Interactive controls to execute subscription actions (cancel, resume, swap plan, cancel immediately) and see before/after state diffs showing exactly what changed in the database.

### Webhook Event Logger
Every Stripe webhook event is logged with database snapshots taken before and after processing, so you can see exactly what Pay changed in response to each event.

### License Generation (Production Pattern)
The core business logic demonstrates a production-grade pattern for fulfilling purchases via webhooks. See [Best Practices](#best-practices-demonstrated) below.

## Setup

### Prerequisites
- Ruby 3.3+, Node.js 18+, PostgreSQL
- A [Stripe account](https://dashboard.stripe.com/register) (test mode)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding

### 1. Install dependencies

```bash
bundle install
npm install
```

### 2. Configure Stripe

Create two subscription products in your [Stripe Dashboard](https://dashboard.stripe.com/test/products):
- **Quarterly** — $29/quarter (recurring)
- **Annual** — $99/year (recurring)

Copy the price IDs (`price_xxx`) for each.

### 3. Set environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:
```
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_PRIVATE_KEY=sk_test_...
STRIPE_SIGNING_SECRET=whsec_...
STRIPE_QUARTERLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
```

### 4. Set up the database

```bash
bin/rails db:create db:migrate db:seed
```

### 5. Start the Stripe CLI webhook forwarder

```bash
stripe listen --forward-to localhost:3000/pay/webhooks/stripe
```

Copy the webhook signing secret (`whsec_...`) to your `.env` file.

### 6. Start the app

```bash
bin/dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Test Cards

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Payment declined |

Use any future expiry date and any 3-digit CVC.

## Best Practices Demonstrated

### 1. Webhook Handlers + Background Jobs for Fulfillment

**Don't** use `after_create` callbacks on Pay models to fulfill purchases. Pay models are internal to the gem and their lifecycle may change between versions.

**Do** use Pay's public webhook delegation API:

```ruby
# config/initializers/pay.rb
ActiveSupport.on_load(:pay) do
  Pay::Webhooks.delegator.subscribe "stripe.checkout.session.completed", GeneratePaidLicenseHandler.new
  Pay::Webhooks.delegator.subscribe "stripe.charge.succeeded", RenewLicenseHandler.new
  Pay::Webhooks.delegator.subscribe "stripe.customer.subscription.deleted", CancelLicenseHandler.new
end
```

This is Pay's public API for extending webhook handling. Your handlers run **after** Pay has already synced the data to the database.

### 2. Dual-Path License Generation (Sync + Async)

When a user completes checkout, two things happen in parallel:
- **Redirect path**: `CheckoutController#success` calls `Pay::Stripe.sync_checkout_session` then runs `GeneratePaidLicenseJob.perform_now` (synchronous) so the user sees their license immediately.
- **Webhook path**: Stripe sends `checkout.session.completed` which enqueues `GeneratePaidLicenseJob.perform_later` (asynchronous) for reliability.

Both paths call the same job. The job's idempotency checks ensure exactly one license is created regardless of which path runs first or if both run.

### 3. Charge-Based Idempotency for License Generation

The `GeneratePaidLicenseJob` uses a 3-layer defense against duplicate licenses:

```ruby
# Layer 1: One license per charge (most specific)
return if License.exists?(pay_charge_id: pay_charge.id)

# Layer 2: One license per subscription for initial purchase
# (skipped for renewals, which reuse the same subscription)
unless is_renewal
  return if License.exists?(user_id: user.id, pay_subscription_id: pay_subscription.id)
end

# Layer 3: Database unique index on pay_charge_id (safety net)
```

**Why `pay_charge_id`?** Each Stripe charge maps 1:1 to a payment event. The unique index on `pay_charge_id` is the database-level safety net that prevents duplicates even under race conditions.

### 4. Separate Concerns: Handler -> Job -> Service

```
Webhook Event
  -> Handler (routing: which event? enqueue the right job)
    -> Job (reliability: retries, idempotency checks)
      -> Service (business logic: create license, expire old ones)
```

- **Handlers** are thin — they extract IDs from the event and enqueue a job
- **Jobs** handle retries (`retry_on StandardError, wait: :polynomially_longer, attempts: 5`) and idempotency
- **Services** contain the actual business logic, wrapped in a transaction

### 5. Atomic License Rotation

When a new license is created (initial or renewal), the old one must be expired atomically:

```ruby
ActiveRecord::Base.transaction do
  license = @user.licenses.create!(...)
  @user.licenses.where.not(id: license.id).update_all(status: "expired")
end
```

If either operation fails, both are rolled back.

### 6. Renewal Handling via `billing_reason`

Stripe doesn't have a "subscription renewed" event. The `RenewLicenseHandler` subscribes to `charge.succeeded` and filters for renewals:

```ruby
def call(event)
  pay_charge = Pay::Charge.find_by_processor_and_id("stripe", event.data.object.id)
  invoice = pay_charge.stripe_invoice
  return unless invoice&.billing_reason == "subscription_cycle"
  # ... generate renewal license
end
```

The `is_renewal: true` flag tells the job to skip the subscription-level idempotency check, since renewals reuse the same subscription ID but should create a new license per charge.

### 7. Understanding Pay's 4 Sync Mechanisms

Pay keeps your local database in sync with Stripe through four mechanisms:

| Mechanism | When | How |
|---|---|---|
| **Webhooks** (async) | Stripe sends events to `/pay/webhooks/stripe` | `Pay::Webhooks::ProcessJob` calls `.sync` on the relevant model |
| **Redirect Sync** (immediate) | After Stripe Checkout redirect | `Pay::Stripe.sync_checkout_session(session_id)` syncs subscription + charge |
| **Inline Sync** (during actions) | When you call `subscription.cancel`, `.swap`, `.resume` | Pay calls the Stripe API then immediately syncs the response |
| **Auto Customer Sync** (on save) | When your User model's email changes | Pay updates the Stripe customer email automatically |

The redirect sync exists because webhooks may arrive seconds after the user is redirected. Calling `sync_checkout_session` on the success page ensures the user sees their subscription immediately.

## Project Structure

```
app/
├── controllers/
│   ├── checkout_controller.rb    # Stripe Checkout session + success handling
│   ├── account_controller.rb     # Subscription & license display
│   ├── billing_controller.rb     # Redirect to Stripe billing portal
│   └── api/
│       ├── pay_tables_controller.rb   # JSON for all Pay tables
│       ├── stripe_sync_controller.rb  # Local vs Stripe comparison
│       └── lifecycle_controller.rb    # Subscription action executor
├── models/
│   ├── user.rb                   # pay_customer + has_many :licenses
│   └── license.rb                # Belongs to user, pay_subscription, pay_charge
├── jobs/
│   └── generate_paid_license_job.rb  # Idempotent license generation
├── services/
│   └── license_generator_service.rb  # License creation business logic
├── webhooks/
│   ├── generate_paid_license_handler.rb  # checkout.session.completed
│   ├── renew_license_handler.rb          # charge.succeeded (renewals)
│   ├── cancel_license_handler.rb         # customer.subscription.deleted
│   └── webhook_logger.rb                 # Educational event logger
└── javascript/src/
    ├── PayExplorer/               # 7-tab dashboard React app
    ├── LifecycleDemo/             # Interactive subscription controls
    └── shared/                    # Reusable components
```

## License

This project is for educational purposes.
