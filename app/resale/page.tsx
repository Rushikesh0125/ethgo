"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { TicketCheckModal } from "@/components/ticket-check-modal"
import { ResaleListingModal } from "@/components/resale-listing-modal"
import { AuctionCard } from "@/components/auction-card"

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

interface DummyTicket {
  id: string
  ticketId: string
  eventName: string
  ticketClass: string
  originalPrice: number
}

export default function ResalePage() {
  const [hasTicket, setHasTicket] = useState(false)
  const [showTicketCheck, setShowTicketCheck] = useState(false)
  const [showResaleModal, setShowResaleModal] = useState(false)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<DummyTicket | null>(null)

  const dummyTickets: DummyTicket[] = [
    {
      id: "dummy-1",
      ticketId: "TKT-2025-001-A-11111",
      eventName: "Summer Music Festival 2025",
      ticketClass: "Class A",
      originalPrice: 500,
    },
    {
      id: "dummy-2",
      ticketId: "TKT-2025-002-B-22222",
      eventName: "Tech Conference 2025",
      ticketClass: "Class B",
      originalPrice: 600,
    },
    {
      id: "dummy-3",
      ticketId: "TKT-2025-003-C-33333",
      eventName: "Sports Championship Final",
      ticketClass: "Class C",
      originalPrice: 3000,
    },
  ]

  useEffect(() => {
    // Simulate fetching auctions
    const timer = setTimeout(() => {
      setAuctions([
        {
          id: "1",
          ticketId: "TKT-2025-001-B-12345",
          eventName: "Summer Music Festival 2025",
          ticketClass: "Class B",
          originalPrice: 1000,
          biddingEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          bidsCount: 12,
          highestBid: 1500,
          status: "active",
          seller: "0x742d...8f2a",
        },
        {
          id: "2",
          ticketId: "TKT-2025-002-C-54321",
          eventName: "Sports Championship Final",
          ticketClass: "Class C",
          originalPrice: 3000,
          biddingEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          bidsCount: 8,
          highestBid: 4200,
          status: "active",
          seller: "0x9a1f...3c7b",
        },
        {
          id: "3",
          ticketId: "TKT-2025-003-A-99999",
          eventName: "Tech Conference 2025",
          ticketClass: "Class A",
          originalPrice: 300,
          biddingEndTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          bidsCount: 5,
          highestBid: 450,
          status: "ended",
          seller: "0x5e2c...1a9d",
        },
      ])
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleTicketVerified = (verified: boolean) => {
    setHasTicket(verified)
    setShowTicketCheck(false)
    if (verified) {
      setShowResaleModal(true)
    }
  }

  const handleSelectTicket = (ticket: DummyTicket) => {
    setSelectedTicket(ticket)
    setShowResaleModal(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Ticket Resale</h1>
          <p className="text-gray-600">Buy and sell tickets through our secure blind bidding auction</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-blue-900 mb-6">My Tickets</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {dummyTickets.map((ticket) => (
              <div key={ticket.id} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">{ticket.eventName}</h3>
                <p className="text-sm text-gray-600 mb-1">Class: {ticket.ticketClass}</p>
                <p className="text-sm text-gray-600 mb-3">Original Price: ₹{ticket.originalPrice}</p>
                <button
                  onClick={() => handleSelectTicket(ticket)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition text-sm"
                >
                  Resell This Ticket
                </button>
              </div>
            ))}
          </div>

          {!hasTicket ? (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
              <p className="text-gray-700 mb-4">Or verify your own ticket to resell</p>
              <Button onClick={() => setShowTicketCheck(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Verify & Add Your Ticket
              </Button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-900 mb-1">You have a ticket to resell</h3>
                <p className="text-green-700">List your ticket on the auction platform</p>
              </div>
              <Button onClick={() => setShowResaleModal(true)} className="bg-green-600 hover:bg-green-700 text-white">
                List for Resale
              </Button>
            </div>
          )}
        </div>

        {/* Auctions Section */}
        <div>
          <h2 className="text-3xl font-bold text-blue-900 mb-8">Active Auctions</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No auctions available at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {auctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ticket Check Modal */}
      {showTicketCheck && <TicketCheckModal onVerified={handleTicketVerified} />}

      {/* Resale Listing Modal */}
      {showResaleModal && (
        <ResaleListingModal
          isOpen={showResaleModal}
          onClose={() => {
            setShowResaleModal(false)
            setSelectedTicket(null)
          }}
          onSubmit={() => {
            setShowResaleModal(false)
            setHasTicket(false)
            setSelectedTicket(null)
          }}
          selectedTicket={selectedTicket}
        />
      )}
    </div>
  )
}
