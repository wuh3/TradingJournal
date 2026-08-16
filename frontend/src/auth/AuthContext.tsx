import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { apiClient, getToken, setToken, clearToken } from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken())
  const [username, setUsername] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post('/api/auth/login', { username, password })
    setToken(data.access_token)
    setIsAuthenticated(true)
    setUsername(username)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setIsAuthenticated(false)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
