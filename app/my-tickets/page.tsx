"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { ArrowUpRight, Download } from "lucide-react"

interface AuctionedTicket {
  id: string
  eventName: string
  poolName: string
  price: number
  currentBid: number
  bidCount: number
  timeLeft: string
  status: "active" | "sold" | "ended"
}

export default function MyTicketsPage() {
  const [auctionedTickets, setAuctionedTickets] = useState<AuctionedTicket[]>([])

  useEffect(() => {
    // Mock data for auctioned tickets
    const mockTickets: AuctionedTicket[] = [
      {
        id: "1",
        eventName: "Coldplay Concert 2025",
        poolName: "Pool B",
        price: 5000,
        currentBid: 7500,
        bidCount: 12,
        timeLeft: "2 days 5 hours",
        status: "active",
      },
      {
        id: "2",
        eventName: "Tech Conference 2025",
        poolName: "Pool A",
        price: 300,
        currentBid: 450,
        bidCount: 8,
        timeLeft: "5 hours",
        status: "active",
      },
      {
        id: "3",
        eventName: "Sports Championship Final",
        poolName: "Pool C",
        price: 3000,
        currentBid: 4200,
        bidCount: 15,
        timeLeft: "Ended",
        status: "sold",
      },
    ]
    setAuctionedTickets(mockTickets)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">My Auctioned Tickets</h1>
          <p className="text-gray-600">View and manage your tickets on the resale market</p>
        </div>
      </section>

      {/* Tickets Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {auctionedTickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">You haven't auctioned any tickets yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctionedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border-2 border-blue-100 rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                {/* Status Badge */}
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">{ticket.eventName}</span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        ticket.status === "active"
                          ? "bg-green-100 text-green-700"
                          : ticket.status === "sold"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ticket.status === "active" ? "🔴 Active" : ticket.status === "sold" ? "✓ Sold" : "Ended"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3">{ticket.poolName}</p>

                  {/* Price Info */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Original Price</p>
                    <p className="text-lg font-bold text-gray-900">₹{ticket.price}</p>
                  </div>

                  {/* Current Bid */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 mb-1">Current Bid</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-blue-600">₹{ticket.currentBid}</p>
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <ArrowUpRight size={16} />
                        {(((ticket.currentBid - ticket.price) / ticket.price) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Bid Count & Time */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">Bids</p>
                      <p className="font-bold text-gray-900">{ticket.bidCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">Time Left</p>
                      <p className="font-bold text-gray-900 text-sm">{ticket.timeLeft}</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2">
                    <Download size={16} />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
