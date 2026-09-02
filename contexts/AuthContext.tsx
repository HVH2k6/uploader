'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  username: string | null
  roleId: string | null
  role?: {
    id: string
    name: string
  } | null
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          return
        }

        // Try refreshing token if accessToken expired or not present
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
        if (refreshRes.ok) {
          const retryRes = await fetch('/api/auth/me')
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            setUser(retryData.user)
            return
          }
        }

        setUser(null)
      } catch (error) {
        console.error('Error fetching user', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('Logout error', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
