class User < ApplicationRecord
  pay_customer default_payment_processor: :stripe

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
end
