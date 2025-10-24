"use client"

export function ProfileStats() {
  const stats = [
    { label: "Tickets Owned", value: "3", color: "blue" },
    { label: "Total Spent", value: "₹5,300", color: "purple" },
    { label: "Auctions Won", value: "2", color: "green" },
    { label: "Rewards Earned", value: "₹550", color: "orange" },
  ]

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {stats.map((stat, i) => {
        const colorClasses = {
          blue: "bg-blue-50 border-blue-200 text-blue-600",
          purple: "bg-purple-50 border-purple-200 text-purple-600",
          green: "bg-green-50 border-green-200 text-green-600",
          orange: "bg-orange-50 border-orange-200 text-orange-600",
        }

        return (
          <div key={i} className={`border rounded-xl p-6 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
            <p className="text-sm font-medium opacity-75 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        )
      })}
    </div>
  )
}
