"use client"

import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users } from "lucide-react"

interface EventCardProps {
  event: {
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
  onJoinQueue: () => void
}

export function EventCard({ event, onJoinQueue }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const totalRegistered = event.pools.reduce((sum, pool) => sum + pool.registeredUsers, 0)
  const totalTickets = event.pools.reduce((sum, pool) => sum + pool.totalTickets, 0)

  return (
    <div className="bg-white border border-blue-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-blue-50">
        <img src={event.image || "/placeholder.svg"} alt={event.name} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-3">{event.name}</h3>

        {/* Event Details */}
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <span>
              {totalRegistered} registered / {totalTickets} total tickets
            </span>
          </div>
        </div>

        {/* Pool Preview */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 mb-2">Ticket Classes</p>
          <div className="space-y-1">
            {event.pools.map((pool) => (
              <div key={pool.name} className="flex justify-between text-xs text-gray-600">
                <span>{pool.name}</span>
                <span className="font-semibold text-blue-600">₹{pool.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Join Button */}
        <Button onClick={onJoinQueue} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          Join the Queue
        </Button>
      </div>
    </div>
  )
}
