class User < ApplicationRecord
  pay_customer default_payment_processor: :stripe

  has_many :licenses, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true

  # Returns the user's current best license (active > cancelled > expired)
  def current_license
    licenses.by_status_priority.first
  end
end
