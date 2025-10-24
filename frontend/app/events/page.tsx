"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { EventCard } from "@/components/event-card"
import { getStoredWallet } from "@/lib/wallet-utils"

interface Event {
  id: string
  name: string
  date: string
  location: string
  image: string
  pools: {
    name: string
    price: number
    totalTickets: number
    registeredUsers: number
  }[]
}

const mockEvents: Event[] = [
  {
    id: "1",
    name: "Summer Music Festival 2025",
    date: "2025-06-15",
    location: "Central Park, New York",
    image: "/music-festival-stage.png",
    pools: [
      { name: "Class A", price: 0.5, totalTickets: 100, registeredUsers: 45 },
      { name: "Class B", price: 1.0, totalTickets: 75, registeredUsers: 32 },
      { name: "Class C", price: 2.0, totalTickets: 50, registeredUsers: 28 },
    ],
  },
  {
    id: "2",
    name: "Tech Conference 2025",
    date: "2025-07-20",
    location: "San Francisco Convention Center",
    image: "/tech-conference.png",
    pools: [
      { name: "Class A", price: 0.3, totalTickets: 200, registeredUsers: 120 },
      { name: "Class B", price: 0.6, totalTickets: 150, registeredUsers: 85 },
      { name: "Class C", price: 1.2, totalTickets: 100, registeredUsers: 60 },
    ],
  },
  {
    id: "3",
    name: "Sports Championship Final",
    date: "2025-08-10",
    location: "Madison Square Garden",
    image: "/vibrant-sports-stadium.png",
    pools: [
      { name: "Class A", price: 0.8, totalTickets: 150, registeredUsers: 95 },
      { name: "Class B", price: 1.5, totalTickets: 100, registeredUsers: 72 },
      { name: "Class C", price: 3.0, totalTickets: 50, registeredUsers: 40 },
    ],
  },
]

export default function EventsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const wallet = getStoredWallet()
    if (!wallet) {
      router.push("/")
    } else {
      setIsLoading(false)
    }
  }, [router])

  const handleJoinQueue = (event: Event) => {
    window.location.href = `/events/${event.id}`
  }

  if (isLoading) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Available Events</h1>
          <p className="text-gray-600">Browse and join the lottery pools for upcoming events</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockEvents.map((event) => (
            <div key={event.id}>
              <EventCard event={event} onJoinQueue={() => handleJoinQueue(event)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
