"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { WalletConnectionModal } from "@/components/wallet-connection-modal"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock, Zap, Users } from "lucide-react"
import { getStoredWallet } from "@/lib/wallet-utils"

export default function Home() {
  const router = useRouter()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [wallet, setWallet] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedWallet = getStoredWallet()
    setWallet(storedWallet)
    setIsLoading(false)
  }, [])

  const handleWalletConnect = (address: string) => {
    setWallet(address)
    setShowWalletModal(false)
  }

  const handleGetStarted = () => {
    if (wallet) {
      router.push("/events")
    } else {
      setShowWalletModal(true)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 text-white overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Subtitle */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Zap size={16} />
              </div>
              <span className="text-sm font-semibold text-blue-100">Web3 Lottery Ticketing Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-balance">
              Fair Tickets.
              <br />
              Blockchain Verified.
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join the future of event ticketing with verifiable randomness, staking rewards, and zero scalping
            </p>

            <Button
              onClick={handleGetStarted}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-full"
            >
              {wallet ? "Get Started" : "Connect Wallet"} <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>

        {/* Wave divider */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 bg-white"
          style={{
            clipPath: "polygon(0 50%, 100% 0, 100% 100%, 0 100%)",
          }}
        />
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-blue-900 mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: "Verifiable Randomness",
                description: "Fair ticket allocation using cryptographic randomness that cannot be manipulated.",
              },
              {
                icon: Users,
                title: "Identity Verification",
                description: "Bind tickets to real owners with World ID to prevent scalping and unauthorized resale.",
              },
              {
                icon: Zap,
                title: "Staking Rewards",
                description: "Deposit funds during waiting period and earn rewards whether you win or not.",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-xl border border-blue-100 hover:border-blue-300 transition">
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-blue-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Fair Tickets?</h2>
          <p className="text-xl mb-8 opacity-90">Connect your wallet and join the revolution in ticket allocation.</p>
          <Button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
          >
            {wallet ? "Get Started" : "Connect Wallet Now"}
          </Button>
        </div>
      </section>

      <WalletConnectionModal isOpen={showWalletModal} onConnect={handleWalletConnect} />
    </div>
  )
}
