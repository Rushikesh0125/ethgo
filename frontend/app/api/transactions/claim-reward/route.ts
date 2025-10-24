import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, rewardAmount, eventId } = body

    if (!walletAddress || !rewardAmount || !eventId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simulate reward claim transaction
    const transaction = {
      id: `TX-${Date.now()}`,
      type: "claim_reward",
      walletAddress,
      rewardAmount,
      eventId,
      timestamp: new Date().toISOString(),
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2)}`,
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reward claimed successfully",
        data: transaction,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to claim reward" }, { status: 500 })
  }
}
