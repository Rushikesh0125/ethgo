"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, Download, Share2 } from "lucide-react"

interface DrawResult {
  eventId: string
  eventName: string
  poolClass: string
  ticketPrice: number
  drawDate: string
  isWinner: boolean
  ticketId?: string
}

interface WinnerCardProps {
  result: DrawResult
}

export function WinnerCard({ result }: WinnerCardProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8">
      <div className="flex items-start gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircle size={32} className="text-green-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-green-900 mb-2">Congratulations! You Won!</h3>
          <p className="text-green-700 font-medium mb-4">Your ticket has been allocated in the lottery draw.</p>

          {/* Event Details */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-green-100">
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
                <p className="text-sm text-gray-600 font-medium">Ticket ID</p>
                <p className="text-sm font-mono text-blue-600">{result.ticketId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Draw Date</p>
                <p className="text-lg font-bold text-blue-900">
                  {new Date(result.drawDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              <Download size={18} />
              Download Ticket
            </Button>
            <Button
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50 bg-transparent flex items-center gap-2"
            >
              <Share2 size={18} />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
