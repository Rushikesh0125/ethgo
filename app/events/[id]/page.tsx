"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { ChevronLeft, Loader2, Clock } from "lucide-react"
import { getStoredWallet } from "@/lib/wallet-utils"
import { Button } from "@/components/ui/button"

interface Event {
  id: string
  name: string
  date: string
  location: string
  image: string
  description: string
  pools: {
    name: string
    price: number
    totalTickets: number
    registeredUsers: number
  }[]
}

interface DrawResult {
  walletAddress: string
  poolName: string
  won: boolean
  refund?: number
  bonus?: number
  ticketId?: string
}

const mockDrawResults: Record<string, DrawResult[]> = {
  "1": [
    { walletAddress: "0x1234...5678", poolName: "Pool A", won: true, ticketId: "TICKET-001" },
    { walletAddress: "0x2345...6789", poolName: "Pool B", won: true, ticketId: "TICKET-002" },
    { walletAddress: "0x3456...7890", poolName: "Pool A", won: false, refund: 0.5, bonus: 0.1 },
    { walletAddress: "0x4567...8901", poolName: "Pool C", won: true, ticketId: "TICKET-003" },
    { walletAddress: "0x5678...9012", poolName: "Pool B", won: false, refund: 1.0, bonus: 0.2 },
    { walletAddress: "0x6789...0123", poolName: "Pool A", won: false, refund: 0.5, bonus: 0.1 },
    { walletAddress: "0x7890...1234", poolName: "Pool C", won: false, refund: 2.0, bonus: 0.4 },
  ],
  "2": [
    { walletAddress: "0x8901...2345", poolName: "Pool A", won: true, ticketId: "TICKET-004" },
    { walletAddress: "0x9012...3456", poolName: "Pool B", won: false, refund: 0.6, bonus: 0.12 },
  ],
  "3": [
    { walletAddress: "0xabcd...efgh", poolName: "Pool A", won: true, ticketId: "TICKET-005" },
    { walletAddress: "0xbcde...fghi", poolName: "Pool B", won: true, ticketId: "TICKET-006" },
  ],
}

