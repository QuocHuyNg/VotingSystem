import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { blockchainApi } from '../api/userApi'
import { Vote, Users, CheckCircle, Activity, Plus, Blocks, ChevronRight, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{value ?? '–'}</div>
          {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [elections, setElections] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      electionApi.getStats(),
      electionApi.getAll(),
      blockchainApi.getActivity(),
    ]).then(([s, e, a]) => {
      setStats(s.data.stats)
      setElections(e.data.elections?.slice(0, 5) || [])
      setActivities(a.data.activity || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const chartData = elections.map(e => ({ name: (e.name || 'Bầu cử').slice(0, 12), votes: e.vote_count || 0 }))

  const statusBadge = (s) => ({
    pending: <span className="badge badge-warning">Chờ</span>,
    active: <span className="badge badge-success">Đang diễn ra</span>,
    ended: <span className="badge badge-muted">Đã kết thúc</span>,
    finalized: <span className="badge badge-primary">Hoàn tất</span>,
  }[s] || <span className="badge badge-muted">{s}</span>)

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Tổng quan hệ thống bỏ phiếu phi tập trung</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard icon={Vote} label="Tổng Bầu Cử" value={stats?.totalElections} color="var(--primary)" subtitle={`${stats?.activeElections} đang diễn ra`} />
        <StatCard icon={Users} label="Cử Tri Đã Đăng Ký" value={stats?.totalVoters} color="var(--secondary)" />
        <StatCard icon={CheckCircle} label="Tổng Phiếu Bầu" value={stats?.totalVotes} color="var(--success)" />
        <StatCard icon={Activity} label="Người Dùng" value={stats?.totalUsers} color="var(--warning)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Thao Tác Nhanh</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Tạo Bầu Cử Mới', icon: Plus, path: '/admin/elections', color: 'var(--primary)' },
              { label: 'Quản Lý Cử Tri', icon: Users, path: '/admin/voters', color: 'var(--secondary)' },
              { label: 'Blockchain Explorer', icon: Blocks, path: '/blockchain', color: 'var(--success)' },
            ].map(({ label, icon: Icon, path, color }) => (
              <button key={path} className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                onClick={() => navigate(path)}>
                <Icon size={16} color={color} /> {label}
                <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} color="var(--primary)" />
            <h3>Phiếu Bầu Theo Cuộc Bầu Cử</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                <Bar dataKey="votes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Chưa có dữ liệu</p></div>
          )}
        </div>
      </div>

      {/* Recent Elections */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3>Bầu Cử Gần Đây</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/elections')}>Xem tất cả <ChevronRight size={13} /></button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tên</th><th>Trạng thái</th><th>Cử tri</th><th>Phiếu</th><th>Kết thúc</th></tr></thead>
            <tbody>
              {elections.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có bầu cử</td></tr>
              ) : elections.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/elections`)}>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td>{e.voter_count}</td>
                  <td>{e.vote_count}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(e.end_time * 1000).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="var(--secondary)" />
              <h3>Giao Dịch Hệ Thống Gần Đây</h3>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/blockchain')}>Xem tất cả</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Loại</th><th>Đối tượng</th><th>Chi tiết</th><th>Mã giao dịch (Tx)</th><th>Thời gian</th></tr></thead>
              <tbody>
                {activities.map((a, i) => {
                  if (!a) return null;
                  const txLink = a.tx_hash ? `https://sepolia.etherscan.io/tx/${a.tx_hash}` : '#';
                  const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleString('vi-VN') : '–';
                  
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`badge badge-${a.type === 'vote' ? 'success' : a.type === 'election' ? 'primary' : 'warning'}`}>
                          {a.type === 'vote' ? 'Bỏ phiếu' : a.type === 'election' ? 'Tạo bầu cử' : a.type === 'candidate' ? 'Thêm ứng viên' : a.type === 'finalize' ? 'Tổng kết' : 'Ủy quyền'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.name || '–'}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.details || '–'}</td>
                      <td>
                        {a.tx_hash ? (
                          <a href={txLink} target="_blank" rel="noreferrer" className="hash-display" style={{ color: 'var(--secondary)' }}>
                            {a.tx_hash.slice(0, 15)}...
                          </a>
                        ) : '–'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
