import type React from "react"
import type { Metadata } from "next"
import { Ubuntu } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TicketVerse - Web3 Lottery Ticketing",
  description: "Fair, transparent, and rewarding ticket allocation powered by Web3",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${ubuntu.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
