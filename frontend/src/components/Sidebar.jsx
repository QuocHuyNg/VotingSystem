import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWeb3 } from '../context/Web3Context'
import {
  LayoutDashboard, Vote, Users, Shield,
  Blocks, LogOut, Wallet, ChevronRight, Activity, FileText
} from 'lucide-react'
import { authApi } from '../api/authApi'
import toast from 'react-hot-toast'

const NAV_ADMIN = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/elections', icon: Vote, label: 'Quản lý Bầu Cử' },
  { to: '/admin/users', icon: Shield, label: 'Người Dùng' },
  { to: '/blockchain', icon: Blocks, label: 'Blockchain Explorer' },
]
const NAV_VOTER = [
  { to: '/elections', icon: Vote, label: 'Bầu Cử' },
  { to: '/my-votes', icon: FileText, label: 'Lịch sử phiếu bầu' },
  { to: '/blockchain', icon: Blocks, label: 'Tra Cứu Phiếu' },
]

export default function Sidebar() {
  const { user, logout, isAdmin, updateWalletAddress } = useAuth()
  const { account, connectWallet, disconnectWallet, isConnecting } = useWeb3()
  const navigate = useNavigate()

  const handleConnect = async () => {
    const success = await connectWallet()
    if (success) {
      toast.success('Đã kết nối ví!')
      // Link to account if not already done
      if (window.ethereum?.selectedAddress) {
        updateWalletAddress(window.ethereum.selectedAddress)
      }
    }
  }

  const navItems = isAdmin ? NAV_ADMIN : NAV_VOTER

  // Auto-sync wallet address with user profile
  useEffect(() => {
    if (account && user && user.wallet_address?.toLowerCase() !== account.toLowerCase()) {
      updateWalletAddress(account)
    }
  }, [account, user?.wallet_address, updateWalletAddress])

  const handleLogout = () => { 
    logout(); 
    disconnectWallet();
    navigate('/login');
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-w)', background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>VoteChain</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Blockchain Voting</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', padding: '0 8px', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isAdmin ? 'ADMIN' : 'MENU'}
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/admin'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, marginBottom: 4,
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
              transition: 'all 0.15s ease',
              background: isActive ? 'var(--primary-light)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            })}>
            <Icon size={17} />
            {label}
            {<ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
          </NavLink>
        ))}
      </nav>

      {/* Wallet */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        {account ? (
          <div style={{
            background: 'rgba(0,217,192,0.08)', border: '1px solid rgba(0,217,192,0.2)',
            borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Đã kết nối</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--secondary)' }}>
              {account.slice(0, 8)}...{account.slice(-6)}
            </div>
            <button className="btn btn-sm btn-secondary" style={{ marginTop: 8, width: '100%' }} onClick={disconnectWallet}>
              <Wallet size={13} /> Ngắt kết nối
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" onClick={handleConnect} disabled={isConnecting}>
            <Wallet size={16} />
            {isConnecting ? 'Đang kết nối...' : 'Kết nối MetaMask'}
          </button>
        )}
      </div>

      {/* User */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
        }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role}</div>
        </div>
        <button className="btn btn-icon btn-secondary" onClick={handleLogout} title="Đăng xuất">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
