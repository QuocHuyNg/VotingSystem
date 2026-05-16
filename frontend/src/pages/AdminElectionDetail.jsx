import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { userApi } from '../api/userApi'
import { useWeb3 } from '../context/Web3Context'
import toast from 'react-hot-toast'
import { 
  Plus, Users, CheckCircle, Clock, ArrowLeft, 
  Trash2, Upload, ExternalLink, Activity, Info, Trophy
} from 'lucide-react'

const STATUS_LABELS = { pending: 'Sắp diễn ra', active: 'Đang diễn ra', ended: 'Đã kết thúc', finalized: 'Đã hoàn tất' }
const STATUS_COLORS = { pending: 'var(--warning)', active: 'var(--success)', ended: 'var(--text-muted)', finalized: 'var(--primary)' }

export default function AdminElectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contract, account, connectWallet } = useWeb3()
  
  const [election, setElection] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [voters, setVoters] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Forms
  const [newCandidate, setNewCandidate] = useState({ name: '', description: '' })
  const [newVoter, setNewVoter] = useState('')
  const [batchVoters, setBatchVoters] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Results
  const [results, setResults] = useState([])
  const [winner, setWinner] = useState(null)

  const loadData = async () => {
    try {
      const [elRes, vtRes] = await Promise.all([
        electionApi.getById(id),
        userApi.getElectionVoters(id)
      ])
      const el = elRes.data.election
      setElection(el)
      setCandidates(elRes.data.candidates || [])
      setVoters(vtRes.data.voters || [])

      // If finalized/ended, fetch results from contract
      if (contract && (el.status === 'finalized' || el.status === 'ended')) {
        try {
          const [names, , voteCounts] = await contract.getResults(BigInt(id))
          const data = names.map((name, i) => ({
            name,
            votes: Number(voteCounts[i]),
          }))
          setResults(data)
          if (data.length > 0) {
            const win = data.reduce((a, b) => a.votes > b.votes ? a : b)
            if (win.votes > 0) setWinner(win)
          }
        } catch (e) { console.error("Error fetching on-chain results:", e) }
      }
    } catch (err) {
      toast.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const handleAddCandidate = async (e) => {
    e.preventDefault()
    if (!newCandidate.name) return toast.error('Nhập tên ứng viên')
    if (!contract) return toast.error('Kết nối MetaMask trước')
    setSubmitting(true)
    try {
      const tx = await contract.addCandidate(BigInt(id), newCandidate.name, newCandidate.description)
      toast.loading('Đang ghi nhận lên blockchain...', { id: 'cand' })
      const receipt = await tx.wait()
      const event = receipt.logs.find(l => l.fragment?.name === 'CandidateAdded')
      const onChainId = event ? Number(event.args[1]) : candidates.length + 1
      
      await electionApi.addCandidate(id, { 
        on_chain_id: onChainId, 
        name: newCandidate.name, 
        description: newCandidate.description,
        tx_hash: receipt.hash
      })
      
      toast.success('Đã thêm ứng viên!', { id: 'cand' })
      setNewCandidate({ name: '', description: '' })
      loadData()
    } catch (err) {
      toast.error(err.reason || err.message || 'Lỗi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinalize = async () => {
    if (!window.confirm('Xác nhận kết thúc và tổng kết bầu cử?')) return
    if (!contract) return toast.error('Kết nối MetaMask')
    setSubmitting(true)
    try {
      const tx = await contract.finalizeElection(BigInt(id))
      toast.loading('Đang tổng kết...', { id: 'fin' })
      const receipt = await tx.wait()
      await electionApi.updateStatus(id, { status: 'finalized', finalize_tx_hash: receipt.hash })
      toast.success('Bầu cử đã kết thúc!', { id: 'fin' })
      loadData()
    } catch (err) {
      toast.error(err.reason || 'Lỗi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate('/admin/elections')}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{election?.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span className="badge" style={{ background: STATUS_COLORS[election?.status], color: '#fff' }}>{STATUS_LABELS[election?.status]}</span>
              <span className="text-muted text-sm">ID: {election?.id}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(election?.status === 'active' || election?.status === 'ended') && (
              <button className="btn btn-success" onClick={handleFinalize} disabled={submitting}>Tổng Kết (Finalize)</button>
            )}
            <a className="btn btn-secondary" href={`https://sepolia.etherscan.io/tx/${election?.tx_hash}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> View Tx
            </a>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Info Card */}
            <div className="card">
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={18} color="var(--primary)" /> Thông tin</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{election?.description || 'Không có mô tả.'}</p>
              <div className="grid-2">
                <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bắt đầu</div>
                  <div style={{ fontWeight: 600 }}>{new Date(election?.start_time * 1000).toLocaleString('vi-VN')}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kết thúc</div>
                  <div style={{ fontWeight: 600 }}>{new Date(election?.end_time * 1000).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            </div>

            {/* Candidates */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3>Ứng Viên ({candidates.length})</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {candidates.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>Chưa có ứng viên nào</div>
                ) : candidates.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-muted">ID: {c.on_chain_id}</span>
                      {results.length > 0 && (
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                          {results.find(r => r.name === c.name)?.votes || 0} phiếu
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {(election?.status === 'active' || election?.status === 'pending') && voters.filter(v => v.has_voted).length === 0 && (
                <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <div className="input-group">
                    <label className="input-label">Thêm ứng viên mới</label>
                    <input className="input" placeholder="Tên ứng viên" value={newCandidate.name} onChange={e => setNewCandidate(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <input className="input" placeholder="Mô tả ngắn" value={newCandidate.description} onChange={e => setNewCandidate(p => ({ ...p, description: e.target.value }))} />
                  <button type="submit" className="btn btn-primary" disabled={submitting}><Plus size={15} /> Thêm</button>
                </form>
              )}
            </div>

            {/* Winner Section */}
            {winner && (
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,217,192,0.05))', borderColor: 'var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,165,2,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={32} color="var(--warning)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Người chiến thắng</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{winner.name}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>{winner.votes} phiếu bầu</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats Card */}
            <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{election?.voter_count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Lượt Bầu</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{voters.filter(v => v.has_voted).length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giao Dịch Ghi Nhận</div>
              </div>
            </div>

            {/* Voter Activity (Read-only) */}
            <div className="card">
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} color="var(--secondary)" /> Cử Tri Đã Bầu</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {voters.length === 0 ? (
                    <div className="empty-state">Chưa có ai bầu</div>
                  ) : voters.map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-mono text-xs truncate" style={{ color: 'var(--text)' }}>{v.wallet_address}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(v.voted_at).toLocaleString('vi-VN')}</div>
                      </div>
                      <span className="badge badge-success">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
