import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/authApi'
import toast from 'react-hot-toast'
import { Activity, Eye, EyeOff, Loader } from 'lucide-react'

export default function AuthPages() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', wallet_address: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data } = await authApi.login({ email: form.email, password: form.password })
        login(data.token, data.user)
        toast.success(`Chào mừng, ${data.user.username}!`)
        navigate(data.user.role === 'admin' ? '/admin' : '/elections')
      } else {
        if (!form.username || !form.email || !form.password)
          return toast.error('Vui lòng điền đầy đủ thông tin')
        const { data } = await authApi.register(form)
        login(data.token, data.user)
        toast.success('Đăng ký thành công!')
        navigate('/elections')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,217,192,0.1) 0%, transparent 60%), var(--bg)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(108,99,255,0.4)',
          }}>
            <Activity size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>VoteChain</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hệ thống bỏ phiếu phi tập trung</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 28
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: 8,
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
              }}>
                {m === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label">Tên đăng nhập</label>
                <input className="input" placeholder="nguyen_van_a" value={form.username} onChange={set('username')} />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Email hoặc Tên đăng nhập</label>
              <input className="input" type="text" placeholder="admin hoặc admin@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="input-group">
              <label className="input-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label">Địa chỉ ví MetaMask <span style={{ color: 'var(--text-dim)' }}>(tùy chọn)</span></label>
                <input className="input" placeholder="0x..." value={form.wallet_address} onChange={set('wallet_address')} />
              </div>
            )}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><Loader size={16} className="spinner" style={{ animation: 'spin 0.7s linear infinite' }} /> Đang xử lý...</> : mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
