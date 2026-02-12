class CreateLicenses < ActiveRecord::Migration[7.2]
  def change
    create_table :licenses do |t|
      t.references :user, null: false, foreign_key: true
      t.string :license_id, null: false
      t.string :key, null: false
      t.string :plan, null: false
      t.string :status, null: false, default: "active"
      t.datetime :issued_at, null: false
      t.datetime :expires_at, null: false
      t.bigint :pay_subscription_id
      t.bigint :pay_charge_id

      t.timestamps
    end

    # Primary idempotency key: one license per charge
    add_index :licenses, :pay_charge_id, unique: true
    # Unique license IDs
    add_index :licenses, :license_id, unique: true
    # Fast lookup by user + status
    add_index :licenses, [:user_id, :status]
    # Fast lookup by subscription
    add_index :licenses, :pay_subscription_id
    # Expiration queries
    add_index :licenses, :expires_at

    add_foreign_key :licenses, :pay_subscriptions, on_delete: :nullify
    add_foreign_key :licenses, :pay_charges, on_delete: :nullify
  end
end
