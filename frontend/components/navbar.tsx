"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { getStoredWallet, formatAddress } from "@/lib/wallet-utils"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [wallet, setWallet] = useState<string | null>(null)

  useEffect(() => {
    const storedWallet = getStoredWallet()
    setWallet(storedWallet)
  }, [])

  return (
    <nav className="bg-white border-b border-blue-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚖️</span>
            </div>
            <span className="font-bold text-xl text-blue-900">FairStake</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/events" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Events
            </Link>
            <Link href="/resale" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Resale
            </Link>
            <Link href="/profile" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Profile
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm font-mono text-blue-900">
                📱 {wallet ? formatAddress(wallet) : "Not connected"}
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-blue-100">
            <Link href="/events" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">
              Events
            </Link>
            <Link href="/resale" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">
              Resale
            </Link>
            <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">
              Profile
            </Link>
            <div className="px-4 py-2 text-sm font-mono text-blue-900 bg-blue-50 m-2 rounded">
              📱 {wallet ? formatAddress(wallet) : "Not connected"}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