const mockEvents: Record<string, Event> = {
  "1": {
    id: "1",
    name: "Coldplay Concert 2025",
    date: "Mar 16, 2025 - 12:30 AM",
    location: "Wankhede Stadium, Mumbai",
    image: "/music-festival-stage.png",
    description:
      "Experience an unforgettable night with Coldplay live in concert. Get ready for an amazing show featuring all their greatest hits and new music.",
    pools: [
      { name: "Pool A", price: 0.5, totalTickets: 5000, registeredUsers: 3201 },
      { name: "Pool B", price: 1.0, totalTickets: 2000, registeredUsers: 1501 },
      { name: "Pool C", price: 2.0, totalTickets: 1000, registeredUsers: 800 },
    ],
  },
  "2": {
    id: "2",
    name: "Tech Conference 2025",
    date: "2025-07-20",
    location: "San Francisco Convention Center",
    image: "/tech-conference.png",
    description: "Join industry leaders for the biggest tech conference of the year.",
    pools: [
      { name: "Pool A", price: 0.3, totalTickets: 200, registeredUsers: 120 },
      { name: "Pool B", price: 0.6, totalTickets: 150, registeredUsers: 85 },
      { name: "Pool C", price: 1.2, totalTickets: 100, registeredUsers: 60 },
    ],
  },
  "3": {
    id: "3",
    name: "Sports Championship Final",
    date: "2025-08-10",
    location: "Madison Square Garden",
    image: "/vibrant-sports-stadium.png",
    description: "Watch the most exciting sports championship final of the season.",
    pools: [
      { name: "Pool A", price: 0.8, totalTickets: 150, registeredUsers: 95 },
      { name: "Pool B", price: 1.5, totalTickets: 100, registeredUsers: 72 },
      { name: "Pool C", price: 3.0, totalTickets: 50, registeredUsers: 40 },
    ],
  },
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const event = mockEvents[params.id]
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [alreadyBid, setAlreadyBid] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showResults, setShowResults] = useState(false)
  const [showAlreadyBidModal, setShowAlreadyBidModal] = useState(false)

  useEffect(() => {
    const wallet = getStoredWallet()
    if (!wallet) {
      router.push("/")
    } else {
      // Check if user already bid for this event
      const userEntries = JSON.parse(localStorage.getItem("userEntries") || "{}")
      if (userEntries[event?.id]) {
        setAlreadyBid(true)
      }
      setIsLoading(false)
    }
  }, [router, event?.id])

  if (isLoading) {
    return <div className="min-h-screen bg-white" />
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
        </div>
      </div>
    )
  }

  const handlePoolSelect = async (poolName: string) => {
    if (alreadyBid) {
      setShowAlreadyBidModal(true)
      return
    }

    setSelectedPool(poolName)
    setIsProcessing(true)
    setTransactionStatus("pending")

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setTransactionStatus("success")

      const userEntries = JSON.parse(localStorage.getItem("userEntries") || "{}")
      userEntries[event.id] = {
        poolName,
        timestamp: new Date().toISOString(),
        eventName: event.name,
      }
      localStorage.setItem("userEntries", JSON.stringify(userEntries))
    } catch (error) {
      setTransactionStatus("error")
      setIsProcessing(false)
    }
  }

  if (transactionStatus === "success") {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={48} className="text-blue-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Entry Submitted Successfully!</h3>
            <p className="text-gray-600 mb-8 text-lg">
              You're in <span className="font-bold text-blue-600">{selectedPool}</span> for{" "}
              <span className="font-bold">{event.name}</span>
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-gray-700 font-semibold mb-2">Lucky Draw Countdown</p>
              <p className="text-3xl font-bold text-blue-600 mb-2">Draw is happening now!</p>
              <p className="text-gray-600">March 1, 2025 at 5:30 PM</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <p className="font-bold text-gray-900 mb-4">What happens next?</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-700">Wait for the lucky draw on Mar 1</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-700">Verifiable random selection will allocate tickets fairly</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-700">Check back for results - winners get tickets, others get rewards</p>
                </div>
              </div>
            </div>

            <Link href="/events">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">Back to Events</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {showAlreadyBidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-2xl font-bold text-orange-600 mb-2">Already Bid!</h3>
            <p className="text-gray-600 mb-6">
              You have already submitted an entry for this event. You cannot bid again for the same event.
            </p>
            <button
              onClick={() => setShowAlreadyBidModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/events" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium">
          <ChevronLeft size={20} />
          Back to Events
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="relative rounded-xl overflow-hidden h-96">
              <img src={event.image || "/placeholder.svg"} alt={event.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                OPEN FOR REGISTRATION
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{event.name}</h1>
            <p className="text-gray-600 mb-6 leading-relaxed">{event.description}</p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-lg">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-gray-600">Event Date</p>
                  <p className="font-semibold text-gray-900">{event.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-lg">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-gray-600">Venue</p>
                  <p className="font-semibold text-gray-900">{event.location}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-lg">ℹ️</span> How it works:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Select a ticket pool and stake the amount</li>
                <li>• Wait for the random draw on Mar 1</li>
                <li>• Winners get tickets, non-winners get stake + rewards</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-blue-50 rounded-xl p-6 sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Pool</h2>

              <div className="space-y-4">
                {event.pools.map((pool) => {
                  const availableTickets = pool.totalTickets - pool.registeredUsers
                  const fillPercentage = (pool.registeredUsers / pool.totalTickets) * 100

                  return (
                    <button
                      key={pool.name}
                      onClick={() => handlePoolSelect(pool.name)}
                      disabled={isProcessing || alreadyBid}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedPool === pool.name
                          ? "border-blue-600 bg-white"
                          : "border-blue-200 hover:border-blue-400 bg-white"
                      } ${(isProcessing || alreadyBid) && selectedPool !== pool.name ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{pool.name}</h3>
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded mt-1">
                            100% odds
                          </span>
                        </div>
                      </div>

                      <p className="text-2xl font-bold text-blue-600 mb-3">{pool.price} FLOW</p>

                      <ul className="text-sm text-gray-600 space-y-1 mb-3">
                        <li>• Standard seating</li>
                        <li>• General admission</li>
                        <li>• Digital ticket</li>
                      </ul>

                      <p className="text-xs text-gray-500 mb-2">
                        {pool.registeredUsers} / {pool.totalTickets} entries
                      </p>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-800 h-2 rounded-full transition-all"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => selectedPool && handlePoolSelect(selectedPool)}
                disabled={!selectedPool || isProcessing || alreadyBid}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing Transaction...
                  </>
                ) : (
                  "Confirm & Stake"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t-2 border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Draw Results</h2>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              {showResults ? "Hide Results" : "View Results"}
            </button>
          </div>

          {showResults && (
            <div className="space-y-4">
              {/* Winners Section */}
              <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                <h3 className="text-xl font-bold text-green-700 mb-4">🎉 Winners</h3>
                <div className="space-y-3">
                  {mockDrawResults[event?.id]
                    ?.filter((result) => result.won)
                    .map((result, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-lg border border-green-200 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{result.walletAddress}</p>
                          <p className="text-sm text-gray-600">
                            {result.poolName} • Ticket ID: {result.ticketId}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                          Won Ticket
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Non-Winners Section */}
              <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                <h3 className="text-xl font-bold text-blue-700 mb-4">💰 Non-Winners (Refund + Bonus)</h3>
                <div className="space-y-3">
                  {mockDrawResults[event?.id]
                    ?.filter((result) => !result.won)
                    .map((result, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-lg border border-blue-200 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{result.walletAddress}</p>
                          <p className="text-sm text-gray-600">{result.poolName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Refund + Bonus</p>
                          <p className="font-bold text-blue-600">
                            {result.refund} + {result.bonus} FLOW
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <p className="text-gray-600 text-sm mb-2">Total Winners</p>
                  <p className="text-3xl font-bold text-green-700">
                    {mockDrawResults[event?.id]?.filter((r) => r.won).length || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <p className="text-gray-600 text-sm mb-2">Total Non-Winners</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {mockDrawResults[event?.id]?.filter((r) => !r.won).length || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <p className="text-gray-600 text-sm mb-2">Total Participants</p>
                  <p className="text-3xl font-bold text-purple-700">{mockDrawResults[event?.id]?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
