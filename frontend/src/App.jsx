import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Web3Provider } from './context/Web3Context'
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/ProtectedRoute'

// Pages
import AuthPages from './pages/AuthPages'
import AdminDashboard from './pages/AdminDashboard'
import ManageElections from './pages/ManageElections'
import ManageVoters from './pages/ManageVoters'
import ManageUsers from './pages/ManageUsers'
import ElectionListPage from './pages/ElectionListPage'
import VotePage from './pages/VotePage'
import ResultPage from './pages/ResultPage'
import BlockchainExplorer from './pages/BlockchainExplorer'
import TransactionHistory from './pages/TransactionHistory'
import AdminElectionDetail from './pages/AdminElectionDetail'

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <Router>
          <Routes>
            {/* Public/Guest Routes */}
            <Route path="/login" element={<GuestRoute><AuthPages /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><AuthPages /></GuestRoute>} />

            {/* Voter Routes */}
            <Route path="/elections" element={<ProtectedRoute><ElectionListPage /></ProtectedRoute>} />
            <Route path="/elections/:id" element={<ProtectedRoute><VotePage /></ProtectedRoute>} />
            <Route path="/elections/:id/vote" element={<ProtectedRoute><VotePage /></ProtectedRoute>} />
            <Route path="/elections/:id/results" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
            <Route path="/blockchain" element={<ProtectedRoute><BlockchainExplorer /></ProtectedRoute>} />
            <Route path="/my-votes" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/elections" element={<AdminRoute><ManageElections /></AdminRoute>} />
            <Route path="/admin/elections/:id" element={<AdminRoute><AdminElectionDetail /></AdminRoute>} />
            <Route path="/admin/voters" element={<AdminRoute><ManageVoters /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/elections" replace />} />
            <Route path="*" element={<Navigate to="/elections" replace />} />
          </Routes>
        </Router>
      </Web3Provider>
    </AuthProvider>
  )
}

export default App
