"use client"

import { Button } from "@/components/ui/button"
import { Gift, TrendingUp } from "lucide-react"

interface DrawResult {
  eventId: string
  eventName: string
  poolClass: string
  ticketPrice: number
  drawDate: string
  isWinner: boolean
  refundAmount?: number
  bonusReward?: number
}

interface LoserCardProps {
  result: DrawResult
}

export function LoserCard({ result }: LoserCardProps) {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-8">
      <div className="flex items-start gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-orange-100">
            <Gift size={32} className="text-orange-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-orange-900 mb-2">Better Luck Next Time!</h3>
          <p className="text-orange-700 font-medium mb-4">
            You weren't selected in this draw, but don't worry—you're getting rewarded anyway!
          </p>

          {/* Event Details */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">Event</p>
                <p className="text-lg font-bold text-blue-900">{result.eventName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Ticket Class</p>
                <p className="text-lg font-bold text-blue-900">{result.poolClass}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Refund Amount</p>
                <p className="text-lg font-bold text-green-600">₹{result.refundAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Bonus Reward</p>
                <p className="text-lg font-bold text-green-600">+ ₹{result.bonusReward}</p>
              </div>
            </div>
          </div>

          {/* Reward Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-green-600" />
              <p className="font-bold text-green-900">Total Reward</p>
            </div>
            <p className="text-3xl font-bold text-green-600">
              ₹{(result.refundAmount || 0) + (result.bonusReward || 0)}
            </p>
            <p className="text-sm text-green-700 mt-2">
              Your stake has been returned plus a bonus reward from platform fees!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Claim Reward</Button>
            <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent">
              Try Another Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
