import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

export function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/elections" replace />
  return children
}

export function GuestRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth()
  if (isLoggedIn) return <Navigate to={isAdmin ? '/admin' : '/elections'} replace />
  return children
}
