puts "Seeding demo user..."
User.find_or_create_by!(email: "demo@example.com") do |user|
  user.name = "Demo User"
end
puts "Done! Demo user: #{User.first.email}"
