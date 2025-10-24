"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle } from "lucide-react"
import { useState } from "react"

export function IdentityVerification() {
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    setIsVerifying(true)
    // Simulate World ID verification
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsVerified(true)
    setIsVerifying(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-blue-100 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6">Identity Verification</h3>

        {isVerified ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 flex items-start gap-4">
            <CheckCircle size={32} className="text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-green-900 mb-2">Identity Verified</h4>
              <p className="text-green-700 mb-4">Your identity has been verified with World ID. You can now:</p>
              <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
                <li>Participate in all lottery draws</li>
                <li>Resell tickets on the platform</li>
                <li>Claim rewards and refunds</li>
                <li>Access exclusive events</li>
              </ul>
              <p className="text-xs text-green-600 mt-4">Verified on: January 15, 2025</p>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle size={32} className="text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-orange-900 mb-2">Identity Not Verified</h4>
                <p className="text-orange-700">
                  Verify your identity with World ID to unlock full platform features and prevent ticket scalping.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-orange-100 mb-6">
              <h5 className="font-semibold text-gray-900 mb-3">Why verify your identity?</h5>
              <ul className="text-sm text-gray-700 space-y-2 ml-4 list-disc">
                <li>Ensures fair ticket allocation</li>
                <li>Prevents scalping and resale abuse</li>
                <li>Protects your account security</li>
                <li>Enables all platform features</li>
              </ul>
            </div>

            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {isVerifying ? "Verifying..." : "Verify with World ID"}
            </Button>
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-bold text-blue-900 mb-3">Security & Privacy</h4>
        <p className="text-sm text-blue-700 mb-4">
          Your identity verification is handled securely through World ID. We never store your personal information on
          our servers.
        </p>
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
          Learn more about World ID →
        </a>
      </div>
    </div>
  )
}
