"use client"

import { Calendar, Gavel, Ticket, TrendingUp } from "lucide-react"

export function ActivityHistory() {
  const activities = [
    {
      type: "purchase",
      title: "Purchased Ticket",
      description: "Summer Music Festival 2025 - Class B",
      amount: "₹1,000",
      date: "2025-01-15",
      icon: Ticket,
    },
    {
      type: "bid",
      title: "Placed Bid",
      description: "Tech Conference 2025 - Auction #2",
      amount: "₹450",
      date: "2025-01-12",
      icon: Gavel,
    },
    {
      type: "resale",
      title: "Ticket Sold",
      description: "Sports Championship Final - Class C",
      amount: "+₹4,200",
      date: "2025-01-08",
      icon: TrendingUp,
    },
    {
      type: "reward",
      title: "Reward Received",
      description: "Non-winner bonus from Tech Conference",
      amount: "+₹50",
      date: "2025-01-05",
      icon: Calendar,
    },
  ]

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6">
      <h3 className="text-xl font-bold text-blue-900 mb-6">Activity Timeline</h3>
      <div className="space-y-4">
        {activities.map((activity, i) => {
          const Icon = activity.icon
          const isIncome = activity.amount.startsWith("+")

          return (
            <div
              key={i}
              className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${isIncome ? "text-green-600" : "text-blue-600"}`}>{activity.amount}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
