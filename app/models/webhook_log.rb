class WebhookLog < ApplicationRecord
  belongs_to :pay_webhook, class_name: "Pay::Webhook", optional: true

  validates :event_type, presence: true

  scope :recent, -> { order(created_at: :desc) }

  def changes_summary
    return {} unless db_snapshot_before.present? && db_snapshot_after.present?

    changes = {}
    db_snapshot_after.each do |table, after_data|
      before_data = db_snapshot_before[table] || []
      if after_data != before_data
        changes[table] = { before_count: before_data.length, after_count: after_data.length }
      end
    end
    changes
  end
end
