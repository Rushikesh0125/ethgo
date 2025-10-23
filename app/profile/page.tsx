"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ProfileHeader } from "@/components/profile-header"
import { ProfileStats } from "@/components/profile-stats"
import { ActivityHistory } from "@/components/activity-history"
import { IdentityVerification } from "@/components/identity-verification"
import { Settings, Download, LogOut } from "lucide-react"
import { getStoredWallet, disconnectWallet } from "@/lib/wallet-utils"

export default function ProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "identity" | "settings">("overview")
  const [wallet, setWallet] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedWallet = getStoredWallet()
    if (!storedWallet) {
      router.push("/")
    } else {
      setWallet(storedWallet)
      setIsLoading(false)
    }
  }, [router])

  const handleDisconnectWallet = () => {
    disconnectWallet()
    router.push("/")
  }

  if (isLoading) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account and view your activity</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ProfileHeader account={wallet || ""} />

            <div className="mt-6 space-y-2">
              {[
                { id: "overview", label: "Overview" },
                { id: "activity", label: "Activity History" },
                { id: "identity", label: "Identity Verification" },
                { id: "settings", label: "Settings" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-blue-100 text-gray-700 hover:border-blue-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {activeTab === "overview" && <ProfileOverview />}
            {activeTab === "activity" && <ActivityHistory />}
            {activeTab === "identity" && <IdentityVerification />}
            {activeTab === "settings" && <ProfileSettings onDisconnect={handleDisconnectWallet} wallet={wallet} />}
          </div>
        </div>
      </section>
    </div>
  )
}

function ProfileOverview() {
  return (
    <div className="space-y-8">
      <ProfileStats />

      <div className="bg-white border border-blue-100 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6">Recent Transactions</h3>
        <div className="space-y-4">
          {[
            {
              type: "Ticket Purchase",
              event: "Summer Music Festival 2025",
              amount: "1.0 FLOW",
              date: "2 days ago",
              status: "completed",
            },
            {
              type: "Auction Bid",
              event: "Tech Conference 2025",
              amount: "0.45 FLOW",
              date: "5 days ago",
              status: "completed",
            },
            {
              type: "Ticket Resale",
              event: "Sports Championship Final",
              amount: "4.2 FLOW",
              date: "1 week ago",
              status: "completed",
            },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">{tx.type}</p>
                <p className="text-sm text-gray-600">{tx.event}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">{tx.amount}</p>
                <p className="text-xs text-gray-500">{tx.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold flex items-center justify-center gap-2">
          <Download size={20} />
          Download Statement
        </Button>
        <Button
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Settings size={20} />
          Account Settings
        </Button>
      </div>
    </div>
  )
}

function ProfileSettings({ onDisconnect, wallet }: { onDisconnect: () => void; wallet: string | null }) {
  return (
    <div className="space-y-6">
      {/* Wallet Management */}
      <div className="bg-white border border-blue-100 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6">Wallet Management</h3>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-2">Connected Wallet</p>
          <p className="font-mono font-bold text-blue-600 text-lg">{wallet}</p>
        </div>
        <Button
          onClick={onDisconnect}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Disconnect Wallet
        </Button>
      </div>

      <div className="bg-white border border-blue-100 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { label: "Draw Results", description: "Get notified when lottery draw results are announced" },
            { label: "Auction Updates", description: "Receive updates on your active auctions" },
            { label: "New Events", description: "Be notified about new events" },
            { label: "Bid Outbid", description: "Get notified when you're outbid in an auction" },
          ].map((pref, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">{pref.label}</p>
                <p className="text-sm text-gray-600">{pref.description}</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-blue-100 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6">Privacy Settings</h3>
        <div className="space-y-4">
          {[
            { label: "Public Profile", description: "Allow others to view your profile" },
            { label: "Show Transaction History", description: "Display your transaction history publicly" },
          ].map((setting, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
