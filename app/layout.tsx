import type React from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="antialiased">
      <body className="bg-cream text-slate-900 font-sans" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.app'
}
