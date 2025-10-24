"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, AlertCircle, CheckCircle } from "lucide-react"

interface TicketCheckModalProps {
  onVerified: (verified: boolean) => void
}

export function TicketCheckModal({ onVerified }: TicketCheckModalProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<"idle" | "checking" | "found" | "not-found">("idle")

  const handleCheckTicket = async () => {
    setIsChecking(true)
    setCheckResult("checking")

    // Simulate checking for ticket
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Randomly determine if user has a ticket (for demo)
    const hasTicket = Math.random() > 0.5
    setCheckResult(hasTicket ? "found" : "not-found")
    setIsChecking(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border-2 border-blue-200 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-4">Check Your Tickets</h2>
        <p className="text-gray-600 mb-8">
          We'll verify if you have any winning tickets from previous draws that you can resell on our platform.
        </p>

        {checkResult === "idle" && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <p className="text-gray-700 mb-4">
                Your wallet will be checked against our verified ticket database. This process is secure and
                transparent.
              </p>
              <Button
                onClick={handleCheckTicket}
                disabled={isChecking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold flex items-center justify-center gap-2"
              >
                <Search size={20} />
                {isChecking ? "Checking..." : "Check My Tickets"}
              </Button>
            </div>
          </div>
        )}

        {checkResult === "checking" && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Verifying your tickets...</p>
          </div>
        )}

        {checkResult === "found" && (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 flex items-start gap-4">
              <CheckCircle size={32} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-green-900 mb-2">Ticket Found!</h3>
                <p className="text-green-700 mb-4">
                  We found a verified ticket in your wallet. You can now list it for resale.
                </p>
                <Button
                  onClick={() => onVerified(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  Proceed to List Ticket
                </Button>
              </div>
            </div>
          </div>
        )}

        {checkResult === "not-found" && (
          <div className="space-y-6">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 flex items-start gap-4">
              <AlertCircle size={32} className="text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-orange-900 mb-2">No Tickets Found</h3>
                <p className="text-orange-700 mb-4">
                  We couldn't find any verified tickets in your wallet. You can still browse and bid on tickets from
                  other sellers below.
                </p>
                <Button
                  onClick={() => onVerified(false)}
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent font-semibold"
                >
                  Browse Auctions
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
