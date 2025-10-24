"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Gavel } from "lucide-react"

interface Auction {
  id: string
  ticketId: string
  eventName: string
  ticketClass: string
  originalPrice: number
  biddingEndTime: string
  bidsCount: number
  highestBid: number
  status: "active" | "ended" | "sold"
  seller: string
}

interface AuctionCardProps {
  auction: Auction
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState("")
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const endTime = new Date(auction.biddingEndTime).getTime()
      const distance = endTime - now

      if (distance < 0) {
        setTimeLeft("Ended")
        setIsEnded(true)
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [auction.biddingEndTime])

  const priceIncrease = auction.highestBid - auction.originalPrice
  const percentageIncrease = ((priceIncrease / auction.originalPrice) * 100).toFixed(1)

  return (
    <div
      className={`rounded-xl overflow-hidden border-2 transition ${
        isEnded ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-white hover:shadow-lg"
      }`}
    >
      {/* Status Badge */}
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
            isEnded ? "bg-gray-200 text-gray-700" : "bg-green-200 text-green-700"
          }`}
        >
          {isEnded ? "Ended" : "Active"}
        </div>
        <Gavel size={48} className={isEnded ? "text-gray-400" : "text-blue-600"} />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-bold text-blue-900 mb-1 line-clamp-2">{auction.eventName}</h3>
        <p className="text-sm text-gray-600 mb-4">{auction.ticketClass}</p>

        {/* Bid Info */}
        <div className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Highest Bid</span>
            <span className="font-bold text-lg text-blue-600">₹{auction.highestBid}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Original Price</span>
            <span className="text-sm text-gray-500 line-through">₹{auction.originalPrice}</span>
          </div>
          {priceIncrease > 0 && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <TrendingUp size={16} />+{percentageIncrease}% increase
            </div>
          )}
        </div>

        {/* Bids Count */}
        <p className="text-xs text-gray-600 mb-4">{auction.bidsCount} bids placed</p>

        {/* Timer */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-orange-50 rounded-lg border border-orange-100">
          <Clock size={16} className="text-orange-600" />
          <span className={`text-sm font-semibold ${isEnded ? "text-gray-600" : "text-orange-600"}`}>{timeLeft}</span>
        </div>

        {/* Action Button */}
        <Button
          disabled={isEnded}
          className={`w-full font-semibold py-2 ${
            isEnded ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isEnded ? "Auction Ended" : "Place Bid"}
        </Button>
      </div>
    </div>
  )
}
