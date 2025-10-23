"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Loader2, CheckCircle } from "lucide-react"

interface ResaleListingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
}

export function ResaleListingModal({ isOpen, onClose, onSubmit }: ResaleListingModalProps) {
  const [step, setStep] = useState<"details" | "confirm" | "success">("details")
  const [biddingDuration, setBiddingDuration] = useState("24")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setStep("success")
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-blue-100 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-900">List for Resale</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition" disabled={isSubmitting}>
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "details" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Ticket Details</p>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="font-bold text-blue-900">Summer Music Festival 2025</p>
                  <p className="text-sm text-gray-600">Class B • ₹1,000</p>
                  <p className="text-xs text-gray-500 mt-2">ID: TKT-2025-001-B-12345</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Bidding Duration</label>
                <select
                  value={biddingDuration}
                  onChange={(e) => setBiddingDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Blind Bidding:</span> Bids are hidden until the auction ends. This
                  ensures fair pricing.
                </p>
              </div>

              <Button
                onClick={() => setStep("confirm")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                Continue
              </Button>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">Confirm Listing Details</p>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Event</span>
                    <span className="font-semibold text-blue-900">Summer Music Festival</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Ticket Class</span>
                    <span className="font-semibold text-blue-900">Class B</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Original Price</span>
                    <span className="font-semibold text-blue-900">₹1,000</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Bidding Duration</span>
                    <span className="font-semibold text-blue-900">{biddingDuration} hours</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <p className="text-sm text-orange-700">
                  <span className="font-semibold">Note:</span> Once listed, your ticket will be locked until the auction
                  ends.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep("details")}
                  variant="outline"
                  className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "List Ticket"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">Ticket Listed!</h3>
              <p className="text-gray-600 mb-6">
                Your ticket is now on the auction platform. Bidding will start immediately.
              </p>
              <Button
                onClick={() => {
                  onSubmit()
                  onClose()
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                View Auction
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
