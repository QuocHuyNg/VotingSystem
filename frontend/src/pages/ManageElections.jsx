import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { useWeb3 } from '../context/Web3Context'
import toast from 'react-hot-toast'
import { Plus, Trash2, X, UserPlus, ChevronDown, ChevronUp, Loader, Clock } from 'lucide-react'

const STATUS_LABELS = { pending: 'Chờ', active: 'Đang diễn ra', ended: 'Kết thúc', finalized: 'Hoàn tất' }

function CreateElectionModal({ onClose, onCreated }) {
  const { contract, account } = useWeb3()
  const [form, setForm] = useState({ name: '', description: '', startDate: '', startTime: '09:00', endDate: '', endTime: '18:00' })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return toast.error('Vui lòng điền đầy đủ')
    if (!contract) {
      if (!account) return toast.error('Vui lòng kết nối MetaMask trước')
      return toast.error('Smart Contract chưa được Deploy hoặc file cấu hình bị lỗi. Vui lòng chạy lại script deploy.')
    }
    setLoading(true)
    try {
      const startTime = Math.floor(new Date(`${form.startDate}T${form.startTime}`).getTime() / 1000) - 120 // Trừ 2 phút để bầu được ngay
      const endTime = Math.floor(new Date(`${form.endDate}T${form.endTime}`).getTime() / 1000)
      if (endTime <= startTime) return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu')

      // Create on-chain
      const tx = await contract.createElection(form.name, form.description, BigInt(startTime), BigInt(endTime))
      toast.loading('Đang xử lý giao dịch...', { id: 'tx' })
      const receipt = await tx.wait()

      // Get electionId from event
      const event = receipt.logs.find(l => l.fragment?.name === 'ElectionCreated')
      const electionId = event ? Number(event.args[0]) : Date.now()

      // Save to backend
      await electionApi.create({ id: electionId, name: form.name, description: form.description, start_time: startTime, end_time: endTime, tx_hash: receipt.hash, contract_address: contract.target })
      toast.success('Tạo bầu cử thành công!', { id: 'tx' })
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.reason || err.message || 'Lỗi tạo bầu cử', { id: 'tx' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Tạo Bầu Cử Mới</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Tên bầu cử *</label>
            <input className="input" placeholder="VD: Bầu cử Hội đồng sinh viên 2025" value={form.name} onChange={set('name')} />
          </div>
          <div className="input-group">
            <label className="input-label">Mô tả</label>
            <textarea className="input" placeholder="Mô tả chi tiết về cuộc bầu cử..." value={form.description} onChange={set('description')} />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Ngày bắt đầu *</label>
              <input className="input" type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div className="input-group">
              <label className="input-label">Giờ bắt đầu</label>
              <input className="input" type="time" value={form.startTime} onChange={set('startTime')} />
            </div>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Ngày kết thúc *</label>
              <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
            </div>
            <div className="input-group">
              <label className="input-label">Giờ kết thúc</label>
              <input className="input" type="time" value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><div className="spinner" />Đang tạo...</> : <><Plus size={16} />Tạo Bầu Cử</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddCandidateModal({ election, onClose, onAdded }) {
  const { contract, account } = useWeb3()
  const [form, setForm] = useState({ name: '', description: '' })
  const [candidates, setCandidates] = useState(election.candidates || [])
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name) return toast.error('Nhập tên ứng viên')
    if (!contract) return toast.error('Vui lòng kết nối MetaMask')
    setLoading(true)
    try {
      const tx = await contract.addCandidate(BigInt(election.id), form.name, form.description)
      toast.loading('Đang thêm ứng viên...', { id: 'cand' })
      const receipt = await tx.wait()
      const event = receipt.logs.find(l => l.fragment?.name === 'CandidateAdded')
      const onChainId = event ? Number(event.args[1]) : candidates.length + 1
      await electionApi.addCandidate(election.id, { on_chain_id: onChainId, name: form.name, description: form.description, tx_hash: receipt.hash })
      toast.success('Thêm ứng viên thành công!', { id: 'cand' })
      setCandidates(prev => [...prev, { name: form.name, description: form.description, on_chain_id: onChainId }])
      setForm({ name: '', description: '' })
      onAdded()
    } catch (err) {
      toast.error(err.reason || err.message || 'Lỗi', { id: 'cand' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ứng Viên — {election.name}</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ marginBottom: 20 }}>
          {candidates.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}><p>Chưa có ứng viên</p></div>
          ) : candidates.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                {c.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.description}</div>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">Tên ứng viên</label>
            <input className="input" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Mô tả</label>
            <input className="input" placeholder="Giới thiệu ngắn..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <div className="spinner" /> : <UserPlus size={15} />} Thêm Ứng Viên
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ManageElections() {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [candidateModal, setCandidateModal] = useState(null)
  const [filter, setFilter] = useState('all')
  const { contract } = useWeb3()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    electionApi.getAll().then(r => setElections(r.data.elections || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (e) => {
    if (!window.confirm(`Xóa bầu cử "${e.name}"?`)) return
    try {
      await electionApi.delete(e.id)
      toast.success('Đã xóa')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa') }
  }

  const handleFinalize = async (e) => {
    if (!contract) return toast.error('Kết nối MetaMask trước')
    try {
      const tx = await contract.finalizeElection(BigInt(e.id))
      toast.loading('Đang finalize...', { id: 'fin' })
      const receipt = await tx.wait()
      await electionApi.updateStatus(e.id, { status: 'finalized', finalize_tx_hash: receipt.hash })
      toast.success('Đã hoàn tất bầu cử!', { id: 'fin' })
      load()
    } catch (err) { toast.error(err.reason || 'Lỗi', { id: 'fin' }) }
  }

  const filtered = filter === 'all' ? elections : elections.filter(e => e.status === filter)
  const statusBadge = (s) => ({ pending: 'badge-warning', active: 'badge-success', ended: 'badge-muted', finalized: 'badge-primary' }[s] || 'badge-muted')

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Quản Lý Bầu Cử</h1>
          <p className="page-subtitle">Tạo, quản lý và theo dõi các cuộc bầu cử</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Tạo Bầu Cử
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all', 'Tất cả'], ['pending', 'Chờ'], ['active', 'Đang diễn ra'], ['ended', 'Kết thúc'], ['finalized', 'Hoàn tất']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <p style={{ marginBottom: 16 }}>Không có bầu cử nào</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Tạo Bầu Cử Đầu Tiên</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(e => (
            <div key={e.id} className="card" style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s' }} 
              onClick={() => navigate(`/admin/elections/${e.id}`)}
              onMouseEnter={el => el.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={el => el.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3>{e.name}</h3>
                    <span className={`badge ${statusBadge(e.status)}`}>{STATUS_LABELS[e.status]}</span>
                    <span className="badge badge-muted" style={{ fontFamily: 'monospace' }}>ID: {e.id}</span>
                  </div>
                  {e.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 10 }}>{e.description}</p>}
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{new Date(e.start_time * 1000).toLocaleString('vi-VN')} → {new Date(e.end_time * 1000).toLocaleString('vi-VN')}</span>
                    <span>🗳 {e.candidate_count} ứng viên</span>
                    <span>👥 {e.voter_count} cử tri</span>
                    <span>✅ {e.vote_count} phiếu</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => setCandidateModal(e)}>
                    <UserPlus size={13} /> Ứng Viên
                  </button>
                  {(e.status === 'active' || e.status === 'ended') && (
                    <button className="btn btn-sm btn-success" onClick={() => handleFinalize(e)}>Finalize</button>
                  )}
                  {e.status === 'pending' && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateElectionModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {candidateModal && <AddCandidateModal election={candidateModal} onClose={() => setCandidateModal(null)} onAdded={load} />}
    </Layout>
  )
}
