import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { userApi } from '../api/userApi'
import { useWeb3 } from '../context/Web3Context'
import toast from 'react-hot-toast'
import { UserPlus, Users, Trash2, Upload, CheckCircle, X } from 'lucide-react'

export default function ManageVoters() {
  const [elections, setElections] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [voters, setVoters] = useState([])
  const [wallet, setWallet] = useState('')
  const [batchText, setBatchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingVoters, setLoadingVoters] = useState(false)
  const { contract } = useWeb3()

  useEffect(() => {
    electionApi.getAll().then(r => setElections(r.data.elections || []))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingVoters(true)
    userApi.getElectionVoters(selectedId).then(r => setVoters(r.data.voters || [])).finally(() => setLoadingVoters(false))
  }, [selectedId])

  const handleAuthorize = async () => {
    if (!wallet) return toast.error('Nhập địa chỉ ví')
    if (!contract) return toast.error('Kết nối MetaMask trước')
    setLoading(true)
    try {
      const tx = await contract.authorizeVoter(BigInt(selectedId), wallet)
      toast.loading('Đang xử lý...', { id: 'auth' })
      const receipt = await tx.wait()
      await userApi.authorizeVoter(selectedId, { wallet_address: wallet, tx_hash: receipt.hash })
      toast.success('Đã cấp quyền bỏ phiếu!', { id: 'auth' })
      setWallet('')
      userApi.getElectionVoters(selectedId).then(r => setVoters(r.data.voters || []))
    } catch (err) {
      toast.error(err.reason || err.message || 'Lỗi', { id: 'auth' })
    } finally { setLoading(false) }
  }

  const handleBatchAuthorize = async () => {
    const addresses = batchText.split(/[\n,]/).map(a => a.trim()).filter(a => a.startsWith('0x') && a.length === 42)
    if (addresses.length === 0) return toast.error('Không tìm thấy địa chỉ hợp lệ')
    if (!contract) return toast.error('Kết nối MetaMask trước')
    setLoading(true)
    try {
      const tx = await contract.authorizeVotersBatch(BigInt(selectedId), addresses)
      toast.loading(`Đang authorize ${addresses.length} cử tri...`, { id: 'batch' })
      const receipt = await tx.wait()
      await userApi.authorizeVotersBatch(selectedId, { wallet_addresses: addresses, tx_hash: receipt.hash })
      toast.success(`Đã cấp quyền ${addresses.length} cử tri!`, { id: 'batch' })
      setBatchText('')
      userApi.getElectionVoters(selectedId).then(r => setVoters(r.data.voters || []))
    } catch (err) {
      toast.error(err.reason || err.message || 'Lỗi', { id: 'batch' })
    } finally { setLoading(false) }
  }

  const handleRevoke = async (voterWallet) => {
    if (!window.confirm('Thu hồi quyền bỏ phiếu?')) return
    try {
      await userApi.revokeVoter(selectedId, voterWallet)
      toast.success('Đã thu hồi quyền')
      setVoters(v => v.filter(x => x.wallet_address !== voterWallet))
    } catch { toast.error('Lỗi') }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Quản Lý Cử Tri</h1>
        <p className="page-subtitle">Cấp quyền bỏ phiếu cho các địa chỉ ví MetaMask</p>
      </div>

      {/* Select election */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label className="input-label">Chọn cuộc bầu cử</label>
          <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">-- Chọn bầu cử --</option>
            {elections.map(e => <option key={e.id} value={e.id}>{e.name} (ID: {e.id})</option>)}
          </select>
        </div>
      </div>

      {selectedId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Add single voter */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}><UserPlus size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Thêm Cử Tri</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input" placeholder="0x..." value={wallet} onChange={e => setWallet(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleAuthorize} disabled={loading || !wallet}>
                {loading ? <div className="spinner" /> : <CheckCircle size={15} />}
              </button>
            </div>

            <div className="divider" />

            {/* Batch */}
            <h3 style={{ marginBottom: 12 }}><Upload size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Thêm Hàng Loạt</h3>
            <textarea className="input" rows={5} placeholder={'0x1234...\n0x5678...\n(mỗi địa chỉ 1 dòng)'} value={batchText} onChange={e => setBatchText(e.target.value)} />
            <button className="btn btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={handleBatchAuthorize} disabled={loading || !batchText}>
              {loading ? <div className="spinner" /> : <Upload size={15} />} Authorize Tất Cả
            </button>
          </div>

          {/* Voter list */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3><Users size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Danh Sách Cử Tri</h3>
              <span className="badge badge-primary">{voters.length}</span>
            </div>
            {loadingVoters ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : voters.length === 0 ? (
              <div className="empty-state"><p>Chưa có cử tri</p></div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {voters.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-mono text-xs" style={{ color: 'var(--secondary)', marginBottom: 2 }}>
                        {v.wallet_address?.slice(0, 10)}...{v.wallet_address?.slice(-8)}
                      </div>
                      {v.username && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.username}</div>}
                    </div>
                    {v.has_voted ? (
                      <span className="badge badge-success"><CheckCircle size={10} /> Đã bầu</span>
                    ) : (
                      <span className="badge badge-muted">Chưa bầu</span>
                    )}
                    {!v.has_voted && (
                      <button className="btn btn-icon btn-danger" onClick={() => handleRevoke(v.wallet_address)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
