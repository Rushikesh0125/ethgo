import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { bidder, amount } = body
    const auctionId = params.id

    if (!bidder || !amount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: "Bid amount must be positive" }, { status: 400 })
    }

    // Simulate blind bid submission
    const bid = {
      id: `BID-${Date.now()}`,
      auctionId,
      bidder,
      amount,
      timestamp: new Date().toISOString(),
      status: "submitted",
    }

    return NextResponse.json(
      {
        success: true,
        message: "Bid submitted successfully",
        data: bid,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to submit bid" }, { status: 500 })
  }
}
