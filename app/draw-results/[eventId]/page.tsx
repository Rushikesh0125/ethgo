"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Download, Share2 } from "lucide-react"
import { useParams } from "next/navigation"

interface DrawResult {
  userId: string
  userName: string
  poolClass: string
  ticketPrice: number
  isWinner: boolean
  ticketId?: string
  refundAmount?: number
  bonusReward?: number
}

export default function EventResultsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [results, setResults] = useState<DrawResult[]>([])
  const [userResult, setUserResult] = useState<DrawResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching event results
    const timer = setTimeout(() => {
      const mockResults: DrawResult[] = [
        {
          userId: "user1",
          userName: "Alex Johnson",
          poolClass: "Class A",
          ticketPrice: 2500,
          isWinner: true,
          ticketId: "TKT-2025-001-A-12345",
        },
        {
          userId: "user2",
          userName: "Sarah Smith",
          poolClass: "Class B",
          ticketPrice: 5000,
          isWinner: true,
          ticketId: "TKT-2025-001-B-12346",
        },
        {
          userId: "user3",
          userName: "You",
          poolClass: "Class C",
          ticketPrice: 10000,
          isWinner: false,
          refundAmount: 10000,
          bonusReward: 1500,
        },
        {
          userId: "user4",
          userName: "Mike Chen",
          poolClass: "Class A",
          ticketPrice: 2500,
          isWinner: false,
          refundAmount: 2500,
          bonusReward: 375,
        },
      ]

      setResults(mockResults)
      setUserResult(mockResults.find((r) => r.userName === "You") || null)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/draw-results" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft size={20} /> Back to Results
          </Link>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Coldplay Concert 2025 - Results</h1>
          <p className="text-gray-600">Draw Date: March 1, 2025 at 5:30 PM</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading results...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* User's Result */}
            {userResult && (
              <div className="lg:col-span-1">
                <div
                  className={`rounded-xl p-8 text-center ${
                    userResult.isWinner
                      ? "bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300"
                      : "bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300"
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      userResult.isWinner ? "bg-green-200" : "bg-blue-200"
                    }`}
                  >
                    <span className="text-3xl">{userResult.isWinner ? "🎉" : "🎁"}</span>
                  </div>

                  <h3 className={`text-2xl font-bold mb-2 ${userResult.isWinner ? "text-green-900" : "text-blue-900"}`}>
                    {userResult.isWinner ? "You Won!" : "Better Luck Next Time"}
                  </h3>

                  {userResult.isWinner ? (
                    <div>
                      <p className="text-gray-600 mb-4">Your Ticket ID</p>
                      <p className="font-mono text-sm font-bold text-green-900 mb-6 break-all">{userResult.ticketId}</p>
                      <div className="space-y-2">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <Download size={18} className="mr-2" /> Download Ticket
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-green-300 text-green-600 hover:bg-green-50 bg-transparent"
                        >
                          <Share2 size={18} className="mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-4">You didn't get the ticket, but...</p>
                      <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-2">Refund Amount</p>
                        <p className="text-2xl font-bold text-blue-900">₹{userResult.refundAmount}</p>
                      </div>
                      <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-2">Bonus Reward</p>
                        <p className="text-2xl font-bold text-green-600">+₹{userResult.bonusReward}</p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Total: ₹{(userResult.refundAmount || 0) + (userResult.bonusReward || 0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Results */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-blue-900 mb-6">All Participants</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      result.isWinner ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{result.userName}</p>
                        <p className="text-sm text-gray-600">
                          {result.poolClass} • ₹{result.ticketPrice}
                        </p>
                      </div>
                      <div className="text-right">
                        {result.isWinner ? (
                          <div>
                            <p className="text-sm font-bold text-green-600">✓ Winner</p>
                            <p className="text-xs text-gray-600">{result.ticketId}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-gray-600">Not Selected</p>
                            <p className="text-xs text-green-600">+₹{result.bonusReward}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
