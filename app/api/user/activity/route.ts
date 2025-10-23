import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    // Simulate fetching user activity
    const activities = [
      {
        id: "ACT-1",
        type: "purchase",
        title: "Purchased Ticket",
        description: "Summer Music Festival 2025 - Class B",
        amount: "₹1,000",
        date: "2025-01-15",
      },
      {
        id: "ACT-2",
        type: "bid",
        title: "Placed Bid",
        description: "Tech Conference 2025 - Auction #2",
        amount: "₹450",
        date: "2025-01-12",
      },
      {
        id: "ACT-3",
        type: "resale",
        title: "Ticket Sold",
        description: "Sports Championship Final - Class C",
        amount: "+₹4,200",
        date: "2025-01-08",
      },
    ]

    return NextResponse.json({ success: true, data: activities }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch activity" }, { status: 500 })
  }
}
