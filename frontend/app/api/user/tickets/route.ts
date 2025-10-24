import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    // Simulate fetching user tickets
    const tickets = [
      {
        id: "TKT-2025-001-B-12345",
        eventName: "Summer Music Festival 2025",
        ticketClass: "Class B",
        price: 1000,
        purchaseDate: "2025-01-15",
        status: "active",
      },
      {
        id: "TKT-2025-002-C-54321",
        eventName: "Sports Championship Final",
        ticketClass: "Class C",
        price: 3000,
        purchaseDate: "2025-01-08",
        status: "resale_pending",
      },
    ]

    return NextResponse.json({ success: true, data: tickets }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 })
  }
}
