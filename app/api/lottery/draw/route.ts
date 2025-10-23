import { type NextRequest, NextResponse } from "next/server"

// Mock lottery draw results
const drawResults = [
  {
    eventId: "1",
    poolClass: "Class B",
    drawDate: "2025-06-01",
    winners: ["0x742d35Cc6634C0532925a3b844Bc9e7595f8f2a"],
    totalParticipants: 32,
    winnersCount: 5,
  },
  {
    eventId: "2",
    poolClass: "Class A",
    drawDate: "2025-07-10",
    winners: ["0x9a1f2c3d4e5f6a7b8c9d0e1f2a3b4c5d"],
    totalParticipants: 120,
    winnersCount: 15,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    // Find results for this wallet
    const userResults = drawResults.map((draw) => ({
      ...draw,
      isWinner: draw.winners.includes(walletAddress),
    }))

    return NextResponse.json({ success: true, data: userResults }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch draw results" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, poolClass } = body

    if (!eventId || !poolClass) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simulate running lottery draw with verifiable randomness
    const participants = Math.floor(Math.random() * 100) + 20
    const winners = Math.floor(participants * 0.15) // 15% win rate

    const result = {
      eventId,
      poolClass,
      drawDate: new Date().toISOString(),
      totalParticipants: participants,
      winnersCount: winners,
      randomSeed: Math.random().toString(36).substring(7),
      status: "completed",
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lottery draw completed",
        data: result,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to run lottery draw" }, { status: 500 })
  }
}
