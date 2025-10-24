"use client"

import type React from "react"

import { WalletProvider } from "@/lib/wallet-context"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>
}
