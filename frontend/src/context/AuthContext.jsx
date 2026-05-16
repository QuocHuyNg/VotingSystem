import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/authApi'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (tokenVal, userData) => {
    localStorage.setItem('token', tokenVal)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(tokenVal)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const updateWalletAddress = useCallback(async (address) => {
    if (user && user.wallet_address !== address) {
      try {
        await authApi.updateWallet(address)
        const newUser = { ...user, wallet_address: address }
        localStorage.setItem('user', JSON.stringify(newUser))
        setUser(newUser)
        toast.success('Đã liên kết ví thành công!')
      } catch (err) {
        console.error('Link wallet failed:', err)
      }
    }
  }, [user])

  const isAdmin = user?.role === 'admin'
  const isLoggedIn = !!token && !!user

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isLoggedIn, updateWalletAddress }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
