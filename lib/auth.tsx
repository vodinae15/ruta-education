"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { createClient } from "./supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Создаем клиент Supabase с обработкой ошибок
  const supabase = useMemo(() => {
    console.log("🔧 Creating Supabase client instance")
    try {
      return createClient()
    } catch (error) {
      console.error("❌ Failed to create Supabase client:", error)
      throw error
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🔍 Getting initial session...")
        
        // Проверяем localStorage перед запросом сессии
        if (typeof window !== 'undefined') {
          const allKeys = Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'))
          console.log("🔍 All auth-related localStorage keys:", allKeys)
          
          allKeys.forEach(key => {
            const value = localStorage.getItem(key)
            console.log(`🔍 ${key}:`, value ? "Found" : "Not found")
          })
        }
        
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        
        if (error) {
          console.error("❌ Error getting session:", error)
        } else {
          console.log("✅ Initial session:", session?.user?.email || "No user")
          if (session) {
            console.log("🔍 Session expires at:", new Date(session.expires_at * 1000).toLocaleString())
            console.log("🔍 User metadata:", JSON.stringify(session.user.user_metadata, null, 2))
          }
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error("❌ Error getting session:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event, session?.user?.email || "No user")
      
      if (mounted) {
        setUser(session?.user ?? null)
        
        // Дополнительная проверка для SIGNED_IN события
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("✅ User signed in successfully:", session.user.email)
          console.log("👤 User metadata:", JSON.stringify(session.user.user_metadata, null, 2))
        }
        
        // Проверка для INITIAL_SESSION
        if (event === 'INITIAL_SESSION') {
          console.log("🔄 Initial session event:", session?.user?.email || "No user")
        }
        
        // Проверка для SIGNED_OUT события
        if (event === 'SIGNED_OUT') {
          console.log("🚪 User signed out")
        }
        
        // Всегда устанавливаем loading в false после любого события
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
