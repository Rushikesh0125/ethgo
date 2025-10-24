import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, worldIdProof } = body

    if (!walletAddress || !worldIdProof) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simulate World ID verification
    const verification = {
      id: `VERIFY-${Date.now()}`,
      walletAddress,
      status: "verified",
      verificationDate: new Date().toISOString(),
      provider: "world_id",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        message: "Identity verified successfully",
        data: verification,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to verify identity" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    // Simulate checking verification status
    const isVerified = Math.random() > 0.5

    return NextResponse.json(
      {
        success: true,
        data: {
          walletAddress,
          isVerified,
          verificationDate: isVerified ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to check verification status" }, { status: 500 })
  }
}
