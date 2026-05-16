import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { useWeb3 } from '../context/Web3Context'
import { Vote, Clock, Users, ChevronRight, Wallet } from 'lucide-react'

function Countdown({ endTime }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = endTime * 1000 - Date.now()
      if (diff <= 0) return setLeft('Đã kết thúc')
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLeft(`${h}h ${m}m ${s}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [endTime])
  return <span>{left}</span>
}

export default function ElectionListPage() {
  const [elections, setElections] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const { account, connectWallet } = useWeb3()
  const navigate = useNavigate()

  useEffect(() => {
    electionApi.getAll().then(r => setElections(r.data.elections || [])).finally(() => setLoading(false))
  }, [])

  const filtered = elections.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const statusColor = { pending: 'var(--warning)', active: 'var(--success)', ended: 'var(--text-muted)', finalized: 'var(--primary)' }
  const statusLabel = { pending: 'Sắp diễn ra', active: '🔴 Đang diễn ra', ended: 'Đã kết thúc', finalized: 'Hoàn tất' }

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Danh Sách Bầu Cử</h1>
        <p className="page-subtitle">Tham gia bỏ phiếu và xem kết quả minh bạch trên blockchain</p>
      </div>

      {!account && (
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,217,192,0.05))', border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Wallet size={24} color="var(--primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Kết nối ví để bỏ phiếu</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bạn cần MetaMask để tham gia bỏ phiếu trên blockchain</div>
            </div>
            <button className="btn btn-primary" onClick={connectWallet}><Wallet size={15} /> Kết nối MetaMask</button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="input" placeholder="🔍 Tìm kiếm bầu cử..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 320 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'Tất cả'], ['active', 'Đang diễn ra'], ['pending', 'Sắp tới'], ['ended', 'Đã kết thúc']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><Vote size={48} style={{ opacity: 0.2, marginBottom: 16 }} /><h3>Không tìm thấy bầu cử</h3></div>
      ) : (
        <div className="grid-2">
          {filtered.map(e => (
            <div key={e.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={el => el.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={el => el.currentTarget.style.transform = ''}
              onClick={() => navigate(`/elections/${e.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor[e.status] }}>{statusLabel[e.status]}</span>
                <span className="badge badge-muted" style={{ fontSize: '0.72rem' }}>ID #{e.id}</span>
              </div>
              <h3 style={{ marginBottom: 8, lineHeight: 1.4 }}>{e.name}</h3>
              {e.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                <span>🗳 {e.candidate_count} ứng viên</span>
                <span>👥 {e.voter_count} cử tri</span>
                <span>✅ {e.vote_count} phiếu</span>
              </div>
              {e.status === 'active' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--warning)', marginBottom: 14 }}>
                  <Clock size={13} /> Còn lại: <Countdown endTime={e.end_time} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {e.status === 'active' && (
                  <button className="btn btn-primary btn-sm" onClick={ev => { ev.stopPropagation(); navigate(`/elections/${e.id}/vote`) }}>
                    <Vote size={13} /> Bỏ Phiếu
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={ev => { ev.stopPropagation(); navigate(`/elections/${e.id}/results`) }}>
                  Kết Quả <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
