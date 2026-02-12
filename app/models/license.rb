class License < ApplicationRecord
  belongs_to :user
  belongs_to :pay_subscription, class_name: "Pay::Subscription", optional: true
  belongs_to :pay_charge, class_name: "Pay::Charge", optional: true

  validates :license_id, presence: true, uniqueness: true
  validates :key, presence: true
  validates :plan, presence: true, inclusion: { in: %w[quarterly annual] }
  validates :status, presence: true, inclusion: { in: %w[active expired cancelled] }
  validates :issued_at, presence: true
  validates :expires_at, presence: true
  validates :pay_charge_id, uniqueness: true, allow_nil: true

  scope :active, -> { where(status: "active") }
  scope :expired, -> { where("expires_at < ?", Time.current) }

  # Orders licenses by status priority: active > cancelled > expired
  # Used to find the "best" license to display on dashboard
  # Note: Arel.sql is safe here - all values are hardcoded, no user input
  scope :by_status_priority, -> {
    order(
      Arel.sql("CASE status WHEN 'active' THEN 0 WHEN 'cancelled' THEN 1 WHEN 'expired' THEN 2 ELSE 3 END"),
      created_at: :desc
    )
  }

  def to_param
    license_id
  end
end
