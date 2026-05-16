import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { useWeb3 } from '../context/Web3Context'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import { Trophy, RefreshCw, ArrowLeft } from 'lucide-react'

const COLORS = ['#6C63FF', '#00D9C0', '#FFA502', '#FF4757', '#2ED573', '#A29BFE', '#00B894']

export default function ResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contract } = useWeb3()
  const [election, setElection] = useState(null)
  const [results, setResults] = useState([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchResults = useCallback(async () => {
    try {
      const r = await electionApi.getById(id)
      setElection(r.data.election)
      const candidatesMeta = r.data.candidates || []

      if (contract) {
        const [names, , voteCounts] = await contract.getResults(BigInt(id))
        const data = names.map((name, i) => ({
          name,
          votes: Number(voteCounts[i]),
          description: candidatesMeta[i]?.description || '',
        }))
        const total = data.reduce((s, d) => s + d.votes, 0)
        setResults(data)
        setTotalVotes(total)
      } else {
        // Fallback: use backend data
        const data = candidatesMeta.map(c => ({ name: c.name, votes: 0, description: c.description }))
        setResults(data)
        setTotalVotes(r.data.voteCount || 0)
      }
      setLastUpdate(new Date())
    } catch {} finally { setLoading(false) }
  }, [id, contract])

  useEffect(() => {
    fetchResults()
    const interval = setInterval(fetchResults, 15000)
    return () => clearInterval(interval)
  }, [fetchResults])

  const winner = results.length > 0 ? results.reduce((a, b) => a.votes > b.votes ? a : b) : null
  const chartData = results.map(r => ({ ...r, pct: totalVotes > 0 ? ((r.votes / totalVotes) * 100).toFixed(1) : '0' }))

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontWeight: 600 }}>{payload[0].payload.name}</div>
        <div style={{ color: 'var(--primary)' }}>{payload[0].value} phiếu</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{payload[0].payload.pct}%</div>
      </div>
    )
  }

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{election?.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tổng phiếu: <strong>{totalVotes}</strong> · Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchResults}><RefreshCw size={14} /> Làm mới</button>
        </div>

        {/* Winner Banner */}
        {winner && totalVotes > 0 && (election?.status === 'ended' || election?.status === 'finalized') && (
          <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,217,192,0.08))', borderColor: 'var(--primary)', textAlign: 'center', padding: '28px' }}>
            <Trophy size={40} color="var(--warning)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 4 }}>Người chiến thắng</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {winner.name}
            </div>
            <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>{winner.votes} phiếu ({totalVotes > 0 ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0}%)</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Bar Chart */}
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Số Phiếu Bầu</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Tỷ Lệ Phiếu</h3>
            {totalVotes === 0 ? (
              <div className="empty-state"><p>Chưa có phiếu bầu</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} dataKey="votes" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, pct }) => `${name}: ${pct}%`} labelLine={false}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} phiếu`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Bảng Xếp Hạng</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Ứng Viên</th><th>Số Phiếu</th><th>Tỷ Lệ</th><th>Thanh tiến trình</th></tr></thead>
              <tbody>
                {chartData.sort((a, b) => b.votes - a.votes).map((c, i) => (
                  <tr key={c.name}>
                    <td>
                      <span style={{ fontWeight: 700, color: i === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {i === 0 && totalVotes > 0 ? '🏆' : `#${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.description}</div>}
                    </td>
                    <td style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{c.votes}</td>
                    <td style={{ fontWeight: 600 }}>{c.pct}%</td>
                    <td style={{ width: '200px' }}>
                      <div style={{ background: 'var(--surface-2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${c.pct}%`, height: '100%', background: COLORS[i % COLORS.length], transition: 'width 0.5s ease', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
