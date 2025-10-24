import { type NextRequest, NextResponse } from "next/server"

// Mock auctions database
const auctions = [
  {
    id: "1",
    ticketId: "TKT-2025-001-B-12345",
    eventName: "Summer Music Festival 2025",
    ticketClass: "Class B",
    originalPrice: 1000,
    biddingEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    bids: [
      { bidder: "0x742d...8f2a", amount: 1500, timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { bidder: "0x9a1f...3c7b", amount: 1400, timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
    ],
    status: "active",
    seller: "0x5e2c...1a9d",
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("id")

    if (auctionId) {
      const auction = auctions.find((a) => a.id === auctionId)
      if (!auction) {
        return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: auction }, { status: 200 })
    }

    return NextResponse.json({ success: true, data: auctions }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch auctions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, eventName, ticketClass, originalPrice, biddingDuration, seller } = body

    if (!ticketId || !eventName || !ticketClass || !originalPrice || !seller) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const auction = {
      id: `AUCTION-${Date.now()}`,
      ticketId,
      eventName,
      ticketClass,
      originalPrice,
      biddingEndTime: new Date(Date.now() + Number.parseInt(biddingDuration) * 60 * 60 * 1000).toISOString(),
      bids: [],
      status: "active",
      seller,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        message: "Auction created successfully",
        data: auction,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create auction" }, { status: 500 })
  }
}
