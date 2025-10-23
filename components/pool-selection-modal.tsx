"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Loader2, Clock } from "lucide-react"

interface Pool {
  name: string
  price: number
  totalTickets: number
  registeredUsers: number
}

interface Event {
  id: string
  name: string
  date?: string
  pools: Pool[]
}

interface PoolSelectionModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
}

export function PoolSelectionModal({ event, isOpen, onClose }: PoolSelectionModalProps) {
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [alreadyBid, setAlreadyBid] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const userEntries = JSON.parse(localStorage.getItem("userEntries") || "{}")
      if (userEntries[event.id]) {
        setAlreadyBid(true)
      } else {
        setAlreadyBid(false)
        setSelectedPool(null)
        setTransactionStatus("idle")
      }
    }
  }, [isOpen, event.id])

  if (!isOpen) return null

  const handlePoolSelect = async (poolName: string) => {
    setSelectedPool(poolName)
    setIsProcessing(true)
    setTransactionStatus("pending")

    // Simulate Flow EVM testnet transaction
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setTransactionStatus("success")

      const userEntries = JSON.parse(localStorage.getItem("userEntries") || "{}")
      userEntries[event.id] = {
        poolName,
        timestamp: new Date().toISOString(),
        eventName: event.name,
      }
      localStorage.setItem("userEntries", JSON.stringify(userEntries))
    } catch (error) {
      setTransactionStatus("error")
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-blue-100 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-900">Select Your Pool</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition" disabled={isProcessing}>
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {alreadyBid ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mb-2">Already Bid!</h3>
              <p className="text-gray-600 mb-6 text-lg">
                You have already submitted an entry for this event. You cannot bid again for the same event.
              </p>
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2">
                Close
              </Button>
            </div>
          ) : transactionStatus === "success" ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={48} className="text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Entry Submitted Successfully!</h3>
              <p className="text-gray-600 mb-8 text-lg">
                You're in <span className="font-bold text-blue-600">{selectedPool}</span> for{" "}
                <span className="font-bold">{event.name}</span>
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-gray-700 font-semibold mb-2">Lucky Draw Countdown</p>
                <p className="text-3xl font-bold text-blue-600 mb-2">Draw is happening now!</p>
                <p className="text-gray-600">March 1, 2025 at 5:30 PM</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <p className="font-bold text-gray-900 mb-4">What happens next?</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-gray-700">Wait for the lucky draw on Mar 1</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-gray-700">Verifiable random selection will allocate tickets fairly</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-gray-700">Check back for results - winners get tickets, others get rewards</p>
                  </div>
                </div>
              </div>

              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6 font-medium text-lg">{event.name}</p>

              {event.pools.map((pool) => {
                const availableTickets = pool.totalTickets - pool.registeredUsers
                const fillPercentage = (pool.registeredUsers / pool.totalTickets) * 100

                return (
                  <button
                    key={pool.name}
                    onClick={() => handlePoolSelect(pool.name)}
                    disabled={isProcessing}
                    className={`w-full p-5 rounded-lg border-2 transition text-left ${
                      selectedPool === pool.name
                        ? "border-blue-600 bg-blue-50"
                        : "border-blue-100 hover:border-blue-300 bg-white"
                    } ${isProcessing && selectedPool !== pool.name ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-blue-900">{pool.name}</h4>
                        <p className="text-sm text-gray-600">{pool.price} FLOW per ticket</p>
                      </div>
                      <span className="text-sm font-semibold bg-green-100 text-green-700 px-3 py-1 rounded">
                        100% odds
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-800 h-2 rounded-full transition-all"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {pool.registeredUsers} / {pool.totalTickets} entries
                      </p>
                    </div>
                  </button>
                )
              })}

              <Button
                onClick={() => selectedPool && handlePoolSelect(selectedPool)}
                disabled={!selectedPool || isProcessing}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Processing Transaction...
                  </>
                ) : (
                  "Confirm & Stake"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
