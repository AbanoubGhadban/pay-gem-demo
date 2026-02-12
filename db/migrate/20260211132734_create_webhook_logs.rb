class CreateWebhookLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :webhook_logs do |t|
      t.string :event_type
      t.jsonb :payload
      t.jsonb :db_snapshot_before
      t.jsonb :db_snapshot_after
      t.bigint :pay_webhook_id

      t.timestamps
    end
  end
end
