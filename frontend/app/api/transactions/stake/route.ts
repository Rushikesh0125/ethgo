import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, amount, eventId, poolClass } = body

    if (!walletAddress || !amount || !eventId || !poolClass) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simulate staking transaction
    const transaction = {
      id: `TX-${Date.now()}`,
      type: "stake",
      walletAddress,
      amount,
      eventId,
      poolClass,
      timestamp: new Date().toISOString(),
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2)}`,
    }

    return NextResponse.json(
      {
        success: true,
        message: "Stake transaction confirmed",
        data: transaction,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process stake" }, { status: 500 })
  }
}
