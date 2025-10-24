import { type NextRequest, NextResponse } from "next/server"

// Mock database of events
const events = [
  {
    id: "1",
    name: "Summer Music Festival 2025",
    date: "2025-06-15",
    location: "Central Park, New York",
    pools: [
      { name: "Class A", price: 500, totalTickets: 100, registeredUsers: 45 },
      { name: "Class B", price: 1000, totalTickets: 75, registeredUsers: 32 },
      { name: "Class C", price: 2000, totalTickets: 50, registeredUsers: 28 },
    ],
  },
  {
    id: "2",
    name: "Tech Conference 2025",
    date: "2025-07-20",
    location: "San Francisco Convention Center",
    pools: [
      { name: "Class A", price: 300, totalTickets: 200, registeredUsers: 120 },
      { name: "Class B", price: 600, totalTickets: 150, registeredUsers: 85 },
      { name: "Class C", price: 1200, totalTickets: 100, registeredUsers: 60 },
    ],
  },
]

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: events }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, poolClass, walletAddress } = body

    if (!eventId || !poolClass || !walletAddress) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simulate staking transaction
    const entry = {
      id: `ENTRY-${Date.now()}`,
      eventId,
      poolClass,
      walletAddress,
      timestamp: new Date().toISOString(),
      status: "pending",
    }

    return NextResponse.json(
      {
        success: true,
        message: "Entry submitted successfully",
        data: entry,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to submit entry" }, { status: 500 })
  }
}
