"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"
import { storeWallet } from "@/lib/wallet-utils"

interface WalletConnectionModalProps {
  isOpen: boolean
  onConnect: (address: string) => void
}

export function WalletConnectionModal({ isOpen, onConnect }: WalletConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConnectMetaMask = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install it to continue.")
        setIsConnecting(false)
        return
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        storeWallet(address)
        onConnect(address)
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet")
      setIsConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} className="text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Connect MetaMask to start participating in FairStake events</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Button
          onClick={handleConnectMetaMask}
          disabled={isConnecting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet size={20} />
              Connect MetaMask
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-6">
          Make sure you're connected to Flow EVM Testnet in MetaMask
        </p>
      </div>
    </div>
  )
}
