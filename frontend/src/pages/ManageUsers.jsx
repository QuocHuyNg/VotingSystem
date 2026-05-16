import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { userApi } from '../api/userApi'
import toast from 'react-hot-toast'
import { Shield, User, Mail, Calendar, Wallet } from 'lucide-react'

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userApi.getAll()
      .then(r => setUsers(r.data.users || []))
      .catch(() => toast.error('Không thể tải danh sách người dùng'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Quản Lý Người Dùng</h1>
        <p className="page-subtitle">Danh sách tất cả tài khoản trong hệ thống</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Ví MetaMask</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: u.role === 'admin' ? 'var(--primary-light)' : 'var(--surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {u.role === 'admin' ? <Shield size={16} color="var(--primary)" /> : <User size={16} color="var(--text-muted)" />}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <Mail size={14} /> {u.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-muted'}`}>
                        {u.role === 'admin' ? 'Quản trị viên' : 'Cử tri'}
                      </span>
                    </td>
                    <td>
                      {u.wallet_address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          <Wallet size={14} /> {u.wallet_address.slice(0, 10)}...{u.wallet_address.slice(-8)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Chưa liên kết</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Calendar size={14} /> {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
