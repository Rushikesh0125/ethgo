"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface Event {
  id: string
  name: string
  date: string
  location: string
  totalParticipants: number
  winners: number
}

export default function DrawResultsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    // Simulate fetching events
    const timer = setTimeout(() => {
      setEvents([
        {
          id: "1",
          name: "Coldplay Concert 2025",
          date: "Mar 16, 2025",
          location: "Wankhede Stadium, Mumbai",
          totalParticipants: 5000,
          winners: 3201,
        },
        {
          id: "2",
          name: "Tech Conference 2025",
          date: "Apr 10, 2025",
          location: "Convention Center, Bangalore",
          totalParticipants: 2000,
          winners: 1501,
        },
        {
          id: "3",
          name: "Sports Championship Final",
          date: "May 5, 2025",
          location: "National Stadium, Delhi",
          totalParticipants: 8000,
          winners: 4500,
        },
      ])
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Draw Results</h1>
          <p className="text-gray-600">Click on an event to see detailed results and your outcome</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading draw results...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg mb-6">No events yet. Join an event to participate!</p>
            <Link href="/events">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className="bg-white border-2 border-blue-100 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-blue-900 mb-2">{event.name}</h3>
                    <p className="text-sm text-gray-600">📅 {event.date}</p>
                    <p className="text-sm text-gray-600">📍 {event.location}</p>
                  </div>
                  <ChevronRight className="text-blue-600" size={24} />
                </div>

                <div className="border-t border-blue-100 pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{event.winners}</p>
                      <p className="text-xs text-gray-600">Winners</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">{event.totalParticipants - event.winners}</p>
                      <p className="text-xs text-gray-600">Non-Winners</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(event.winners / event.totalParticipants) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {((event.winners / event.totalParticipants) * 100).toFixed(1)}% win rate
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedEventId && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href={`/draw-results/${selectedEventId}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">View Detailed Results</Button>
          </Link>
        </section>
      )}
    </div>
  )
}
