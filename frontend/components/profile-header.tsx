"use client"

import { Copy, CheckCircle } from "lucide-react"
import { useState } from "react"

interface ProfileHeaderProps {
  account: string
}

export function ProfileHeader({ account }: ProfileHeaderProps) {
  const [copied, setCopied] = useState(false)

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(account)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6">
      {/* Avatar */}
      <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-3xl font-bold text-white">{account.slice(2, 4).toUpperCase()}</span>
      </div>

      {/* Wallet Info */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-blue-900 mb-2">Your Wallet</h2>
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <code className="text-sm font-mono text-blue-600">{formatAddress(account)}</code>
          <button onClick={handleCopy} className="p-1 hover:bg-blue-100 rounded transition" title="Copy address">
            {copied ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <Copy size={18} className="text-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
        <p className="text-sm font-semibold text-green-700">Wallet Connected</p>
        <p className="text-xs text-green-600">MetaMask</p>
      </div>
    </div>
  )
}
